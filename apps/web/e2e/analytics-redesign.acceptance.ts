import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";
import { login, mockServices, qaIds } from "./qa-fixtures";
import { assistantDemo } from "../src/features/assistant/demo";
import {
  makeDemoAnalyticsSnapshot,
  DEMO_ANALYTICS_BUSINESS,
} from "../src/features/seller/analytics/demo";
import type { AssistantRequest } from "../src/features/assistant/model";

for (const locale of ["ru", "kk"] as const) {
  for (const width of [390, 1440]) {
    test(`screenshots ${locale} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await enterDemo(page);
      await navigateSeller(page, "analytics");
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      await expect(page.locator(".analytics-main-kpis")).toContainText(
        "74 000",
      );
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(width);
      const directory = path.resolve(
        process.env.QADAM_SCREENSHOT_ROOT ??
          "../../docs/screenshots/analytics-redesign",
      );
      await mkdir(directory, { recursive: true });
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: path.join(
          directory,
          `${process.env.ANALYTICS_CAPTURE_PHASE ?? "after"}-${locale}-${width}.png`,
        ),
        fullPage: true,
        animations: "disabled",
      });
    });
  }
}

for (const locale of ["ru", "kk"] as const) {
  test(`responsive demo and assistant focus ${locale}`, async ({ page }) => {
    const traffic: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/"))
        traffic.push(request.url());
    });
    await enterDemo(page);
    await navigateSeller(page, "analytics");
    await page
      .getByRole("button", { name: locale === "ru" ? "RU" : "KZ", exact: true })
      .click();
    await expect(page.locator(".analytics-period-answer")).toContainText(
      "74 000",
    );
    for (const width of [360, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fontSize of ["16px", "32px"]) {
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = size;
        }, fontSize);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
          .toBe(width);
        const heights = await page
          .locator(
            ".analytics-page .button:visible, .analytics-page summary:visible, .analytics-all-debts:visible",
          )
          .evaluateAll((elements) =>
            elements.map((element) => element.getBoundingClientRect().height),
          );
        expect(heights.every((height) => height >= 44)).toBe(true);
        await expect(page.locator(".analytics-period-answer")).toBeVisible();
      }
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "16px";
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".analytics-reminders button").first().click();
    const dialog = page.getByRole("dialog");
    const answer = dialog.locator(".assistant-result");
    await expect(answer).toBeFocused();
    await expect(dialog.locator(".assistant-reminder")).toContainText("18 000");
    await expect
      .poll(async () => (await answer.boundingBox())!.y)
      .toBeGreaterThanOrEqual(0);
    await expect
      .poll(async () => (await answer.boundingBox())!.y)
      .toBeLessThan(844);
    const answers = new Set<string>();
    for (const suggestion of await dialog
      .locator(".assistant-suggestions button")
      .all()) {
      await suggestion.click();
      await expect(answer).toBeFocused();
      answers.add(await answer.locator(".assistant-answer").innerText());
    }
    expect(answers.size).toBe(4);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.locator(".analytics-reminders button").first(),
    ).toBeFocused();
    expect(traffic).toEqual([]);
  });
}

test("live facts first, explicit AI, reminder panel and disabled response", async ({
  page,
}) => {
  const services = await mockServices(page);
  const calls: Array<AssistantRequest & { business: string }> = [];
  let disabled = false;
  await page.route("**/api/v1/businesses/*/analytics?*", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      json: {
        ...makeDemoAnalyticsSnapshot(
          DEMO_ANALYTICS_BUSINESS,
          Number(url.searchParams.get("days")) as 7 | 30,
        ),
        business_id: url.pathname.split("/").at(-2),
      },
    });
  });
  await page.route("**/api/v1/businesses/*/assistant", async (route) => {
    const request = route.request().postDataJSON() as AssistantRequest;
    const business = new URL(route.request().url()).pathname.split("/").at(-2)!;
    calls.push({ ...request, business });
    await route.fulfill(
      disabled
        ? { status: 404, json: { error: { code: "ASSISTANT_DISABLED" } } }
        : {
            json: {
              ...assistantDemo(DEMO_ANALYTICS_BUSINESS, request),
              business_id: business,
              source: request.ai ? "ai" : "facts",
            },
          },
    );
  });
  await login(page);
  await navigateSeller(page, "analytics");
  await expect(
    page.locator(".analytics-period-summary .assistant-source"),
  ).toHaveText("По данным сервера");
  expect(calls.every((call) => !call.ai)).toBe(true);
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await expect(page.locator(".analytics-period-answer")).toContainText(
    "300 000",
  );
  expect(calls.at(-1)).toMatchObject({ ai: false, days: 30 });
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(qaIds.shopA2);
  await expect.poll(() => calls.at(-1)?.business).toBe(qaIds.shopA2);
  expect(calls.at(-1)?.ai).toBe(false);
  await page.getByRole("button", { name: "Объяснить с AI" }).click();
  await expect(
    page.locator(".analytics-period-summary .assistant-source"),
  ).toHaveText("Ответ AI по вашим данным");
  expect(calls.filter((call) => call.ai)).toHaveLength(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".analytics-reminders button").first().click();
  await expect(
    page.getByRole("dialog").locator(".assistant-result"),
  ).toBeFocused();
  expect(calls.filter((call) => call.ai)).toHaveLength(2);
  expect(calls.at(-1)?.question).toBe(
    "Напиши напоминание о долге Асқар · павильон 12",
  );
  await page.keyboard.press("Escape");
  disabled = true;
  await page.locator(".analytics-period-switch button").nth(1).click();
  await expect(page.locator(".analytics-insights")).toHaveCount(0);
  await expect(page.locator(".analytics-main-kpis")).toBeVisible();
  expect(services.unexpected).toEqual([]);
});
