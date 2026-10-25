import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { navigateSeller } from "./helpers";

const api = "http://127.0.0.1:8321";
const evidence = process.env.QADAM_QA_EVIDENCE_DIR!;
const apiDir = fileURLToPath(new URL("../../api", import.meta.url));
function sql() {
  return JSON.parse(
    execFileSync(
      `${apiDir}/.venv/${process.platform === "win32" ? "Scripts/python.exe" : "bin/python"}`,
      ["tests/stage9_browser_server.py", "--verify"],
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
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
});

test("Stage9 receipt and genitive render correctly but ambiguous customer still needs selection", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`)).json();
  await start(page, info.empty);
  const before = sql().all_business_ledger_sha256;
  await page
    .getByLabel("Текст для AI", { exact: true })
    .fill("Саматтың дәптері 2715. Получено 915.");
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/drafts"),
  );
  await page
    .getByRole("button", { name: "Подготовить черновик", exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.customer_candidates).toHaveLength(2);
  expect(data.missing_fields).toContain("customer_id");
  await expect(
    page.getByLabel("Сумма продажи, ₸", { exact: true }),
  ).toHaveValue("2715");
  await expect(page.getByLabel("Получено, ₸", { exact: true })).toHaveValue(
    "915",
  );
  expect(sql().all_business_ledger_sha256).toBe(before);
  await page.screenshot({
    path: `${evidence}/stage9-receipt-customer-choice.png`,
    fullPage: true,
  });
});

test("Stage9 OpenAI duplicate receipt falls back without draft success or financial write", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${api}/__qa/info`)).json();
  await start(page, info.empty);
  const before = sql().all_business_ledger_sha256;
  await page
    .getByLabel("Текст для AI", { exact: true })
    .fill("Саматтың дәптері 2715. Получено 915. Тест повторного поля.");
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/drafts"),
  );
  await page
    .getByRole("button", { name: "Подготовить черновик", exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(503);
  expect((await response.json()).error.code).toBe("AI_UNAVAILABLE");
  await expect(page.getByLabel("Текст для AI", { exact: true })).toHaveValue(
    "Саматтың дәптері 2715. Получено 915. Тест повторного поля.",
  );
  await expect(
    page.getByRole("button", { name: "Заполнить вручную", exact: true }),
  ).toBeVisible();
  expect(sql().all_business_ledger_sha256).toBe(before);
  await page.screenshot({
    path: `${evidence}/stage9-openai-duplicate-fallback.png`,
    fullPage: true,
  });
});
