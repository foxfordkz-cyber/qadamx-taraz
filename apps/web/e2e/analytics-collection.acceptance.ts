import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";
import { login, mockServices } from "./qa-fixtures";
import {
  DEMO_ANALYTICS_BUSINESS,
  makeDemoAnalyticsSnapshot,
} from "../src/features/seller/analytics/demo";

const directory = path.resolve(
  "../../docs/screenshots/analytics-collection-aging",
);

for (const locale of ["ru", "kk"] as const) {
  for (const width of [390, 1440]) {
    test(`collection and aging screenshots ${locale} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await enterDemo(page);
      await navigateSeller(page, "analytics");
      await page
        .getByRole("button", {
          name: locale === "ru" ? "RU" : "KZ",
          exact: true,
        })
        .click();
      await expect(page.locator(".analytics-collected-value")).toHaveText(
        locale === "ru" ? "Собрано 69%" : "69% жиналды",
      );
      await expect(page.locator(".analytics-aging-list li")).toHaveCount(3);
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(width);
      const positions = await page
        .locator(
          ".analytics-insights, .analytics-collection-grid, .analytics-chart-card",
        )
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().top),
        );
      expect(positions[1]).toBeGreaterThan(positions[0]);
      expect(positions[2]).toBeGreaterThan(positions[1]);
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
      // Give the two cards room between the real sticky header and mobile nav.
      // This crop does not hide or restyle application elements.
      const cardHeight = (await page
        .locator(".analytics-collection-grid")
        .boundingBox())!.height;
      await page.setViewportSize({
        width,
        height: Math.max(1000, Math.ceil(cardHeight) + 280),
      });
      await page.locator(".analytics-collection-grid").evaluate((element) => {
        window.scrollTo(
          0,
          window.scrollY + element.getBoundingClientRect().top - 150,
        );
      });
      await page.locator(".analytics-collection-grid").screenshot({
        path: path.join(directory, `cards-${locale}-${width}.png`),
        animations: "disabled",
      });
    });
  }

  test(`collection stays readable at 200%, switches period and links to reminders in ${locale}`, async ({
    page,
  }) => {
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
    const collection = page.locator(".analytics-collection-card");
    const aging = page.locator(".analytics-aging-card");
    await expect(collection).toContainText("51 000 ₸");
    for (const width of [360, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const size of ["100%", "200%"]) {
        await page.evaluate((fontSize) => {
          document.documentElement.style.fontSize = fontSize;
        }, size);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
          .toBe(width);
        const boxes = await page
          .locator(".analytics-collection-grid [role=img]")
          .evaluateAll((elements) =>
            elements.map((element) => ({
              label: element.getAttribute("aria-label"),
              box: element.getBoundingClientRect().toJSON(),
            })),
          );
        expect(boxes).toHaveLength(4);
        expect(
          boxes.every(
            ({ label, box }) =>
              label?.includes("₸") && box.left >= 0 && box.right <= width,
          ),
        ).toBe(true);
        const button = await aging.getByRole("link").boundingBox();
        expect(button!.width).toBeGreaterThanOrEqual(44);
        expect(button!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "100%";
    });
    await page.locator(".analytics-period-switch button").nth(1).click();
    await expect(page.locator(".analytics-collected-value")).toContainText(
      "89%",
    );
    await expect(collection).toContainText("300 000 ₸");
    await expect(collection).toContainText("268 000 ₸");
    await expect(aging).toContainText("23 000 ₸");
    await aging.getByRole("link").click();
    await expect(page.locator(".analytics-reminders h2")).toBeFocused();
    const heading = (await page
      .locator(".analytics-reminders h2")
      .boundingBox())!;
    const banner = (await page.getByRole("banner").boundingBox())!;
    expect(heading.y).toBeGreaterThanOrEqual(banner.y + banner.height);
    expect(page.url()).toContain("/seller/analytics");
    await page.setViewportSize({ width: 390, height: 1000 });
    await aging.getByRole("link").click();
    await expect(page).toHaveURL(/\/seller\/debts$/);
    expect(traffic).toEqual([]);
  });
}

test("new API fields are independent, legacy null/missing fields hide cards, zero data is explicit", async ({
  page,
}) => {
  const services = await mockServices(page);
  let mode: "full" | "null" | "missing" | "collection" | "aging" | "empty" =
    "full";
  await page.route("**/api/v1/businesses/*/assistant", (route) =>
    route.fulfill({
      status: 404,
      json: { error: { code: "ASSISTANT_DISABLED" } },
    }),
  );
  await page.route("**/api/v1/businesses/*/analytics?*", (route) => {
    const url = new URL(route.request().url());
    const snapshot = makeDemoAnalyticsSnapshot(
      DEMO_ANALYTICS_BUSINESS,
      Number(url.searchParams.get("days")) as 7 | 30,
      mode === "empty" ? "empty" : "activity",
    );
    snapshot.business_id = url.pathname.split("/").at(-2)!;
    if (mode === "null" || mode === "aging") snapshot.collection = null;
    if (mode === "null" || mode === "collection") snapshot.debt_aging = null;
    if (mode === "missing") {
      delete snapshot.collection;
      delete snapshot.debt_aging;
    }
    return route.fulfill({ json: snapshot });
  });
  await login(page);
  await navigateSeller(page, "analytics");
  await expect(page.locator(".analytics-collection-card")).toBeVisible();
  await expect(page.locator(".analytics-aging-card")).toBeVisible();
  await expect(page.locator(".analytics-insights")).toHaveCount(0);
  let days = 7;
  for (const next of [
    "null",
    "missing",
    "collection",
    "aging",
    "empty",
  ] as const) {
    mode = next;
    days = days === 7 ? 30 : 7;
    await page
      .locator(".analytics-period-switch button")
      .nth(days === 7 ? 0 : 1)
      .click();
    await expect(page.locator(".analytics-main-kpis")).toBeVisible();
    await expect(page.locator(".analytics-collection-card")).toHaveCount(
      next === "collection" || next === "empty" ? 1 : 0,
    );
    await expect(page.locator(".analytics-aging-card")).toHaveCount(
      next === "aging" || next === "empty" ? 1 : 0,
    );
  }
  await expect(
    page.getByText("За период продаж не было", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Открытых долгов нет", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".analytics-collection-grid [role=img]"),
  ).toHaveCount(0);
  expect(services.unexpected).toEqual([]);
});
