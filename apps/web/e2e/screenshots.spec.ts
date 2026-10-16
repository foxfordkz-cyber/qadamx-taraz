import { expect, test } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";

const screens = [
  ["dashboard", ""],
  ["customers", "customers"],
  ["sale", "sale"],
  ["debts", "debts"],
  ["history", "history"],
  ["summary", "summary"],
  ["inquiries", "inquiries"],
  ["catalog", "catalog"],
] as const;

test("capture integrated merchant desktop/mobile screens — explicit read-only demo", async ({
  page,
}) => {
  const destination = path.resolve(
    process.env.QADAM_SCREENSHOT_ROOT ?? "../../docs/screenshots",
    "team-mvp-design",
  );
  await mkdir(destination, { recursive: true });
  const exportDirectory = process.env.QADAM_SCREENSHOT_OUTPUT;
  if (exportDirectory) await mkdir(exportDirectory, { recursive: true });
  await enterDemo(page);
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [name, route] of screens) {
      await navigateSeller(page, route);
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.locator(".demo-banner")).toBeVisible();
      if (route === "customers") {
        await expect(
          page.getByRole("heading", { name: "Асқар", exact: true }),
        ).toHaveCount(2);
      }
      if (route === "inquiries") {
        await expect(
          page.getByRole("heading", { name: "Әсел · Демо" }),
        ).toBeVisible();
        await page
          .getByLabel("Поиск по заявкам", { exact: true })
          .fill("Сәлеметсіз");
        await expect(page.locator(".inquiry-card")).toHaveCount(1);
        await page.getByRole("button", { name: "Очистить поиск" }).click();
      }
      if (route === "catalog")
        await expect(page.getByText("15 000 ₸")).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, 0);
      });
      const filename = `${name}-${viewport.name}.png`;
      const screenshot = path.join(destination, filename);
      await page.screenshot({
        path: screenshot,
        fullPage: true,
        animations: "disabled",
      });
      if (exportDirectory)
        await copyFile(screenshot, path.join(exportDirectory, filename));
    }
  }
  const targets = await page
    .locator(".bottom-nav a, .bottom-nav button")
    .evaluateAll((elements) =>
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
