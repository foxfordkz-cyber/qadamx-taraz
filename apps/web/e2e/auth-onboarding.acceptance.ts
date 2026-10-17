import { expect, test } from "@playwright/test";
import { mockServices, qaIds } from "./qa-fixtures";

const ruDemo =
  "В деморежиме используются учебные данные; изменения не сохраняются";
const kkDemo =
  "Демо режимінде оқу деректері қолданылады; өзгерістер сақталмайды";

for (const width of [360, 390, 768, 1440]) {
  test(`existing login → zero memberships → refresh/logout, keyboard and RU/KZ at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await mockServices(page);
    let meCalls = 0;
    await page.route("**/api/v1/me", async (route) => {
      meCalls++;
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      await route.fulfill({ json: { id: qaIds.a, businesses: [] } });
    });
    await page.goto("/seller/analytics?business_id=" + qaIds.shopB);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(ruDemo)).toBeVisible();
    const email = page.getByLabel("Электронная почта", { exact: true });
    await email.focus();
    await page.keyboard.type("a@example.test");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Пароль", { exact: true })).toBeFocused();
    await page.keyboard.type("synthetic-qa-password");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("checkbox", { name: "Показать пароль" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Войти", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Создание точки и приглашения в кабинете пока недоступны/),
    ).toBeVisible();
    await expect(
      page.getByLabel("Торговая точка", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".demo-banner")).toHaveCount(0);
    expect(meCalls).toBe(1);
    await page.getByRole("button", { name: "Обновить доступ" }).click();
    await expect.poll(() => meCalls).toBe(2);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeVisible();
    await expect.poll(() => meCalls).toBe(3);
    expect(
      state.calls.filter((call) => call.path.endsWith("/auth/v1/token")),
    ).toHaveLength(1);
    expect(
      state.calls.filter((call) => call.path.startsWith("/api/v1/businesses")),
    ).toEqual([]);
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Сізде әзірге сауда нүктелері жоқ" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`zero-membership-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Шығу", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(kkDemo)).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Кіру", exact: true }),
    ).toBeVisible();
    expect(meCalls).toBe(3);
    expect(state.unexpected).toEqual([]);
  });
}

test("invalid or empty login fields do not send an auth request", async ({
  page,
}) => {
  const state = await mockServices(page);
  await page.goto("/login");
  const submit = page.getByRole("button", { name: "Войти", exact: true });
  await submit.click();
  await expect(
    page.getByLabel("Электронная почта", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("invalid-email");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await submit.click();
  expect(
    await page
      .locator("form")
      .evaluate((form: HTMLFormElement) => form.checkValidity()),
  ).toBe(false);
  expect(state.calls).toEqual([]);
});

test("pending login blocks duplicate submits and Demo; rejection preserves input without leaking raw errors", async ({
  page,
}) => {
  const state = await mockServices(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let posts = 0;
  await page.route("**/auth/v1/token?*", async (route) => {
    posts++;
    await held;
    await route.fulfill({
      status: 400,
      json: {
        code: "invalid_credentials",
        msg: "PRIVATE_SERVER_TRACE_MUST_NOT_RENDER",
      },
    });
  });
  await page.goto("/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("a@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await page.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect.poll(() => posts).toBe(1);
  await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("button", { name: /Посмотреть демо/ }),
  ).toBeDisabled();
  await page.keyboard.press("Enter");
  release();
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  expect(posts).toBe(1);
  await expect(
    page.getByText("PRIVATE_SERVER_TRACE_MUST_NOT_RENDER"),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Электронная почта", { exact: true }),
  ).toHaveValue("a@example.test");
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveValue(
    "synthetic-password",
  );
  await expect(
    page.getByRole("button", { name: "Войти", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  expect(state.unexpected).toEqual([]);
});

test("an unconfirmed-email rejection grants neither session nor Demo after reload", async ({
  page,
}) => {
  const state = await mockServices(page);
  await page.route("**/auth/v1/token?*", (route) =>
    route.fulfill({
      status: 400,
      json: { code: "email_not_confirmed", msg: "Email not confirmed" },
    }),
  );
  await page.goto("/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("unconfirmed@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  await page.goto("/seller");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: /Посмотреть демо/ }),
  ).toBeEnabled();
  expect(state.calls.filter((call) => call.path.startsWith("/api/"))).toEqual(
    [],
  );
  expect(state.unexpected).toEqual([]);
});
