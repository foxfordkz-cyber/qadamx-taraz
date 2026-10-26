import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { navigateSeller } from "./helpers";

const api = process.env.QADAM_QA_API_ORIGIN!;
const evidence = process.env.QADAM_QA_EVIDENCE_DIR!;
const apiDir = fileURLToPath(new URL("../../api", import.meta.url));
function sql() {
  return JSON.parse(
    execFileSync(
      apiDir +
        "/.venv/" +
        (process.platform === "win32" ? "Scripts/python.exe" : "bin/python"),
      ["tests/final_browser_server.py", "--verify"],
      {
        cwd: apiDir,
        env: { ...process.env, PYTHONPATH: "." },
        encoding: "utf8",
      },
    ),
  );
}
async function login(page: Page, business: string) {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto("/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("a@research.example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-local-only");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.getByLabel("Торговая точка").selectOption(business);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
});

test("lost financial response: SQL commits once and explicit retry reuses exact key and body", async ({
  page,
  request,
}) => {
  const info = await (await request.get(api + "/__qa/info")).json();
  await login(page, info.empty);
  await navigateSeller(page, "sale");
  await page
    .getByRole("button", { name: "Заполнить вручную", exact: true })
    .click();
  await page
    .getByLabel("Описание", { exact: true })
    .fill("Synthetic Stage10 response loss");
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("3400");
  await page.getByLabel("Получено, ₸", { exact: true }).fill("3400");
  const before = sql();
  const attempts: { key: string; body: string | null; operation: string }[] =
    [];
  await page.route("**/operations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const body = await response.json();
    attempts.push({
      key: route.request().headers()["idempotency-key"],
      body: route.request().postData(),
      operation: body.operation.id,
    });
    if (attempts.length === 1)
      await route.abort("failed"); // SQL committed, response intentionally lost.
    else await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click({ clickCount: 2 });
  await expect(page.getByText(/Результат неизвестен/)).toBeVisible();
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toHaveCount(0);
  await expect.poll(() => attempts.length).toBe(1);
  expect(sql().operations.length).toBe(before.operations.length + 1);
  await page.screenshot({
    path: evidence + "/lost-response-unknown.png",
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Проверить результат тем же запросом",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  const after = sql();
  expect(after.operations.length).toBe(before.operations.length + 1);
  expect(after.sales - before.sales).toBe(340000);
  expect(after.receipts - before.receipts).toBe(340000);
  expect(after.debt).toBe(before.debt);
  const expectedKpis = [after.sales, after.receipts, after.debt].map(
    (minor) => new Intl.NumberFormat("ru-KZ").format(minor / 100) + " ₸",
  );
  await navigateSeller(page, "");
  await expect(page.locator(".cabinet-metrics dd")).toHaveText(expectedKpis);
  await page.screenshot({
    path: evidence + "/dashboard-sql-after-retry.png",
    fullPage: true,
  });
  await navigateSeller(page, "analytics");
  await expect(
    page.locator(".analytics-main-kpis .analytics-kpi-value"),
  ).toHaveText(expectedKpis);
  await page.screenshot({
    path: evidence + "/analytics-sql-after-retry.png",
    fullPage: true,
  });
  await writeFile(
    evidence + "/../response-loss-sql.json",
    JSON.stringify(
      {
        source: "Synthetic local SQL, actual browser request loss",
        attempts,
        before,
        after,
      },
      null,
      2,
    ) + "\n",
  );
});

test("lost customer response resolves through real request lookup without a duplicate POST", async ({
  page,
  request,
}) => {
  const info = await (await request.get(api + "/__qa/info")).json();
  await login(page, info.empty);
  await navigateSeller(page, "customers");
  const before = sql();
  let posts = 0,
    lookups = 0;
  page.on("request", (r) => {
    if (r.url().includes("/customer-creation-result")) lookups++;
  });
  await page.route("**/customers", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort("failed");
  });
  await page.getByRole("button", { name: /Новый клиент/ }).click();
  const form = page.getByRole("dialog", { name: "Новый клиент" });
  await form
    .getByLabel("Имя", { exact: true })
    .fill("Synthetic Stage10 recovery");
  await form
    .getByRole("button", { name: "Создать клиента", exact: true })
    .click();
  await expect(form).not.toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic Stage10 recovery",
      exact: true,
    }),
  ).toBeVisible();
  expect(posts).toBe(1);
  expect(lookups).toBeGreaterThan(0);
  expect(sql().customers).toBe(before.customers + 1);
  expect(sql().all_business_ledger_sha256).toBe(
    before.all_business_ledger_sha256,
  );
  await writeFile(
    evidence + "/../customer-recovery-sql.json",
    JSON.stringify(
      {
        source: "Synthetic local SQL",
        posts,
        lookups,
        added_customers: 1,
        ledger_unchanged: true,
      },
      null,
      2,
    ) + "\n",
  );
});

