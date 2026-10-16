import { expect, type Page } from "@playwright/test";

/** Client navigation keeps the explicit, in-memory demo session. */
export async function navigateSeller(page: Page, route: string) {
  await expect(page.locator(".app-shell")).toBeVisible();
  const href = `/seller${route ? `/${route}` : ""}`;
  const visibleLink = page.locator(`a[href="${href}"]:visible`).first();
  if ((await visibleLink.count()) > 0) {
    await visibleLink.click();
  } else {
    await page.locator('.bottom-nav button[aria-haspopup="dialog"]').click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();
    await menu.locator(`a[href="${href}"]`).click();
    await expect(menu).not.toBeVisible();
  }
  await expect(page).toHaveURL(new RegExp(`${href}$`));
}

export async function enterDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Посмотреть демо/ }).click();
  await expect(page.locator("#main-content h1")).toBeVisible();
  await expect(page.locator(".demo-banner")).toBeVisible();
}
