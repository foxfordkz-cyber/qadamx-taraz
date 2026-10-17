import { expect, test, type Locator, type Page } from "@playwright/test";
import { login, mockServices, qaIds } from "./qa-fixtures";

async function uncovered(control: Locator) {
  await control.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  expect(
    await control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return hit === element || element.contains(hit);
    }),
  ).toBe(true);
}
async function servicesFor(page: Page) {
  const services = await mockServices(page);
  await page.route("**/api/v1/businesses/qa-*", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: { id: qaIds.shopA, catalog: [] } });
  });
  await page.route("**/api/v1/businesses/*/summary?*", (route) =>
    route.fulfill({
      json: {
        sales_minor: 0,
        receipts_minor: 0,
        outstanding_minor: 0,
        new_inquiries_count: 0,
      },
    }),
  );
  await page.route("**/api/v1/businesses/*/operations?*", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: { items: [], next_cursor: null } });
  });
  return services;
}
for (const native of [true, false]) {
  test(`buttons, language, menu, manual input and hit testing; native dialog=${native}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (!native)
      await page.addInitScript(() => {
        Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
          configurable: true,
          value: undefined,
        });
        Object.defineProperty(HTMLDialogElement.prototype, "close", {
          configurable: true,
          value: undefined,
        });
      });
    const services = await servicesFor(page);
    await login(page);
    await expect(page).toHaveURL(/\/seller$/);
    await page.goto("/seller/sale");
    const text = page.getByLabel("Текст для AI", { exact: true });
    await text.fill("Учебный текст без отправки");
    const menu = page.getByRole("button", { name: "Все разделы", exact: true });
    // Establish keyboard focus explicitly; WebKit pointer clicks do not focus buttons.
    await uncovered(menu);
    await menu.focus();
    await menu.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Все разделы" });
    await expect(dialog).toBeVisible();
    await page.screenshot({
      path: info.outputPath(native ? "native-menu.png" : "fallback-menu.png"),
    });
    const close = dialog.getByRole("button", { name: "Закрыть" });
    await close.focus();
    if (!native) {
      await page.keyboard.press("Shift+Tab");
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(menu).toBeFocused();
    await expect(page.locator(".dialog-fallback-backdrop")).toHaveCount(0);
    const kz = page.getByRole("button", { name: "KZ", exact: true });
    await uncovered(kz);
    await kz.click();
    await expect(text).toHaveCount(0);
    await page.getByRole("button", { name: "RU", exact: true }).click();
    await expect(text).toHaveValue("Учебный текст без отправки");
    const manual = page.getByRole("button", {
      name: "Заполнить вручную",
      exact: true,
    });
    await uncovered(manual);
    await manual.click();
    const description = page.getByLabel("Описание", { exact: true });
    await description.fill("Учебная ручная запись");
    await expect(description).toHaveValue("Учебная ручная запись");
    await menu.click();
    await dialog.getByRole("link", { name: "Каталог", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/seller\/catalog$/);
    expect(errors).toEqual([]);
    expect(services.unexpected).toEqual([]);
    expect(
      services.calls.filter(
        (call) =>
          /\/(drafts|operations)$/.test(call.path) && call.method === "POST",
      ),
    ).toEqual([]);
  });
}

test("unavailable microphone leaves text and manual controls usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    }),
  );
  const services = await servicesFor(page);
  await login(page);
  await expect(page).toHaveURL(/\/seller$/);
  await page.goto("/seller/sale");
  const text = page.getByLabel("Текст для AI", { exact: true });
  await text.fill("Текст остаётся");
  await page.getByRole("button", { name: "Записать голос" }).click();
  await expect(page.getByRole("alert")).toContainText("Запись недоступна");
  await expect(text).toHaveValue("Текст остаётся");
  await page
    .getByRole("button", { name: "Заполнить вручную", exact: true })
    .click();
  await page
    .getByLabel("Описание", { exact: true })
    .fill("Ручной ввод работает");
  expect(errors).toEqual([]);
  expect(services.unexpected).toEqual([]);
  expect(
    services.calls.some(
      (call) =>
        /\/(drafts|operations)$/.test(call.path) && call.method === "POST",
    ),
  ).toBe(false);
});

test.describe("touch controls with synthetic services, not a physical iPhone", () => {
  test.use({ hasTouch: true });
  test("recording denial and manual fields remain usable with touch", async ({
    page,
  }) => {
    const services = await servicesFor(page);
    await page.addInitScript(() => {
      // Windows desktop WebKit may lack capture. This case isolates denied
      // permission; it is not a claim of actual recording capability.
      Object.defineProperty(window, "MediaRecorder", {
        configurable: true,
        value: class {},
      });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () =>
            Promise.reject(new DOMException("Denied", "NotAllowedError")),
        },
      });
    });
    await login(page);
    await expect(page).toHaveURL(/\/seller$/);
    await page.goto("/seller/sale");
    const record = page.getByRole("button", {
      name: "Записать голос",
      exact: true,
    });
    await uncovered(record);
    await expect(record).toBeEnabled();
    await record.tap();
    await expect(page.getByRole("alert")).toContainText(
      "Доступ к микрофону не разрешён",
    );
    await page
      .getByRole("button", { name: "Заполнить вручную", exact: true })
      .tap();
    await page
      .getByLabel("Описание", { exact: true })
      .fill("Учебная запись без подтверждения");
    await expect(page.getByLabel("Описание", { exact: true })).toHaveValue(
      "Учебная запись без подтверждения",
    );
    expect(services.unexpected).toEqual([]);
  });
  test("Demo intentionally disables recording while bottom navigation works", async ({
    page,
  }) => {
    const services = await servicesFor(page);
    await page.goto("/login");
    await page
      .getByRole("button", { name: "Посмотреть демо", exact: true })
      .tap();
    await expect(page).toHaveURL(/\/seller$/);
    await page.getByRole("link", { name: "Продажа", exact: true }).last().tap();
    await expect(
      page.getByRole("button", { name: "Записать голос", exact: true }),
    ).toBeDisabled();
    const menu = page.getByRole("button", { name: "Все разделы", exact: true });
    await menu.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Закрыть", exact: true })
      .tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(services.calls.filter((call) => call.method === "POST")).toEqual([]);
  });
});
