import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { enterDemo, navigateSeller } from "./helpers";
import { login, mockServices } from "./qa-fixtures";

for (const locale of ["ru", "kk"] as const) {
  for (const width of [360, 390, 1440]) {
    test(`summary Demo ${locale} ${width}: layout, keyboard, Clipboard, no API`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const rejected: string[] = [];
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (
          url.origin !== "http://127.0.0.1:4288" ||
          url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/__qa_supabase/")
        ) {
          rejected.push(url.pathname);
          return route.abort();
        }
        return route.continue();
      });
      await enterDemo(page);
      await navigateSeller(page, "summary");
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      await expect(page.locator(".ledger-stats .card")).toHaveCount(4);
      await expect(page.locator(".ledger-stats")).toContainText("3 000 ₸");
      await expect(page.locator('input[type="date"]')).toHaveValue(
        "2026-10-15",
      );
      const whatsapp = page.getByRole("link", {
        name:
          locale === "ru"
            ? "Отправить итог в WhatsApp"
            : "Қорытындыны WhatsApp-қа жіберу",
      });
      const copy = page.getByRole("button", {
        name: locale === "ru" ? "Скопировать итог" : "Қорытындыны көшіру",
      });
      await expect(whatsapp).toHaveAttribute("target", "_blank");
      await expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
      const text = new URL(
        (await whatsapp.getAttribute("href"))!,
      ).searchParams.get("text");
      expect(text).toContain("15.10");
      expect(text).toContain("Qadam · Демо");
      const hasNative = await page.evaluate(
        () => typeof navigator.share === "function",
      );
      await expect(
        page.getByRole("button", {
          name: locale === "ru" ? "Поделиться" : "Бөлісу",
          exact: true,
        }),
      ).toHaveCount(hasNative ? 1 : 0);
      for (const control of await page
        .locator(".summary-share-actions > *")
        .all()) {
        const box = await control.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      const directory = fileURLToPath(
        new URL(
          "../../../docs/screenshots/share-day-summary/",
          import.meta.url,
        ),
      );
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: `${directory}${locale}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await whatsapp.focus();
      await page.keyboard.press("Tab");
      await expect(copy).toBeFocused();
      expect(
        await copy.evaluate((el) => getComputedStyle(el).outlineStyle),
      ).not.toBe("none");
      await page.keyboard.press("Enter");
      await expect(page.locator(".summary-share [role=status]")).toHaveText(
        locale === "ru" ? "Итог скопирован" : "Қорытынды көшірілді",
      );
      expect(
        (await page.evaluate(() => navigator.clipboard.readText())).replace(
          /\r\n/g,
          "\n",
        ),
      ).toBe(text);
      expect(rejected).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
test("live provider shares loaded values without new API calls", async ({
  page,
}) => {
  const services = await mockServices(page);
  await login(page);
  await expect(page.locator(".app-shell")).toBeVisible();
  await navigateSeller(page, "summary");
  const whatsapp = page.getByRole("link", {
    name: "Отправить итог в WhatsApp",
  });
  await expect(whatsapp).toBeVisible();
  const before = services.calls.length;
  const text = new URL((await whatsapp.getAttribute("href"))!).searchParams.get(
    "text",
  );
  expect(text).toContain("QA MART");
  await page.getByRole("button", { name: "Скопировать итог" }).click();
  await expect(page.locator(".summary-share [role=status]")).toHaveText(
    "Итог скопирован",
  );
  expect(
    (await page.evaluate(() => navigator.clipboard.readText())).replace(
      /\r\n/g,
      "\n",
    ),
  ).toBe(text);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Қорытындыны WhatsApp-қа жіберу" }),
  ).toBeVisible();
  expect(services.calls).toHaveLength(before);
  expect(
    services.calls.filter(
      (call) => call.path.startsWith("/api/") && call.method !== "GET",
    ),
  ).toEqual([]);
  expect(services.unexpected).toEqual([]);
});
