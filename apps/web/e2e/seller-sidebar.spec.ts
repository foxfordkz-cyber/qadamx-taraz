import { expect, test, type Page } from "@playwright/test";
import { enterDemo } from "./helpers";

// Low screens and browser zoom: 1366×768 at 100/125/150 % is emulated by the CSS
// viewport size. The sticky sidebar must keep its last items reachable.
const lowScreens = [
  { name: "1366×768", width: 1366, height: 768 },
  { name: "1366×768 at 125%", width: 1093, height: 614 },
  { name: "1366×768 at 150%", width: 911, height: 512 },
];

async function inViewport(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight + 0.5;
  });
}

for (const screen of lowScreens) {
  test(`sidebar keeps the last item and the storefront link reachable on ${screen.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await enterDemo(page);
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeVisible();
    const storefront = ".sidebar-footer a";
    const lastItem = ".sidebar nav a:last-child";

    // Pointer: the panel scrolls on its own, independent of the page content.
    await sidebar.hover();
    await page.mouse.wheel(0, 2000);
    await expect.poll(() => inViewport(page, storefront)).toBe(true);
    expect(await inViewport(page, lastItem)).toBe(true);
    const [footerTop, navBottom] = await page.evaluate(() => [
      document.querySelector(".sidebar-footer")!.getBoundingClientRect().top,
      document.querySelector(".sidebar nav")!.getBoundingClientRect().bottom,
    ]);
    expect(footerTop).toBeGreaterThanOrEqual(navBottom - 0.5);

    // Keyboard: focusing the link brings it on screen.
    await sidebar.evaluate((el) => (el.scrollTop = 0));
    await page.locator(storefront).focus();
    await expect.poll(() => inViewport(page, storefront)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBe(0);
  });
}

test("closing the mobile menu leaves the page scrollable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page);
  await page.locator('.bottom-nav button[aria-haspopup="dialog"]').click();
  const menu = page.getByRole("dialog");
  await expect(menu.locator('a[href="/"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});
