import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { login, customers, newCustomer } from "./qa-fixtures";
import { navigateSeller } from "./helpers";

test("Stage3 real ledger: customer profile, filters, age, RU/KZ reminders, report CSV/print, isolation and 4200/2200/2000", async ({
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
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/v1/") && response.status() >= 400)
      console.log(
        "API failure",
        response.request().method(),
        url.pathname,
        response.status(),
      );
  });
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
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(identity.business);
  await customers(page);
  const form = await newCustomer(page);
  await form.getByLabel("Имя", { exact: true }).fill("Айжан Stage3");
  await form
    .getByRole("button", { name: "Создать клиента", exact: true })
    .click();
  await expect(form).not.toBeVisible();
  await navigateSeller(page, "sale");
  await page
    .getByRole("button", { name: "Заполнить вручную", exact: true })
    .click();
  await page.getByLabel("Описание", { exact: true }).fill("Stage3 partial");
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("3000");
  await page.getByLabel("Получено, ₸", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Выбрать клиента", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Айжан Stage3/ })
    .click();
  const before = await request.get(
    `http://127.0.0.1:8348/api/v1/businesses/${identity.business}/report`,
    { headers: { Authorization: `Bearer ${identity.token}` } },
  );
  expect((await before.json()).operation_count).toBe(0);
  const firstSave = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname.endsWith("/operations"),
  );
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .evaluate((b: HTMLButtonElement) => {
      b.click();
      b.click();
    });
  expect((await firstSave).status()).toBe(200);
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  await navigateSeller(page, "debts");
  await expect(page.locator(".debt-balance")).toContainText("2 000 ₸");
  await expect(
    page.getByRole("heading", { name: "0–7 дней", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Скопировать напоминание" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "2 000",
  );
  await page.getByRole("link", { name: "Принять оплату" }).click();
  await page.getByLabel("Описание", { exact: true }).fill("Stage3 repayment");
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
    .filter({ hasText: "Stage3 repayment" })
    .getByRole("button", { name: "Исправить запись" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Подтвердить запись" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await navigateSeller(page, "sale");
  await page.getByLabel("Описание", { exact: true }).fill("Stage3 paid");
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("1200");
  await page.getByLabel("Получено, ₸", { exact: true }).fill("1200");
  await page
    .getByRole("button", { name: "Выбрать клиента", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Айжан Stage3/ })
    .click();
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
  await page.getByText("Открыть отчёт за период", { exact: true }).click();
  await expect(page.locator(".business-values strong")).toHaveText([
    "4 200 ₸",
    "2 200 ₸",
    "2 000 ₸",
    "0 ₸",
    "2 000 ₸",
  ]);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать CSV", exact: true }).click();
  const download = await downloadPromise;
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv).toContain("4200.00");
  expect(csv).toContain("2200.00");
  expect(csv).toContain("2000.00");
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printObserved = String(
        document.body.classList.contains("qadam-print-report"),
      );
    };
  });
  await page
    .getByRole("button", { name: "Печатная версия", exact: true })
    .click();
  expect(await page.getAttribute("html", "data-print-observed")).toBe("true");
  // Capture actual print CSS in Chrome, without opening an OS printer dialogue.
  await page.evaluate(() => document.body.classList.add("qadam-print-report"));
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".business-print-sheet")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("report-print.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() =>
    document.body.classList.remove("qadam-print-report"),
  );
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: info.outputPath("report-desktop.png"),
    fullPage: true,
  });
  await customers(page);
  await page
    .locator(".customer-row")
    .filter({ hasText: "Айжан Stage3" })
    .getByRole("button", { name: "Карточка клиента" })
    .click();
  const profile = page.getByRole("dialog");
  await expect(profile.locator(".business-values strong")).toHaveText([
    "4 200 ₸",
    "2 200 ₸",
    "2 000 ₸",
  ]);
  await expect(
    profile.getByText("Последняя операция:", { exact: false }),
  ).toBeVisible();
  await profile
    .getByLabel("Тип операции", { exact: true })
    .selectOption("repayment");
  await expect(profile.locator(".business-profile li")).toHaveCount(1);
  await expect(profile.locator(".business-profile li")).toContainText(
    "Stage3 repayment",
  );
  await page.screenshot({
    path: info.outputPath("customer-profile.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await navigateSeller(page, "history");
  await page.locator(".business-filters > summary").click();
  await page.getByLabel("Тип операции", { exact: true }).selectOption("sale");
  await page.getByLabel("Текущий статус продажи").selectOption("paid");
  await page.getByLabel("Сумма от, ₸").fill("1200");
  await page.getByLabel("Сумма до, ₸").fill("1200");
  await page.getByRole("button", { name: "Применить", exact: true }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await expect(page.locator(".history-row")).toContainText("Stage3 paid");
  await page.reload();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await navigateSeller(page, "debts");
  await page.locator(".business-filters > summary").click();
  await page
    .getByLabel("Возраст долга", { exact: true })
    .selectOption("31_plus");
  await page.getByRole("button", { name: "Применить", exact: true }).click();
  await expect(page.locator(".debt-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Сбросить", exact: true }).click();
  await expect(page.locator(".debt-row")).toHaveCount(1);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await page.getByRole("button", { name: "Еске салу мәтінін көшіру" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "2 000",
  );
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".business-filters")
    .evaluate((details: HTMLDetailsElement) => {
      details.open = false;
    });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: info.outputPath("debts-kz-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await navigateSeller(page, "summary");
  await page.getByText("Открыть отчёт за период", { exact: true }).click();
  await expect(page.locator(".business-values strong")).toHaveText([
    "4 200 ₸",
    "2 200 ₸",
    "2 000 ₸",
    "0 ₸",
    "2 000 ₸",
  ]);
  const data = await request.get(
    `http://127.0.0.1:8348/api/v1/businesses/${identity.business}/report`,
    { headers: { Authorization: `Bearer ${identity.token}` } },
  );
  expect(await data.json()).toMatchObject({
    sales_minor: 420000,
    receipts_minor: 220000,
    outstanding_minor: 200000,
    operation_count: 4,
  });
  const foreign = await request.get(
    `http://127.0.0.1:8348/api/v1/businesses/${identity.business}/report`,
    { headers: { Authorization: `Bearer ${identity.foreign_token}` } },
  );
  expect(foreign.status()).toBe(404);
  const selector = page.getByLabel("Торговая точка", { exact: true });
  const other = await selector
    .locator("option")
    .evaluateAll(
      (options, current) =>
        options
          .map((o) => (o as HTMLOptionElement).value)
          .find((value) => value !== current),
      identity.business,
    );
  expect(other).toBeTruthy();
  await selector.selectOption(other!);
  await expect(page.locator(".ledger-stats").first()).toContainText("0 ₸");
  await expect(
    page.locator(".business-print-sheet").getByText("4 200 ₸", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
