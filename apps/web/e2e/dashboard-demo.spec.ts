import { expect, test } from "@playwright/test";
import { enterDemo, navigateSeller } from "./helpers";

for (const width of [360, 390, 1440]) {
  for (const locale of ["ru", "kk"] as const) {
    test(`demo cabinet uses the analytics snapshot without API: ${locale} ${width}`, async ({
      page,
    }, info) => {
      const traffic: string[] = [];
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          ["fetch", "xhr"].includes(request.resourceType()) &&
          /\/api\/|supabase/.test(request.url())
        )
          traffic.push(`${request.method()} ${request.url()}`);
      });
      await page.setViewportSize({ width, height: 900 });
      await enterDemo(page);
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      await expect(page.locator(".cabinet-metrics dd")).toHaveText([
        /12\s*000\s*₸/,
        /9\s*000\s*₸/,
        /35\s*000\s*₸/,
      ]);
      await expect(page.locator(".cabinet-debt-preview li")).toHaveCount(3);
      await expect(page.locator(".cabinet-debt-preview")).toContainText("Әсел");
      await expect(page.locator(".cabinet-period").first()).toContainText(
        "2026-10-16",
      );
      const select = page.getByLabel(
        locale === "ru" ? "Торговая точка" : "Сауда нүктесі",
        { exact: true },
      );
      await select.selectOption("22222222-2222-4222-8222-222222222222");
      await expect(page.locator(".cabinet-metrics dd")).toHaveText([
        /0\s*₸/,
        /0\s*₸/,
        /0\s*₸/,
      ]);
      await expect(page.locator(".cabinet-debt-preview li")).toHaveCount(0);
      await select.selectOption("11111111-1111-4111-8111-111111111111");
      await expect(page.locator(".cabinet-debt-preview li")).toHaveCount(3);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`demo-${locale}-${width}.png`),
        fullPage: true,
      });
      await navigateSeller(page, "sale");
      await expect(
        page.getByRole("button", {
          name: locale === "ru" ? "Подтвердить запись" : "Жазбаны растау",
          exact: true,
        }),
      ).toBeDisabled();
      expect(traffic).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
