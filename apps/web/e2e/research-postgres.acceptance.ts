import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { navigateSeller } from "./helpers";

const origin = "http://127.0.0.1:8316";
const apiDir = fileURLToPath(new URL("../../api", import.meta.url));
const evidence = fileURLToPath(
  new URL("../../../docs/diploma-evidence/screenshots", import.meta.url),
);
function sqlEvidence() {
  const python = `${apiDir}/${process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python"}`;
  return JSON.parse(
    execFileSync(python, ["tests/research_browser_server.py", "--verify"], {
      cwd: apiDir,
      env: { ...process.env, PYTHONPATH: "." },
      encoding: "utf8",
    }),
  );
}
async function login(page: Page, account = "a") {
  await page.goto("/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill(`${account}@research.example.test`);
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-local-only");
  const received = page.waitForResponse(
    `${origin}/auth/v1/token?grant_type=password`,
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const token = (await (await received).json()).access_token as string;
  // Cold Vite compilation and real /me verification precede seller rendering.
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15000 });
  return token; // Ephemeral test JWT, never logged or written to artifacts.
}
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return host === "127.0.0.1" ? route.continue() : route.abort();
  });
});

test("SQL → signed owner → real API → 7/30 UI, loading/error/retry and empty business", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${origin}/__qa/info`)).json();
  const before = sqlEvidence();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.getByLabel("Торговая точка").selectOption(info.business);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/research/forecast?**", async (route) => {
    await gate;
    await route.continue();
  });
  const result7 = page.waitForResponse((r) =>
    r.url().includes("/research/forecast?horizon=7"),
  );
  await navigateSeller(page, "research");
  await expect(page.locator("#forecast .spinner")).toBeVisible();
  release();
  const seven = await (await result7).json();
  expect(seven.provenance).toBe("demo_business_ledger");
  expect(seven.observed_days).toBe(179);
  expect(
    seven.history.reduce(
      (sum: number, row: { sales_minor: number }) => sum + row.sales_minor,
      0,
    ),
  ).toBe(before.ledger.sales - 100000);
  expect(seven.evaluation.train_to < seven.evaluation.validation_from).toBe(
    true,
  );
  expect(seven.evaluation.validation_to < seven.evaluation.test_from).toBe(
    true,
  );
  expect(seven.forecast).toHaveLength(7);
  await expect(page.locator(".research-chart")).toBeVisible();
  await expect(page.locator("#forecast")).toContainText(
    seven.evaluation.test_from,
  );
  await page.unroute("**/research/forecast?**");
  const result30 = page.waitForResponse((r) =>
    r.url().includes("/research/forecast?horizon=30"),
  );
  await page.getByLabel("Горизонт прогноза").selectOption("30");
  const thirty = await (await result30).json();
  expect(thirty.forecast).toHaveLength(30);
  expect(thirty.evaluation.test_observations).toBe(30);
  await expect(page.locator("#forecast")).toContainText(
    thirty.evaluation.test_to,
  );
  await expect(page.locator("#risk")).toContainText("400 ₸");
  await expect(page.locator("#risk")).toContainText("70/100");
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: `${evidence}/postgres-research-ru.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Проверить открытые продажи" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/seller/debts\\?customer_id=${info.customer}`),
  );
  await expect(page.locator(".debt-total")).toContainText("400 ₸");
  await navigateSeller(page, "research");
  await page.route("**/research/forecast?**", (route) =>
    route.abort("connectionfailed"),
  );
  await page.getByLabel("Горизонт прогноза").selectOption("30");
  await expect(page.locator("#forecast .error-state")).toBeVisible();
  await expect(page.locator(".research-chart")).toHaveCount(0);
  await page.unroute("**/research/forecast?**");
  await page
    .locator("#forecast")
    .getByRole("button", { name: /Повторить/ })
    .click();
  await expect(page.locator(".research-chart")).toBeVisible();
  await page.getByLabel("Торговая точка").selectOption(info.empty);
  await expect(page.locator("#forecast")).toContainText("0 полных дней");
  await expect(page.locator("#risk")).toContainText("Нет открытых долгов");
  await expect(page.locator(".research-chart")).toHaveCount(0);
  await expect(page.getByText("MAE, ₸", { exact: true })).toHaveCount(0);
  expect(sqlEvidence().ledger).toEqual(before.ledger);
  expect(errors).toEqual([]);
});

