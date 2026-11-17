import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { enterDemo, navigateSeller } from "./helpers";
import { login, mockServices, qaIds } from "./qa-fixtures";

const examples = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/research-examples.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const evidence = fileURLToPath(
  new URL("../../../docs/diploma-evidence/screenshots/", import.meta.url),
);

for (const width of [360, 390, 768, 1440]) {
  test(`explicit Demo RU/KZ at ${width}px without backend writes`, async ({
    page,
  }) => {
    const requests: string[] = [],
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (
        u.hostname !== "127.0.0.1" ||
        u.pathname.startsWith("/api/") ||
        u.pathname.startsWith("/__qa_supabase/")
      ) {
        requests.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await page.setViewportSize({ width, height: 900 });
    await enterDemo(page);
    await navigateSeller(page, "research");
    await expect(
      page.getByText(/Учебный пример · синтетические/),
    ).toBeVisible();
    await expect(page.locator(".research-chart")).toBeVisible();
    await page.getByLabel("Горизонт прогноза").selectOption("30");
    await expect(page.locator("#forecast")).toContainText("30 дней");
    await expect(
      page.getByRole("button", { name: "Отправить отзыв" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await mkdir(evidence, { recursive: true });
    if (width === 360 || width === 1440)
      await page.screenshot({
        path: `${evidence}/research-ru-${width}.png`,
        fullPage: true,
      });
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Болжам және кері байланыс" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Бұл — ережелер, оқытылған модель емес/),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width === 360 || width === 1440)
      await page.screenshot({
        path: `${evidence}/research-kk-${width}.png`,
        fullPage: true,
      });
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

async function researchServer(page: Page) {
  const auth = await mockServices(page);
  const state = {
    fail: false,
    forecasts: 0,
    posts: [] as Record<string, unknown>[],
    receipts: [] as Record<string, unknown>[],
  };
  await page.route("**/api/v1/businesses/*/research/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      business = url.pathname.split("/")[4];
    const resource = url.pathname.split("/")[6];
    if (resource === "forecast") {
      state.forecasts++;
      if (state.fail)
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "UNAVAILABLE",
              message: "private trace",
              fields: {},
            },
            request_id: qaIds.request,
          },
        });
      const horizon = Number(url.searchParams.get("horizon"));
      return route.fulfill({
        json:
          business === qaIds.shopA
            ? {
                ...examples[
                  horizon === 7 ? "ForecastSynthetic7" : "ForecastSynthetic30"
                ],
                business_id: business,
                provenance: "business_ledger",
              }
            : {
                ...examples.ForecastInsufficient,
                business_id: business,
                horizon,
                required_days: 84 + horizon * 2,
              },
      });
    }
    if (resource === "debt-risk")
      return route.fulfill({
        json: { ...examples.DebtRiskEmpty, business_id: business },
      });
    if (resource === "feedback" && request.method() === "POST") {
      const body = request.postDataJSON();
      state.posts.push(body);
      const receipt = {
        ...body,
        id: "80000000-0000-4000-8000-000000000001",
        created_at: "2026-10-24T05:00:00Z",
      };
      state.receipts.push(receipt);
      return route.fulfill({ status: 201, json: receipt });
    }
    if (resource === "feedback")
      return route.fulfill({
        json: {
          business_id: business,
          items: state.receipts,
          next_cursor: null,
        },
      });
    return route.abort();
  });
  return { state, auth };
}
test("live-contract failure/retry, insufficient other business and no stale graph", async ({
  page,
}) => {
  const { state, auth } = await researchServer(page);
  state.fail = true;
  await login(page);
  await navigateSeller(page, "research");
  await expect(page.locator("#forecast .error-state")).toBeVisible();
  expect(state.forecasts).toBe(1);
  await expect(page.getByText("private trace")).not.toBeVisible();
  state.fail = false;
  await page
    .locator("#forecast")
    .getByRole("button", { name: /Повторить/ })
    .click();
  await expect(page.locator(".research-chart")).toBeVisible();
  await page.getByLabel("Горизонт прогноза").selectOption("30");
  await expect(page.locator("#forecast")).toContainText("30 дней");
  await page.getByLabel("Торговая точка").selectOption(qaIds.shopA2);
  await expect(page.locator("#forecast")).toContainText("Недостаточно истории");
  await expect(page.locator(".research-chart")).toHaveCount(0);
  expect(auth.unexpected).toEqual([]);
});
test("feedback saves once and private review displays confirmed response", async ({
  page,
}) => {
  const { state, auth } = await researchServer(page);
  await login(page);
  await navigateSeller(page, "research");
  await page
    .getByLabel(/Что улучшить первым/)
    .fill("Тестовая оценка навигации");
  await page.getByLabel(/Согласен на описанную/).check();
  await page.getByRole("button", { name: "Отправить отзыв" }).click();
  await expect(page.getByText(/Ответ сохранён сервером/)).toBeVisible();
  expect(state.posts).toHaveLength(1);
  await page.getByText("Мои сохранённые ответы", { exact: true }).click();
  await page.getByRole("button", { name: "Загрузить мои ответы" }).click();
  await expect(page.locator("#feedback li")).toContainText(
    "Тестовая оценка навигации",
  );
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.locator("#feedback")).toHaveCount(0);
  expect(auth.unexpected).toEqual([]);
});
