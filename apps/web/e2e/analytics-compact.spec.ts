import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";

async function openReport(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/__qa_supabase/")
    ) {
      throw new Error("Unexpected network request in isolated Demo");
    }
    await route.continue();
  });
  await enterDemo(page);
  await navigateSeller(page, "analytics");
  await expect(page.locator(".analytics-kpi")).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
}

async function wholeLabels(page: Page) {
  await expect
    .poll(() =>
      page.locator(".analytics-chart-scroll:visible").evaluateAll((charts) =>
        charts.every((chart) => {
          const outer = chart.getBoundingClientRect();
          const selected = chart
            .querySelector('[aria-pressed="true"]')!
            .getBoundingClientRect();
          const labels = [
            ...chart.querySelectorAll(".analytics-bar-label"),
          ].map((label) => label.getBoundingClientRect());
          return (
            selected.left >= outer.left - 1 &&
            selected.right <= outer.right + 1 &&
            labels.every(
              (label) =>
                label.right <= outer.left + 1 ||
                label.left >= outer.right - 1 ||
                (label.left >= outer.left - 1 &&
                  label.right <= outer.right + 1),
            )
          );
        }),
      ),
    )
    .toBe(true);
}

test("whole edge labels, grouped mobile scopes and keyboard survive RU/KZ, 7/30 and resize", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await openReport(page);
  for (const locale of ["RU", "KZ"]) {
    await page.getByRole("button", { name: locale, exact: true }).click();
    for (const days of [7, 30]) {
      await page
        .locator(".analytics-period-switch button")
        .nth(days === 7 ? 0 : 1)
        .click();
      await expect(page.locator(".analytics-daily-bars button")).toHaveCount(
        days,
      );
      await page.locator(".analytics-details > summary").click();
      for (const width of [1440, 768, 700, 390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        await wholeLabels(page);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
          .toBe(width);
        await expect(
          page.locator(".analytics-main-kpis .analytics-kpi:visible"),
        ).toHaveCount(3);
        await expect(page.locator(".analytics-kpi-top:visible")).toHaveCount(
          width <= 700 ? 3 : 6,
        );
        for (const bars of [
          ".analytics-daily-bars",
          ".analytics-hourly-bars",
        ]) {
          const selected = page.locator(`${bars} [aria-pressed="true"]`);
          await selected.focus();
          await selected.press("Home");
          await wholeLabels(page);
          await page.locator(`${bars} button`).first().press("End");
          await wholeLabels(page);
          await page.locator(`${bars} button`).last().press("ArrowLeft");
          await wholeLabels(page);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test("empty charts expand by keyboard and reset for another period or point", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openReport(page);
  await page.locator(".analytics-demo-panel select").selectOption("empty");
  const disclosure = page.locator(".analytics-details");
  await expect(disclosure).toBeVisible();
  await expect(
    page.locator(".analytics-chart-scroll").last(),
  ).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Новая продажа", exact: true }),
  ).toBeVisible();
  const toggle = disclosure.locator(":scope > summary");
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await toggle.focus();
  await toggle.press("Enter");
  await expect(page.locator(".analytics-chart-scroll").last()).toBeVisible();
  await wholeLabels(page);
  await toggle.press("Space");
  await expect(
    page.locator(".analytics-chart-scroll").last(),
  ).not.toBeVisible();
  await toggle.press("Enter");
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(30);
  await expect(disclosure).not.toHaveAttribute("open", "");
  await toggle.click();
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption("22222222-2222-4222-8222-222222222222");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(toggle).toHaveText("Толығырақ");
  await page.locator(".analytics-demo-panel select").selectOption("error");
  await expect(page.locator(".analytics-error")).toBeVisible();
  await expect(page.locator(".analytics-kpi, .analytics-details")).toHaveCount(
    0,
  );
});

test("capture compact analytics before/after on matching viewports", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const destination = path.resolve(
    process.env.QADAM_COMPACT_SHOTS ?? "./test-results/analytics-compact-shots",
  );
  await mkdir(destination, { recursive: true });
  const measurements: Record<string, unknown>[] = [];
  await openReport(page);
  async function capture(name: string) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    measurements.push({
      name,
      ...(await page.evaluate(() => ({
        width: innerWidth,
        height: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      }))),
    });
    await page.screenshot({
      path: path.join(destination, name + ".png"),
      fullPage: true,
      animations: "disabled",
    });
  }
  for (const locale of ["RU", "KZ"]) {
    await page.getByRole("button", { name: locale, exact: true }).click();
    for (const width of [1440, 768, 390, 360]) {
      await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
      await capture(`${locale.toLowerCase()}-${width}-7`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".analytics-demo-panel select").selectOption("empty");
    await expect(page.locator(".analytics-empty")).toBeVisible();
    await capture(`${locale.toLowerCase()}-390-empty`);
    await page.locator(".analytics-demo-panel select").selectOption("activity");
    await expect(page.locator(".analytics-daily-bars button")).toHaveCount(7);
    await expect(page.locator(".analytics-kpi-primary")).toContainText(
      "74 000 ₸",
    );
  }
  await writeFile(
    path.join(destination, "measurements.json"),
    JSON.stringify(measurements, null, 2) + "\n",
  );
});
