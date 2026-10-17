import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";
import { login, mockServices, qaIds } from "./qa-fixtures";
import type { components } from "../src/shared/api/generated";
const analyticsExamples = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/analytics-examples.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<
  "empty" | "sale_and_repayment",
  Required<components["schemas"]["AnalyticsResponse"]>
>;

// Published API 0.6.0 examples, intercepted in tests only. No live database.
function liveFixture(businessId: string, days: 7 | 30) {
  const sample = structuredClone(
    businessId === qaIds.shopA
      ? analyticsExamples.sale_and_repayment
      : analyticsExamples.empty,
  );
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(sample.period_to + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const value = date.toISOString().slice(0, 10);
    return (
      sample.daily.find((row) => row.date === value) ?? {
        date: value,
        sales_minor: 0,
        receipts_minor: 0,
        sales_count: 0,
        is_partial: false,
      }
    );
  });
  return {
    ...sample,
    business_id: businessId,
    days,
    timezone: "Asia/Almaty",
    currency: "KZT",
    today_incomplete: true,
    period_from: daily[0].date,
    daily,
  } satisfies components["schemas"]["AnalyticsResponse"];
}

async function interceptLiveAnalytics(page: Page) {
  const state = {
    status: 200,
    calls: [] as { business: string; days: number; subject: string }[],
  };
  await page.route("**/api/v1/businesses/*/analytics?*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const business = url.pathname.split("/")[4];
    const days = Number(url.searchParams.get("days"));
    const authorization = request.headers().authorization;
    const subject = authorization
      ? (
          JSON.parse(
            Buffer.from(authorization.split(".")[1], "base64url").toString(
              "utf8",
            ),
          ) as { sub: string }
        ).sub
      : "";
    state.calls.push({ business, days, subject });
    const allowed =
      subject === qaIds.a
        ? [qaIds.shopA, qaIds.shopA2]
        : subject === qaIds.b
          ? [qaIds.shopB]
          : [];
    const status = !subject
      ? 401
      : !allowed.includes(business)
        ? 404
        : ![7, 30].includes(days)
          ? 422
          : state.status;
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(
        status === 200
          ? liveFixture(business, days as 7 | 30)
          : {
              error: {
                code: status === 401 ? "AUTH_REQUIRED" : "DATABASE_UNAVAILABLE",
                message: "Synthetic Analytics fault",
                fields: {},
              },
              request_id: qaIds.request,
            },
      ),
    });
  });
  return state;
}

async function demoReport(page: Page) {
  const traffic: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/__qa_supabase/")
    ) {
      traffic.push(route.request().method() + " " + url.pathname);
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  await enterDemo(page);
  await navigateSeller(page, "analytics");
  await expect(page.locator(".analytics-kpis")).toBeVisible();
  await expect(
    page.getByText("Demo · синтетическая аналитика", { exact: true }),
  ).toBeVisible();
  return traffic;
}

async function noPageOverflow(page: Page, width: number) {
  const size = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(size.document).toBeLessThanOrEqual(width);
  expect(size.body).toBeLessThanOrEqual(width);
}

for (const width of [360, 390, 768, 1440]) {
  test(
    "Analytics fits " + width + "px; 7/30 days, tables and touch values",
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const traffic = await demoReport(page);
      const daily = page.locator(".analytics-daily-bars");
      const hourly = page.locator(".analytics-hourly-bars");
      await expect(daily.getByRole("button")).toHaveCount(7);
      await expect(hourly.getByRole("button")).toHaveCount(24);
      await expect(page.locator(".analytics-kpi")).toHaveCount(6);
      const targets = await page
        .locator(
          ".analytics-bar-button, .analytics-report-links a, .analytics-period-switch button",
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const { width, height } = element.getBoundingClientRect();
            return { width, height };
          }),
        );
      expect(
        targets.every(({ width, height }) => width >= 44 && height >= 44),
      ).toBe(true);
      await expect(page.locator(".analytics-kpi-primary")).toHaveCSS(
        "background-color",
        "rgb(22, 76, 62)",
      );
      await noPageOverflow(page, width);
      await page.getByRole("button", { name: "30 дней", exact: true }).click();
      await expect(daily.getByRole("button")).toHaveCount(30);
      await expect(page.locator(".analytics-kpis")).toContainText("300 000 ₸");
      await expect(page.locator(".analytics-kpis")).toContainText("35 000 ₸");
      await noPageOverflow(page, width);
      const first = daily.getByRole("button").first();
      await first.focus();
      await expect(first).toBeFocused();
      await first.press("ArrowRight");
      await expect(daily.getByRole("button").nth(1)).toBeFocused();
      await daily.getByRole("button").nth(1).press("End");
      await expect(daily.getByRole("button").last()).toBeFocused();
      await expect(page.locator(".analytics-selection").first()).toContainText(
        "Сегодня — неполный день",
      );
      await hourly.getByRole("button").nth(15).click();
      await expect(page.locator(".analytics-hour-selection")).toContainText(
        "15:00",
      );
      await expect(page.locator(".analytics-hour-selection")).toContainText(
        "16",
      );
      await expect(page.locator(".analytics-hour-selection")).not.toContainText(
        "₸",
      );
      const summary = page.locator(".analytics-table-details summary").first();
      await summary.focus();
      await summary.press("Enter");
      const table = page.getByRole("table", {
        name: "Действующие продажи и поступления по дням",
      });
      await expect(table.getByRole("row")).toHaveCount(31);
      await expect(table.getByRole("columnheader")).toHaveCount(4);
      await page.locator(".analytics-table-scroll").first().focus();
      await expect(
        page.locator(".analytics-table-scroll").first(),
      ).toBeFocused();
      await page.locator(".analytics-table-details summary").nth(1).click();
      await expect(
        page
          .getByRole("table", {
            name: "Зарегистрированные действующие продажи по часам",
          })
          .getByRole("row"),
      ).toHaveCount(25);
      await noPageOverflow(page, width);
      expect(traffic).toEqual([]);
    },
  );
}

