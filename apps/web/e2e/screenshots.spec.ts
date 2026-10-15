import { expect, test } from "@playwright/test";

test("capture reviewed merchant screens — explicitly demo data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.getByRole("button", { name: /Посмотреть демо/ }).click();
  await expect(
    page.getByRole("heading", { name: "Хорошего рабочего дня!" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../../docs/screenshots/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../../docs/screenshots/dashboard-mobile.png",
    fullPage: false,
  });
  await page.locator('a[href="/seller/customers"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Асқар", exact: true }),
  ).toHaveCount(2);
  await page.screenshot({
    path: "../../docs/screenshots/customers-mobile.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "../../docs/screenshots/customers-desktop.png",
    fullPage: true,
  });
  await page.locator('a[href="/seller/inquiries"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Әсел · Демо" }),
  ).toBeVisible();
  await page.getByLabel("Поиск по заявкам", { exact: true }).fill("Сәлеметсіз");
  await expect(page.locator(".inquiry-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Очистить поиск" }).click();
  await page.screenshot({
    path: "../../docs/screenshots/inquiries-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('a[href="/seller/catalog"]:visible').first().click();
  await expect(page.getByText("15 000 ₸")).toBeVisible();
  await page.screenshot({
    path: "../../docs/screenshots/catalog-mobile.png",
    fullPage: false,
  });
  const targets = await page.locator(".bottom-nav a").evaluateAll((elements) =>
    elements.map((element) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    })),
  );
  for (const target of targets) {
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
});