test("feedback commits despite lost response; explicit replay has one DB row, reload and private review", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${origin}/__qa/info`)).json();
  const before = sqlEvidence();
  const token = await login(page);
  await page.getByLabel("Торговая точка").selectOption(info.business);
  await navigateSeller(page, "research");
  await page.getByText("Мои сохранённые ответы", { exact: true }).click();
  await page.getByRole("button", { name: "Загрузить мои ответы" }).click();
  await expect(
    page.getByText("Сохранённых ответов нет.", { exact: true }),
  ).toBeVisible();
  const priority =
    "QA PostgreSQL: синтетический отзыв, не участник исследования";
  await page.getByLabel(/Что улучшить первым/).fill(priority);
  await page.getByRole("button", { name: "Отправить отзыв" }).click();
  await expect(page.getByText(/Проверьте согласие и длину/)).toBeVisible();
  expect(sqlEvidence().feedback).toHaveLength(before.feedback.length);
  await page.getByLabel(/Согласен на описанную/).check();
  const bodies: unknown[] = [];
  let receipt: { id: string; client_request_id: string } | undefined;
  await page.route("**/research/feedback", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    bodies.push(route.request().postDataJSON());
    const response = await route.fetch(); // Actual FastAPI commits to PostgreSQL.
    expect(response.status()).toBe(201);
    receipt = await response.json();
    if (bodies.length === 1) return route.abort("connectionfailed");
    return route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Отправить отзыв" }).dblclick();
  await expect(page.getByText(/Результат отправки неизвестен/)).toBeVisible();
  expect(bodies).toHaveLength(1);
  await expect(page.getByLabel(/Что улучшить первым/)).toHaveValue(priority);
  // The unknown intent survives SPA navigation and a different business.
  await navigateSeller(page, "customers");
  await navigateSeller(page, "research");
  await page.getByLabel("Торговая точка").selectOption(info.empty);
  await expect(page.getByLabel(/Что улучшить первым/)).toHaveValue("");
  await page.getByLabel("Торговая точка").selectOption(info.business);
  await expect(page.getByLabel(/Что улучшить первым/)).toHaveValue(priority);
  expect(bodies).toHaveLength(1);
  await page.getByRole("button", { name: "Повторить тот же ответ" }).click();
  await expect(page.getByText(/Ответ сохранён сервером/)).toContainText(
    receipt!.id,
  );
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
  const persisted = sqlEvidence();
  expect(persisted.feedback).toHaveLength(before.feedback.length + 1);
  expect(
    persisted.feedback.find((r: { id: string }) => r.id === receipt!.id)
      ?.consent,
  ).toBe(true);
  expect(persisted.migration).toBe("0009_research_feedback");
  expect(persisted.ledger).toEqual(before.ledger);
  const changed = await request.post(
    `${origin}/api/v1/businesses/${info.business}/research/feedback`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { ...(bodies[0] as object), improve_first: "changed" },
    },
  );
  expect(changed.status()).toBe(409);
  await page.reload();
  await expect(page.getByLabel("Торговая точка")).toHaveValue(info.business);
  await page.getByText("Мои сохранённые ответы", { exact: true }).click();
  await page.getByRole("button", { name: "Загрузить мои ответы" }).click();
  await expect(page.locator("#feedback li")).toContainText(priority);
  await page.screenshot({
    path: `${evidence}/postgres-feedback-persisted.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.locator("#feedback")).toHaveCount(0);
  const otherToken = await login(page, "b");
  await expect(page.getByLabel("Торговая точка")).not.toHaveValue(
    info.business,
  );
  await navigateSeller(page, "research");
  await expect(page.getByText(priority, { exact: true })).toHaveCount(0);
  const foreign = await request.get(
    `${origin}/api/v1/businesses/${info.business}/research/feedback`,
    {
      headers: { Authorization: `Bearer ${otherToken}` },
    },
  );
  expect(foreign.status()).toBe(404);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(page);
  await expect(page.getByLabel("Торговая точка")).toHaveValue(info.business);
  await navigateSeller(page, "research");
  await expect(page.getByLabel(/Что улучшить первым/)).toHaveValue("");
});

