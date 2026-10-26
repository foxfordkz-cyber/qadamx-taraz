import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { navigateSeller } from "./helpers";

const api = process.env.QADAM_QA_API_ORIGIN ?? "http://127.0.0.1:8317";
// Control GETs do not reuse an idle keep-alive socket across SQL probes.
const control = { headers: { Connection: "close" } };
const apiDir = fileURLToPath(new URL("../../api", import.meta.url));
const evidence =
  process.env.QADAM_QA_EVIDENCE_DIR ??
  fileURLToPath(
    new URL(
      "../../../docs/diploma-evidence/ai-extraction/screenshots",
      import.meta.url,
    ),
  );
function sql() {
  return JSON.parse(
    execFileSync(
      `${apiDir}/.venv/${process.platform === "win32" ? "Scripts/python.exe" : "bin/python"}`,
      ["tests/extraction_browser_server.py", "--verify"],
      {
        cwd: apiDir,
        env: { ...process.env, PYTHONPATH: "." },
        encoding: "utf8",
      },
    ),
  );
}
async function start(page: Page, business: string) {
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
  await navigateSeller(page, "sale");
}
async function draft(page: Page, text: string) {
  await page.getByLabel("Текст для AI", { exact: true }).fill(text);
  await page
    .getByRole("button", { name: "Подготовить черновик", exact: true })
    .click();
}
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
});

test("Kazakh partial payment overrides faulty paid label; only confirmation writes SQL", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`, control)).json();
  await start(page, info.empty);
  const before = sql();
  await draft(page, "Асқарға үш мың теңгеге тауар бердім, мыңын төледі");
  await expect(
    page.getByLabel("Сумма продажи, ₸", { exact: true }),
  ).toHaveValue("3000");
  await expect(page.getByLabel("Получено, ₸", { exact: true })).toHaveValue(
    "1000",
  );
  expect(sql().all_business_ledger_sha256).toBe(
    before.all_business_ledger_sha256,
  );
  await page
    .getByRole("button", { name: "Выбрать клиента", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Асқар / })
    .click();
  await page.screenshot({
    path: `${evidence}/grounded-kazakh-1280.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click({ clickCount: 2 });
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  const after = sql();
  expect(after.operations.length - before.operations.length).toBe(1);
  expect(after.sales - before.sales).toBe(300000);
  expect(after.receipts - before.receipts).toBe(100000);
  expect(after.debt - before.debt).toBe(200000);
  await writeFile(
    `${evidence}/sql-confirmation.json`,
    JSON.stringify(
      {
        source:
          "Synthetic local PostgreSQL; frozen OFFLINE provider; explicit UI confirmation",
        operation_delta: 1,
        sales_delta_minor: 300000,
        receipts_delta_minor: 100000,
        debt_delta_minor: 200000,
        duplicate_click_created_duplicate: false,
      },
      null,
      2,
    ) + "\n",
  );
});

test("unknown mixed-language payment stays empty with clarification on mobile KZ", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`, control)).json();
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page, info.empty);
  const before = sql();
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await page
    .getByLabel("AI үшін мәтін", { exact: true })
    .fill("Ерланға екі мың теңгеге сатым, остальное потом");
  await page
    .getByRole("button", { name: "Жазбаны дайындау", exact: true })
    .click();
  await expect(
    page.getByLabel("Сатылым сомасы, ₸", { exact: true }),
  ).toHaveValue("2000");
  await expect(page.getByLabel("Алынған ақша, ₸", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByText("Қазір қанша төленді?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "RU", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${evidence}/unknown-payment-kk-390.png`,
    fullPage: true,
  });
  expect(sql().all_business_ledger_sha256).toBe(
    before.all_business_ledger_sha256,
  );
});

test("duplicate JSON uses manual fallback and preserves input without ledger writes", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`, control)).json();
  await start(page, info.empty);
  const before = sql();
  const calls = (
    await (await request.get(`${api}/__qa/extraction`, control)).json()
  ).calls;
  const text = "Продажа 3000, оплачено полностью";
  await draft(page, text);
  await expect(
    page.getByText(
      "AI сейчас не смог обработать запись. Ввод сохранён: повторите анализ или продолжите вручную.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Текст для AI", { exact: true })).toHaveValue(
    text,
  );
  await expect(
    page.getByRole("button", { name: "Заполнить вручную", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${evidence}/invalid-provider-fallback-1280.png`,
    fullPage: true,
  });
  expect(sql().all_business_ledger_sha256).toBe(
    before.all_business_ledger_sha256,
  );
  expect(
    (await (await request.get(`${api}/__qa/extraction`, control)).json())
      .calls - calls,
  ).toBe(1);
});
