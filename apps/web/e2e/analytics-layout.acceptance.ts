import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";
import { prepareAssistant } from "./assistant-fixtures";

test("reminder click sends one paid request and survives StrictMode with a delayed response", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { state, services } = await prepareAssistant(page);
  let release!: () => void;
  state.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const button = page.locator(".analytics-reminders button").first();
  const name = (await button.getAttribute("aria-label"))!.replace(
    "Напоминание: ",
    "",
  );
  await button.click();
  await expect.poll(() => state.calls.filter((call) => call.ai).length).toBe(1);
  release();
  const result = page.getByRole("dialog").locator(".assistant-result");
  await expect(result).toBeVisible();
  await expect(result).toBeFocused();
  expect(state.calls.filter((call) => call.ai)).toEqual([
    {
      question: `Напиши напоминание о долге ${name}`,
      days: 7,
      locale: "ru",
      ai: true,
    },
  ]);
  expect(services.unexpected).toEqual([]);
});

for (const locale of ["ru", "kk"] as const) {
  for (const width of [390, 1440]) {
    test(`analytics layout ${locale} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const remote: string[] = [];
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname !== "127.0.0.1" || url.pathname.startsWith("/api/")) {
          remote.push(url.pathname);
          return route.abort();
        }
        return route.continue();
      });
      await enterDemo(page);
      await navigateSeller(page, "analytics");
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      await expect(
        page.locator(".analytics-main-kpis .analytics-kpi"),
      ).toHaveCount(3);
      await expect(page.locator(".analytics-period-answer")).toContainText(
        "74 000",
      );
      await expect(page.locator(".analytics-reminders li")).toHaveCount(3);
      await expect(
        page.locator(".analytics-page .assistant-reminder"),
      ).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(width);
      const directory = path.resolve(
        "../../docs/screenshots/analytics-redesign/after",
      );
      await mkdir(directory, { recursive: true });
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: path.join(directory, `${locale}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page.locator(".analytics-reminders button").first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.locator(".assistant-result")).toBeVisible();
      await expect(dialog.locator(".assistant-reminder")).toContainText(
        "18 000",
      );
      if (width === 390) {
        await expect(dialog.locator(".assistant-result")).toBeFocused();
        const answer = await dialog.locator(".assistant-result").boundingBox();
        expect(answer!.y).toBeGreaterThanOrEqual(0);
        expect(answer!.y).toBeLessThan(800);
        await page.screenshot({
          path: path.join(directory, `panel-${locale}-${width}.png`),
          animations: "disabled",
        });
      }
      await dialog
        .getByRole("button", {
          name: locale === "ru" ? "Закрыть" : "Жабу",
          exact: true,
        })
        .first()
        .click();
      await expect(dialog).toHaveCount(0);
      for (const size of [360, 390, 1440]) {
        await page.setViewportSize({ width: size, height: 1000 });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
          .toBe(size);
        const targets = await page
          .locator(
            ".analytics-page button:visible, .analytics-page summary:visible",
          )
          .evaluateAll((elements) =>
            elements.map((el) => el.getBoundingClientRect()),
          );
        expect(
          targets.every((rect) => rect.width >= 44 && rect.height >= 44),
        ).toBe(true);
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "";
        });
      }
      expect(remote).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