test("unsaved feedback remains in session memory; reload/logout warn, discard is explicit", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${origin}/__qa/info`)).json();
  const before = sqlEvidence();
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/research/feedback"))
      posts++;
  });
  await login(page);
  await page.getByLabel("Торговая точка").selectOption(info.business);
  await navigateSeller(page, "research");
  const text = "Unsubmitted synthetic QA draft, never a research participant";
  await page.getByLabel(/Что улучшить первым/).fill(text);
  await page.getByLabel(/Согласен на описанную/).check();
  await navigateSeller(page, "debts");
  await expect(
    page.getByRole("heading", { name: "Мне должны", exact: true }),
  ).toBeVisible();
  // Route change closes the secondary menu. Wait for that UI
  // transition before deciding whether the Research link is already visible.
  await expect(page.locator(".seller-secondary-nav")).not.toHaveAttribute(
    "open",
  );
  await navigateSeller(page, "research");
  await expect(page.getByLabel(/Что улучшить первым/)).toHaveValue(text);
  await expect(page.getByLabel(/Согласен на описанную/)).toBeChecked();
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(storage.includes(text)).toBe(false); // Never print auth storage in failures/artifacts.
  const reloadDialog = page.waitForEvent("dialog");
  // A cancelled reload has no navigation to await. Trigger the real browser
  // action, then observe its beforeunload dialog and the still-present form.
  await page.evaluate(() => {
    window.setTimeout(() => window.location.reload(), 0);
  });
  const dialog = await reloadDialog;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page.getByLabel(/Что улучшить первым/)).toHaveValue(text);
  const logoutDialog = page.waitForEvent("dialog");
  const logout = page
    .getByRole("button", { name: "Выйти", exact: true })
    .click();
  const confirmation = await logoutDialog;
  expect(confirmation.message()).toContain("несохранённый отзыв");
  await confirmation.dismiss();
  await logout;
  await expect(page.getByLabel(/Что улучшить первым/)).toHaveValue(text);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(page.getByText(/Серверде сақталмаған/)).toBeVisible();
  await page.screenshot({
    path: `${evidence}/research-unsaved-kk.png`,
    fullPage: true,
  });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Жобаны жою", exact: true }).click();
  await expect(page.getByLabel(/Алдымен нені жақсарту/)).toHaveValue("");
  await page.reload(); // Clean draft no longer registers a beforeunload warning.
  await expect(page.getByLabel("Сауда нүктесі")).toHaveValue(info.business);
  expect(posts).toBe(0);
  expect(sqlEvidence().feedback).toEqual(before.feedback);
  expect(sqlEvidence().ledger).toEqual(before.ledger);
});

test("real verifier rejects absent/tampered tokens and foreign businesses; consent is enforced server-side", async ({
  page,
  request,
}) => {
  const info = await (await request.get(`${origin}/__qa/info`)).json();
  const token = await login(page);
  const prefix = `${origin}/api/v1/businesses/${info.business}/research`;
  for (const resource of [
    "forecast?horizon=7",
    "forecast?horizon=30",
    "debt-risk",
    "feedback",
  ]) {
    expect((await request.get(`${prefix}/${resource}`)).status()).toBe(401);
    expect(
      (
        await request.get(`${prefix}/${resource}`, {
          headers: { Authorization: `Bearer ${token}invalid` },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.get(
          `${origin}/api/v1/businesses/${info.other}/research/${resource}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
      ).status(),
    ).toBe(404);
  }
  const rejected = await request.post(`${prefix}/feedback`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      client_request_id: "60000000-0000-4000-8000-000000000001",
      language: "ru",
      consent: false,
      consent_version: "v1",
      features_used: [],
      improve_first: "Synthetic validation check",
    },
  });
  expect(rejected.status()).toBe(422);
  expect(rejected.headers()["cache-control"]).toBe("no-store");
});
