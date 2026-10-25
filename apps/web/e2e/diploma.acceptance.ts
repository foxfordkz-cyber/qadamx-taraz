import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { navigateSeller } from "./helpers";

const api = "http://127.0.0.1:8316";
const apiDir = fileURLToPath(new URL("../../api", import.meta.url));
const evidence = fileURLToPath(
  new URL(
    "../../../docs/diploma-evidence/integration/screenshots",
    import.meta.url,
  ),
);
function sql() {
  return JSON.parse(
    execFileSync(
      `${apiDir}/.venv/${process.platform === "win32" ? "Scripts/python.exe" : "bin/python"}`,
      ["tests/diploma_browser_server.py", "--verify"],
      {
        cwd: apiDir,
        env: { ...process.env, PYTHONPATH: "." },
        encoding: "utf8",
      },
    ),
  );
}
async function login(page: Page, owner = "a") {
  await page.goto("/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill(`${owner}@research.example.test`);
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-local-only");
  const tokenResponse = page.waitForResponse(
    `${api}/auth/v1/token?grant_type=password`,
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const token = (await (await tokenResponse).json()).access_token as string;
  await expect(page.locator(".app-shell")).toBeVisible();
  return token; // Ephemeral local issuer; never print/store token or browser auth state.
}
async function saved(page: Page) {
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("complete seller workflow uses real SQL and explicit offline AI boundaries", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`)).json();
  const token = await login(page);
  const headers = { Authorization: `Bearer ${token}` };
  await page.getByLabel("Торговая точка").selectOption(info.empty);
  expect(sql()).toMatchObject({ sales: 0, receipts: 0, debt: 0, feedback: 0 });

  await navigateSeller(page, "customers");
  await page.getByRole("button", { name: /Новый клиент/ }).click();
  const form = page.getByRole("dialog", { name: "Новый клиент" });
  await form.getByLabel("Имя", { exact: true }).fill("QA Stage6 клиент");
  await form
    .getByLabel("Заметка", { exact: true })
    .fill("Синтетическая запись дипломной проверки");
  const creation = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().endsWith("/customers"),
  );
  await form
    .getByRole("button", { name: "Создать клиента", exact: true })
    .click();
  const created = await (await creation).json();
  await expect(form).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "QA Stage6 клиент", exact: true }),
  ).toBeVisible();

  await navigateSeller(page, "sale");
  await page
    .getByRole("button", { name: "Заполнить вручную", exact: true })
    .click();
  await page
    .getByLabel("Описание", { exact: true })
    .fill("QA Stage6 ручная продажа");
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("3000");
  await page.getByLabel("Получено, ₸", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Выбрать клиента", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /QA Stage6 клиент/ })
    .click();
  const saleResponse = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().endsWith("/operations"),
  );
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click({ clickCount: 2 });
  const saleHttp = await saleResponse;
  const sale = await saleHttp.json();
  await saved(page);
  expect(sale.sale_balance_minor).toBe(200000);
  expect(sql()).toMatchObject({
    sales: 300000,
    receipts: 100000,
    debt: 200000,
  });
  expect(sql().operations).toHaveLength(1);
  const replay = await request.post(saleHttp.url(), {
    headers: {
      ...headers,
      "Idempotency-Key": saleHttp.request().headers()["idempotency-key"],
    },
    data: saleHttp.request().postDataJSON(),
  });
  expect((await replay.json()).operation.id).toBe(sale.operation.id);
  expect(sql().operations).toHaveLength(1);

  await navigateSeller(page, "debts");
  await expect(page.locator(".debt-total")).toContainText("2 000 ₸");
  await page.getByRole("link", { name: "Принять оплату", exact: true }).click();
  await page.getByLabel("Доплата, ₸", { exact: true }).fill("500");
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click();
  await saved(page);
  expect(sql()).toMatchObject({
    sales: 300000,
    receipts: 150000,
    debt: 150000,
  });

  await navigateSeller(page, "history");
  await expect(page.locator(".history-row")).toHaveCount(2);
  await page
    .locator(".history-row")
    .first()
    .getByRole("button", { name: "Исправить запись", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".history-row")).toHaveCount(3);
  expect(sql()).toMatchObject({
    sales: 300000,
    receipts: 100000,
    debt: 200000,
  });
  expect(sql().operations.map((o: { kind: string }) => o.kind)).toEqual([
    "sale",
    "repayment",
    "reversal",
  ]);

  await navigateSeller(page, "sale");
  await page
    .getByLabel("Текст для AI", { exact: true })
    .fill("Продажа 1200, оплатили сразу полностью");
  await page
    .getByRole("button", { name: "Подготовить черновик", exact: true })
    .click();
  await expect(
    page.getByLabel("Сумма продажи, ₸", { exact: true }),
  ).toHaveValue("1200");
  await expect(page.getByLabel("Получено, ₸", { exact: true })).toHaveValue(
    "1200",
  );
  expect(sql().operations).toHaveLength(3); // Draft alone never writes money.
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click();
  await saved(page);
  expect(sql()).toMatchObject({
    sales: 420000,
    receipts: 220000,
    debt: 200000,
  });

  await navigateSeller(page, "analytics");
  await expect(
    page.locator(".analytics-period-summary .assistant-source"),
  ).toHaveText("По данным сервера");
  await page
    .getByRole("button", { name: "Спросить Qadam", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator(".assistant-suggestions button").first().click();
  await expect(dialog.locator(".assistant-result")).toContainText("2 000 ₸");
  await expect(dialog.locator(".assistant-reminder")).toContainText(
    "QA Stage6 клиент",
  );
  expect(sql().operations).toHaveLength(4);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: `${evidence}/assistant-sql-ru-1280.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");

  await navigateSeller(page, "research");
  await expect(page.locator("#forecast")).toContainText(
    "Прогноз пока недоступен",
  );
  await expect(page.locator("#risk")).toContainText("2 000 ₸");
  await page
    .getByRole("link", { name: "Проверить открытые продажи", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`customer_id=${created.id}`));
  await expect(page.locator(".debt-total")).toContainText("2 000 ₸");
  await expect(page.locator(".seller-secondary-nav")).not.toHaveAttribute(
    "open",
  );
  await navigateSeller(page, "research");
  const feedback = "Synthetic Stage6 workflow — not a participant response";
  await page.getByLabel(/Что улучшить первым/).fill(feedback);
  await page.getByLabel(/Согласен на описанную/).check();
  await page
    .getByRole("button", { name: "Отправить отзыв", exact: true })
    .click();
  await expect(page.getByText(/Ответ сохранён сервером/)).toBeVisible();
  expect(sql().feedback).toBe(1);
  await page.reload();
  await expect(page.getByLabel("Торговая точка")).toHaveValue(info.empty);
  await page.getByText("Мои сохранённые ответы", { exact: true }).click();
  await page
    .getByRole("button", { name: "Загрузить мои ответы", exact: true })
    .click();
  await expect(page.locator("#feedback li")).toContainText(feedback);
  await page.screenshot({
    path: `${evidence}/feedback-sql-ru-1280.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(page, "b");
  await expect(page.getByLabel("Торговая точка")).not.toHaveValue(info.empty);
  await navigateSeller(page, "research");
  await expect(page.getByText(feedback, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await writeFile(
    `${evidence}/../workflow-sql.json`,
    JSON.stringify(sql(), null, 2) + "\n",
  );
});

test("structured assistant uses current SQL facts, RU/KZ and fallback without financial writes", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`)).json();
  const token = await login(page);
  const headers = { Authorization: `Bearer ${token}` };
  const before = sql();
  for (const locale of ["ru", "kk"]) {
    const response = await request.post(
      `${api}/api/v1/businesses/${info.business}/assistant`,
      {
        headers,
        data: { question: "Кто должен?", days: 30, locale, ai: true },
      },
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("ai"); // Offline double; actual Stage 1 binds/render values.
    expect(body.answer).toContain("400 ₸");
    expect(
      body.actions.find((a: { kind: string }) => a.kind === "reminder_draft")
        .customer_id,
    ).toBe(info.customer);
    for (const question of ["QA malformed", "QA unknown metric"]) {
      const failed = await request.post(
        `${api}/api/v1/businesses/${info.business}/assistant`,
        { headers, data: { question, locale, ai: true } },
      );
      expect((await failed.json()).source).toBe("fallback");
    }
  }
  const counts = await (await request.get(`${api}/__qa/integration`)).json();
  const facts = await request.post(
    `${api}/api/v1/businesses/${info.business}/assistant`,
    { headers, data: { question: "Итог", ai: false } },
  );
  expect((await facts.json()).source).toBe("facts");
  expect(
    (await (await request.get(`${api}/__qa/integration`)).json()).assistant,
  ).toBe(counts.assistant);
  const foreign = await request.post(
    `${api}/api/v1/businesses/${info.other}/assistant`,
    { headers, data: { question: "Чужая точка", ai: true } },
  );
  expect(foreign.status()).toBe(404);
  expect(
    (await (await request.get(`${api}/__qa/integration`)).json()).assistant,
  ).toBe(counts.assistant);
  expect(sql()).toEqual(before);
});

test("combined SQL research remains readable on mobile and desktop in RU/KZ", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`)).json();
  await login(page);
  await page.getByLabel("Торговая точка").selectOption(info.business);
  await navigateSeller(page, "research");
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const locale of ["ru", "kk"]) {
      await page
        .getByRole("button", {
          name: locale === "ru" ? "RU" : "KZ",
          exact: true,
        })
        .click();
      for (const days of ["7", "30"]) {
        await page
          .getByLabel(locale === "ru" ? "Горизонт прогноза" : "Болжам мерзімі")
          .selectOption(days);
        await expect(page.locator(".research-chart")).toBeVisible();
        await expect(page.locator("#forecast table").first()).toContainText(
          "MAE",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
      await page.screenshot({
        path: `${evidence}/research-sql-${locale}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
