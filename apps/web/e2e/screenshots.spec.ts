import { expect, test, type Page } from "@playwright/test";

async function navigateSeller(page: Page, route: string) {
  const href = `/seller${route ? `/${route}` : ""}`;
  const visibleLink = page.locator(`a[href="${href}"]:visible`).first();
  if ((await visibleLink.count()) > 0) {
    await visibleLink.click();
  } else {
    await page.locator(".bottom-nav button").click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();
    await menu.locator(`a[href="${href}"]`).click();
    await expect(menu).not.toBeVisible();
  }
}

async function capture(page: Page, name: string, fullPage: boolean) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.mouse.move(page.viewportSize()!.width - 5, 5);
  await expect(page.locator(".demo-banner")).toBeVisible();
  await page.screenshot({
    path: `../../docs/screenshots/${name}.png`,
    fullPage,
    animations: "disabled",
  });
}

test("capture reviewed merchant screens — explicitly demo data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.getByRole("button", { name: /Посмотреть демо/ }).click();
  await expect(
    page.getByRole("heading", { name: "Хорошего рабочего дня!" }),
  ).toBeVisible();
  await capture(page, "dashboard-desktop", true);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "dashboard-mobile", false);
  await page.setViewportSize({ width: 768, height: 1000 });
  await capture(page, "dashboard-tablet", true);

  await page.setViewportSize({ width: 390, height: 844 });
  await navigateSeller(page, "customers");
  await expect(
    page.getByRole("heading", { name: "Асқар", exact: true }),
  ).toHaveCount(2);
  await capture(page, "customers-mobile", false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture(page, "customers-desktop", true);

  await navigateSeller(page, "inquiries");
  await expect(
    page.getByRole("heading", { name: "Әсел · Демо" }),
  ).toBeVisible();
  await page.getByLabel("Поиск по заявкам", { exact: true }).fill("Сәлеметсіз");
  await expect(page.locator(".inquiry-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Очистить поиск" }).click();
  await expect(page.locator(".inquiry-card")).toHaveCount(3);
  await capture(page, "inquiries-desktop", true);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "inquiries-mobile", false);

  await navigateSeller(page, "catalog");
  await expect(page.getByText("15 000 ₸")).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await capture(page, "catalog-mobile", false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture(page, "catalog-desktop", true);
  await page.setViewportSize({ width: 360, height: 844 });
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(
    page.getByLabel("Каталогтан іздеу", { exact: true }),
  ).toBeVisible();
  await capture(page, "catalog-mobile-kk", false);
});
