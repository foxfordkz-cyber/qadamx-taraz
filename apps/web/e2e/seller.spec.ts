import { expect, test } from "@playwright/test";

test("protected routes redirect to login; explicit demo has no writes or backend traffic", async ({
  page,
}) => {
  const errors: string[] = [];
  const backendTraffic: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      ["fetch", "xhr"].includes(request.resourceType()) &&
      /\/api\/|supabase/.test(request.url())
    )
      backendTraffic.push(request.url());
  });
  await page.goto("/seller/inquiries?business_id=foreign");
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("button", { name: /Посмотреть демо/ }).click();
  await expect(
    page.getByRole("heading", { name: "Хорошего рабочего дня!" }),
  ).toBeVisible();
  await page.locator('a[href="/seller/inquiries"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Әсел · Демо" }),
  ).toBeVisible();
  for (const select of await page.getByLabel("Статус заявки").all())
    await expect(select).toBeDisabled();
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/seller/catalog");
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
  expect(backendTraffic).toEqual([]);
});

for (const width of [360, 768, 1440]) {
  test(`seller navigation and no horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/login");
    await page.getByRole("button", { name: /Посмотреть демо/ }).click();
    await expect(
      page.getByRole("heading", { name: "Хорошего рабочего дня!" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
    for (const route of [
      "inquiries",
      "customers",
      "catalog",
      "sale",
      "debts",
      "history",
      "summary",
    ]) {
      // Client navigation preserves explicit in-memory demo selection.
      await page.locator(`a[href="/seller/${route}"]:visible`).first().click();
      await expect(page).toHaveURL(new RegExp(`/seller/${route}$`));
      await expect(page.locator("#main-content h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.locator('a[href="/seller/customers"]:visible').first().click();
    await page.getByRole("button", { name: /Новый клиент/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Имя", { exact: true }).fill("Әсел");
    await dialog.getByRole("button", { name: "KZ" }).click();
    await expect(dialog.getByLabel("Есімі", { exact: true })).toHaveValue(
      "Әсел",
    );
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /Жаңа клиент/ }),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("catalog and duplicate customers, language persistence and real reload protection", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Посмотреть демо/ }).click();
  await page.locator('a[href="/seller/customers"]:visible').first().click();
  await page
    .getByRole("button", { name: "Выбрать клиента", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const options = dialog.getByRole("button", { name: /Асқар/ });
  await expect(options).toHaveCount(2);
  await options.nth(1).click();
  await expect(page.getByText("Выбран: Асқар · Демо · доставка")).toBeVisible();
  await page.locator('a[href="/seller/catalog"]:visible').first().click();
  await expect(page.getByText("15 000 ₸")).toBeVisible();
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption("22222222-2222-4222-8222-222222222222");
  await expect(
    page.getByRole("heading", { name: "Здесь пока ничего нет" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
});

test("mobile inquiry filter and customer search work in RU and KZ", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/login");
  await page.getByRole("button", { name: /Посмотреть демо/ }).click();
  await page.locator('a[href="/seller/inquiries"]:visible').first().click();
  await page
    .getByLabel("Показать заявки", { exact: true })
    .selectOption("closed");
  await expect(page.locator(".inquiry-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Демо-покупатель 02" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(
    page.getByLabel("Өтінімдерді көрсету", { exact: true }),
  ).toHaveValue("closed");
  await page.locator('a[href="/seller/customers"]:visible').first().click();
  await page.getByLabel("Есімі бойынша іздеу", { exact: true }).fill("Әсел");
  await expect(
    page.getByRole("heading", { name: "Әсел", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Асқар", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Іздеуді тазалау", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Асқар", exact: true }),
  ).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