test("negative receipts, RU/KZ, reduced motion and no financial writes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const traffic = await demoReport(page);
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(page.locator(".analytics-selection-date").first()).toContainText(
    "16 қазан",
  );
  await expect(
    page.locator(".analytics-daily-bars button").last(),
  ).toContainText("16 қаз.");
  await expect(
    page.getByRole("heading", { name: "Менің сауда нүктемнің аналитикасы" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "30 күн", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await page
    .getByLabel("Учебный сценарий", { exact: true })
    .selectOption("reversal");
  await expect(page.locator(".analytics-kpis")).toContainText("-1 000 ₸");
  await expect(page.locator(".analytics-kpis")).toContainText("Нет продаж");
  await page.getByRole("button", { name: "Поступления", exact: true }).click();
  await page.locator(".analytics-daily-bars button").last().click();
  await expect(page.locator(".analytics-selection").first()).toContainText(
    "-1 000 ₸",
  );
  const motion = await page
    .locator(".analytics-bar")
    .first()
    .evaluate((bar) => ({
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: getComputedStyle(bar).animationDuration,
    }));
  expect(motion.reduced).toBe(true);
  expect(
    motion.duration.split(",").every((value) => parseFloat(value) === 0),
  ).toBe(true);
  await noPageOverflow(page, 390);
  expect(traffic).toEqual([]);
});

test("empty allowed business hides the earlier report immediately, then retry recovers a Demo error", async ({
  page,
}) => {
  const traffic = await demoReport(page);
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption("22222222-2222-4222-8222-222222222222");
  await expect(page.locator(".analytics-kpis")).not.toContainText("74 000 ₸");
  await expect(
    page.getByRole("heading", {
      name: "Нет действующих продаж и чистых поступлений",
    }),
  ).toBeVisible();
  await expect(page.locator(".analytics-kpis")).toContainText("Нет продаж");
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(7);
  await expect(page.locator(".analytics-hourly-bars button")).toHaveCount(24);
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption("11111111-1111-4111-8111-111111111111");
  await expect(page.locator(".analytics-kpis")).toContainText("74 000 ₸");
  await page
    .getByLabel("Учебный сценарий", { exact: true })
    .selectOption("error");
  await expect(
    page.getByRole("heading", { name: "Не удалось загрузить данные" }),
  ).toBeVisible();
  await expect(page.locator(".analytics-error")).toContainText(
    "Учебный сбой загрузки, а не ответ сервера.",
  );
  await expect(page.locator(".analytics-kpis")).toHaveCount(0);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.locator(".analytics-kpis")).toContainText("74 000 ₸");
  expect(traffic).toEqual([]);
});

test("published Analytics API uses Bearer, period and permitted business without Demo fallback", async ({
  page,
}) => {
  const state = await mockServices(page);
  const analytics = await interceptLiveAnalytics(page);
  await login(page, "a");
  await navigateSeller(page, "analytics");
  await expect(page.locator(".analytics-kpis")).toContainText("3 000 ₸");
  await expect(page.locator(".analytics-demo-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(30);
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(qaIds.shopA2);
  await expect(page.locator(".analytics-business")).toContainText(
    "QA Кайкармет",
  );
  await expect(page.locator(".analytics-kpis")).not.toContainText("3 000 ₸");
  await expect(page.locator(".analytics-kpis")).toContainText("Нет продаж");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "b");
  await navigateSeller(page, "analytics");
  await expect(page.locator(".analytics-business")).toContainText(
    "QA Ауыл Береке",
  );
  await expect(page.locator(".analytics-kpis")).toContainText("Нет продаж");
  await expect(page.locator(".analytics-kpis")).not.toContainText("3 000 ₸");
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  expect(analytics.calls).toEqual(
    expect.arrayContaining([
      { business: qaIds.shopA, days: 7, subject: qaIds.a },
      { business: qaIds.shopA, days: 30, subject: qaIds.a },
      { business: qaIds.shopA2, days: 7, subject: qaIds.a },
      { business: qaIds.shopB, days: 7, subject: qaIds.b },
    ]),
  );
  expect(
    state.calls.filter(
      (call) => call.method === "POST" && call.path.startsWith("/api/"),
    ),
  ).toEqual([]);
  expect(state.unexpected).toEqual([]);
});

test("Live API failure keeps an explicit retry without synthetic financial data", async ({
  page,
}) => {
  const state = await mockServices(page);
  const analytics = await interceptLiveAnalytics(page);
  analytics.status = 503;
  await login(page);
  await navigateSeller(page, "analytics");
  await expect(
    page.getByRole("heading", { name: "Не удалось загрузить данные" }),
  ).toBeVisible();
  await expect(page.locator(".analytics-kpis")).toHaveCount(0);
  await expect(
    page.locator(".analytics-summary, .analytics-empty"),
  ).toHaveCount(0);
  await expect(page.locator(".analytics-demo-panel")).toHaveCount(0);
  expect(analytics.calls).toHaveLength(1);
  analytics.status = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.locator(".analytics-kpis")).toContainText("3 000 ₸");
  expect(analytics.calls).toHaveLength(2);
  expect(state.unexpected).toEqual([]);
});

test("direct route/reload show the active membership and links add no period filters or writes", async ({
  page,
}) => {
  const state = await mockServices(page);
  const analytics = await interceptLiveAnalytics(page);
  await login(page);
  await page.goto("/seller/analytics");
  await expect(page.locator(".analytics-kpi")).toHaveCount(6);
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(30);
  await page
    .getByRole("link", { name: "Открыть историю", exact: true })
    .click();
  await expect(page).toHaveURL(/\/seller\/history$/);
  await page.goBack();
  await expect(page.locator(".analytics-kpi")).toHaveCount(6);
  await page.getByRole("link", { name: "Открыть долги", exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/debts$/);
  await page.goto("/seller/analytics");
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(qaIds.shopA2);
  await expect(page.locator(".analytics-empty")).toBeVisible();
  await page.reload();
  // BusinessProvider intentionally keeps selection in memory; a reload chooses
  // the first /me membership. The report must match that visible selection.
  await expect(page.getByLabel("Торговая точка", { exact: true })).toHaveValue(
    qaIds.shopA,
  );
  await expect(page.locator(".analytics-business")).toContainText("QA MART");
  await expect(page.locator(".analytics-kpis")).toContainText("3 000 ₸");
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(qaIds.shopA2);
  await expect(page.locator(".analytics-summary")).not.toContainText("3 000 ₸");
  await expect(page.locator(".analytics-empty")).toBeVisible();
  await page.getByRole("link", { name: "Новая продажа", exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/sale$/);
  await expect(page.getByLabel("Торговая точка", { exact: true })).toHaveValue(
    qaIds.shopA2,
  );
  expect(analytics.calls.at(-1)?.business).toBe(qaIds.shopA2);
  expect(
    state.calls.filter(
      (call) => call.method === "POST" && call.path.startsWith("/api/"),
    ),
  ).toEqual([]);
});

test("capture genuine desktop/mobile Analytics states with explicit synthetic labels", async ({
  page,
}) => {
  const destination = path.resolve(
    process.env.QADAM_SCREENSHOT_ROOT ?? "../../docs/screenshots",
    "seller-analytics",
  );
  await mkdir(destination, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const traffic = await demoReport(page);
  async function capture(filename: string) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(destination, filename + ".png"),
      fullPage: true,
      animations: "disabled",
    });
  }
  await capture("analytics-desktop-7");
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(30);
  await capture("analytics-desktop-30");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.locator(".analytics-chart-scroll").evaluateAll((charts) =>
        charts.every((chart) => {
          const selected = chart.querySelector('[aria-pressed="true"]');
          if (!selected) return false;
          const outer = chart.getBoundingClientRect();
          const inner = selected.getBoundingClientRect();
          return inner.left >= outer.left - 1 && inner.right <= outer.right + 1;
        }),
      ),
    )
    .toBe(true);
  await capture("analytics-mobile-30");
  await page.getByRole("button", { name: "7 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(7);
  await capture("analytics-mobile-7");
  await page
    .getByLabel("Учебный сценарий", { exact: true })
    .selectOption("empty");
  await expect(
    page.getByRole("heading", {
      name: "Нет действующих продаж и чистых поступлений",
    }),
  ).toBeVisible();
  await capture("analytics-mobile-empty");
  await page
    .getByLabel("Учебный сценарий", { exact: true })
    .selectOption("error");
  await expect(
    page.getByRole("heading", { name: "Не удалось загрузить данные" }),
  ).toBeVisible();
  await capture("analytics-mobile-error");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("analytics-desktop-error");
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.locator(".analytics-kpi")).toHaveCount(6);
  await page
    .getByLabel("Учебный сценарий", { exact: true })
    .selectOption("reversal");
  await page.getByRole("button", { name: "Поступления", exact: true }).click();
  await expect(page.locator(".analytics-negative-label")).toContainText(
    "-1 000 ₸",
  );
  await capture("analytics-desktop-negative");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await noPageOverflow(page, 360);
  await capture("analytics-mobile-kk-negative");
  expect(traffic).toEqual([]);
});