test("Research renders loading error retry 7/30 success and empty-business state with SQL unchanged", async ({
  page,
  request,
}) => {
  const info = await (await request.get(api + "/__qa/info")).json();
  await login(page, info.business);
  const before = sql().all_business_ledger_sha256;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route("**/research/forecast?*", async (route) => {
    calls++;
    if (calls === 1) {
      await held;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "UNAVAILABLE",
            message: "Synthetic transport failure",
          },
        }),
      });
    } else await route.continue();
  });
  await navigateSeller(page, "research");
  await expect(page.locator("#forecast .spinner")).toBeVisible();
  await page.screenshot({
    path: evidence + "/research-loading.png",
    fullPage: true,
  });
  release();
  await expect(
    page
      .locator("#forecast")
      .getByRole("button", { name: "Повторить", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: evidence + "/research-error.png",
    fullPage: true,
  });
  await page
    .locator("#forecast")
    .getByRole("button", { name: "Повторить", exact: true })
    .click();
  await expect(page.locator(".research-chart")).toBeVisible();
  const snapshots = [];
  for (const horizon of [7, 30]) {
    if (horizon === 30) {
      const response = page.waitForResponse((r) =>
        r.url().includes("/research/forecast?horizon=30"),
      );
      await page
        .getByLabel("Горизонт прогноза", { exact: true })
        .selectOption("30");
      snapshots.push(await (await response).json());
    }
    await expect(page.locator(".research-chart")).toBeVisible();
    await page.screenshot({
      path: evidence + "/research-" + horizon + "-days.png",
      fullPage: true,
    });
  }
  expect(snapshots[0].forecast).toHaveLength(30);
  expect(snapshots[0].evaluation).not.toBeNull();
  await page.getByLabel("Торговая точка").selectOption(info.empty);
  await expect(page.locator("#forecast")).toContainText(
    "Прогноз пока недоступен",
  );
  await expect(page.locator(".research-chart")).toHaveCount(0);
  expect(sql().all_business_ledger_sha256).toBe(before);
  await writeFile(
    evidence + "/../research-30-response.json",
    JSON.stringify(snapshots[0], null, 2) + "\n",
  );
});

for (const width of [360, 390, 768, 1440])
  for (const locale of ["ru", "kk"]) {
    test(
      "candidate layouts " +
        locale +
        " " +
        width +
        "px and keyboard/font stress",
      async ({ page, request }) => {
        await page.setViewportSize({ width, height: 960 });
        const info = await (await request.get(api + "/__qa/info")).json();
        await login(page, info.business);
        const before = sql().all_business_ledger_sha256;
        await page
          .getByRole("button", {
            name: locale === "ru" ? "RU" : "KZ",
            exact: true,
          })
          .click();
        for (const route of ["", "analytics", "sale", "research"]) {
          await navigateSeller(page, route);
          if (route === "research")
            await expect(page.locator(".research-chart")).toBeVisible();
          if (route === "analytics")
            await expect(
              page.locator(".analytics-period-summary"),
            ).toBeVisible();
          await noOverflow(page);
          await page.screenshot({
            path:
              evidence +
              "/final-" +
              (route || "dashboard") +
              "-" +
              locale +
              "-" +
              width +
              ".png",
            fullPage: true,
          });
        }
        // A real CSS font-size stress probe, not native Chrome zoom or a physical device.
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        expect(
          await page.evaluate(() =>
            parseFloat(getComputedStyle(document.documentElement).fontSize),
          ),
        ).toBeGreaterThanOrEqual(32);
        await noOverflow(page);
        const select = page.locator("#forecast select");
        await select.focus();
        await expect(select).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await expect(select).toHaveValue("30");
        await page.screenshot({
          path: evidence + "/font200-" + locale + "-" + width + ".png",
          fullPage: true,
        });
        expect(sql().all_business_ledger_sha256).toBe(before);
      },
    );
  }
