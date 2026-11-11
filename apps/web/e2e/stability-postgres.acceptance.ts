import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { customers, login, newCustomer } from "./qa-fixtures";
import { navigateSeller } from "./helpers";

test("real API/JWT/SQL: customer, 4200/2200/2000 ledger, reversal, reload, RU/KZ and AI fallback", async ({
  page,
  request,
}, info) => {
  const identity = JSON.parse(
    readFileSync(process.env.QADAM_QA_SESSION!, "utf8"),
  );
  const user = {
    id: identity.user,
    email: "a@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    user,
    access_token: identity.token,
    refresh_token: "synthetic-refresh",
    token_type: "bearer",
    expires_in: 600,
    expires_at: Math.floor(Date.now() / 1000) + 600,
  };
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") {
      external.push(url.origin);
      return route.abort();
    }
    if (url.pathname.includes("/auth/v1/token"))
      return route.fulfill({ json: session });
    if (url.pathname.includes("/auth/v1/user"))
      return route.fulfill({ json: user });
    if (url.pathname.includes("/auth/v1/logout"))
      return route.fulfill({ status: 204 });
    return route.continue();
  });
  await login(page);
  await expect(page.locator(".app-shell")).toBeVisible();
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(identity.business);
  await customers(page);
  const form = await newCustomer(page);
  await form
    .getByRole("button", { name: "Создать клиента", exact: true })
    .click();
  await expect(form).not.toBeVisible();
  await navigateSeller(page, "sale");
  await page.getByLabel("Описание", { exact: true }).fill("QA stability sale");
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("3000");
  await page.getByLabel("Получено, ₸", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Выбрать клиента", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /QA Новый/ })
    .click();
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .evaluate((b: HTMLButtonElement) => {
      b.click();
      b.click();
    });
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  await navigateSeller(page, "debts");
  await expect(page.locator(".debt-balance")).toContainText("2 000 ₸");
  await page.getByRole("link", { name: "Принять оплату" }).click();
  await page
    .getByLabel("Описание", { exact: true })
    .fill("QA stability repayment");
  await page.getByLabel("Доплата, ₸", { exact: true }).fill("500");
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click();
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  await navigateSeller(page, "history");
  await page
    .locator(".history-row")
    .filter({ hasText: "QA stability repayment" })
    .getByRole("button", { name: "Исправить запись" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Подтвердить запись" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await navigateSeller(page, "sale");
  await page
    .getByLabel("Описание", { exact: true })
    .fill("QA stability paid sale");
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("1200");
  await page.getByLabel("Получено, ₸", { exact: true }).fill("1200");
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click();
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  await navigateSeller(page, "summary");
  await expect(page.locator(".ledger-stats strong")).toHaveText([
    "4 200 ₸",
    "2 200 ₸",
    "2 000 ₸",
    "0",
  ]);
  await page.reload();
  await expect(page.locator(".ledger-stats strong")).toHaveText([
    "4 200 ₸",
    "2 200 ₸",
    "2 000 ₸",
    "0",
  ]);
  await page.screenshot({
    path: info.outputPath("postgres-summary-desktop.png"),
    fullPage: true,
  });
  const response = await request.get(
    `http://127.0.0.1:8338/api/v1/businesses/${identity.business}/summary`,
    { headers: { Authorization: `Bearer ${identity.token}` } },
  );
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    sales_minor: 420000,
    receipts_minor: 220000,
    outstanding_minor: 200000,
  });
  await navigateSeller(page, "analytics");
  await expect(
    page.locator(".analytics-main-kpis .analytics-kpi-value"),
  ).toHaveText(["4 200 ₸", "2 200 ₸", "2 000 ₸"]);
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(30);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(
    page.locator(".analytics-main-kpis .analytics-kpi-value"),
  ).toHaveText(["4 200 ₸", "2 200 ₸", "2 000 ₸"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("postgres-analytics-kz-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await navigateSeller(page, "sale");
  await page.getByLabel("Текст для AI").fill("Продал на 3000, получил 1000");
  await page
    .getByRole("button", { name: "Подготовить черновик", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "AI сейчас не смог обработать запись",
  );
  await expect(page.getByLabel("Текст для AI")).toHaveValue(
    "Продал на 3000, получил 1000",
  );
  await page
    .getByRole("button", { name: "Заполнить вручную", exact: true })
    .click();
  await expect(page.getByLabel("Сумма продажи, ₸")).toBeEnabled();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
