import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { prepareAssistant } from "./assistant-fixtures";
import { mockServices } from "./qa-fixtures";

// Run on the captain's integration branch as a release gate. Missing work from
// seller-web/public-web is a real failure, never an automatic skip or green check.
for (const locale of ["ru", "kk"] as const) {
  for (const width of [360, 1440]) {
    test.describe(`${locale} ${width}`, () => {
      test.use({ viewport: { width, height: 1000 } });
      test("cabinet has both AI entries and keyboard-dismissable panel", async ({
        page,
      }) => {
        await prepareAssistant(page, false);
        await expect(page.locator("#main-content h1")).toBeVisible();
        if (locale === "kk")
          await page.getByRole("button", { name: "KZ", exact: true }).click();
        const directory = path.resolve(
          process.env.QADAM_QA_SCREENSHOT_ROOT ??
            "../../docs/qa/assistant-release",
        );
        await mkdir(directory, { recursive: true });
        await page.screenshot({
          path: path.join(directory, `cabinet-${locale}-${width}.png`),
          fullPage: true,
        });
        const entry = page.getByRole("button", {
          name: locale === "ru" ? "Спросите Qadam" : "Qadam-нан сұраңыз",
          exact: false,
        });
        await expect(entry).toBeVisible();
        await expect(
          page.getByRole("link", {
            name: locale === "ru" ? "Скажите о продаже" : "Сатылымды айтыңыз",
          }),
        ).toHaveAttribute("href", /\/seller\/sale/);
        await entry.focus();
        await entry.press("Enter");
        const panel = page.getByRole("dialog");
        await expect(panel).toBeVisible();
        await expect(panel.locator(".assistant")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(panel).not.toBeVisible();
        await expect(entry).toBeFocused();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
      });

      test("public hero explains voice accounting and has seller/store calls to action", async ({
        page,
      }) => {
        const services = await mockServices(page);
        await page.route("**/api/v1/{venues,businesses}*", (route) =>
          route.fulfill({ json: { items: [], next_cursor: null } }),
        );
        await page.goto("/");
        await expect(page.locator("h1")).toBeVisible();
        if (locale === "kk")
          await page.getByRole("button", { name: "KZ", exact: true }).click();
        const directory = path.resolve(
          process.env.QADAM_QA_SCREENSHOT_ROOT ??
            "../../docs/qa/assistant-release",
        );
        await mkdir(directory, { recursive: true });
        await page.screenshot({
          path: path.join(directory, `hero-${locale}-${width}.png`),
          fullPage: true,
        });
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          locale === "ru"
            ? "Qadam — учёт продаж и долгов голосом"
            : "Qadam — сату мен қарызды дауыспен есепке алу",
        );
        await expect(
          page
            .getByRole("link", {
              name: locale === "ru" ? "Кабинет продавца" : "Сатушы кабинеті",
              exact: true,
            })
            .first(),
        ).toBeVisible();
        await expect(
          page
            .getByRole("link", {
              name: locale === "ru" ? "Найти магазин" : "Дүкен табу",
              exact: true,
            })
            .first(),
        ).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
        expect(services.unexpected).toEqual([]);
      });
    });
  }
}
