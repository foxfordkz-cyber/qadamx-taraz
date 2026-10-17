import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { components } from "../src/shared/api/generated";

type Schema = components["schemas"];
const seed = JSON.parse(
  readFileSync(
    new URL("../../../packages/contracts/demo-seed.json", import.meta.url),
    "utf8",
  ),
) as {
  tables: {
    venues: Schema["VenueResponse"][];
    businesses: Schema["PublicBusiness"][];
    catalog_items: Schema["CatalogResponse"][];
  };
};
const { venues, businesses, catalog_items: catalog } = seed.tables;
const shop = businesses[0];
const receipt = {
  id: "20000000-0000-4000-8000-000000000001",
  created_at: "2026-10-17T08:00:00Z",
};
const artifacts = fileURLToPath(
  new URL("./inquiry-artifacts/", import.meta.url),
);

// Actual router/ShopPage/3D/form, local contract fixtures only. No live writes,
// seller login or inbox simulation: these tests do not prove backend isolation.
async function isolate(
  page: Page,
  options: {
    empty?: boolean;
    longName?: string;
    onPost?: (route: Route) => Promise<void>;
    failShop?: () => boolean;
  } = {},
) {
  const posts: { path: string; body: Schema["InquiryCreate"] }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4192") return route.abort();
    if (!url.pathname.startsWith("/api/v1/")) return route.continue();
    if (request.method() === "POST" && url.pathname.endsWith("/inquiries")) {
      posts.push({ path: url.pathname, body: request.postDataJSON() });
      return options.onPost
        ? options.onPost(route)
        : route.fulfill({ status: 201, json: receipt });
    }
    if (request.method() !== "GET") return route.abort();
    if (url.pathname === "/api/v1/venues")
      return route.fulfill({ json: { items: venues, next_cursor: null } });
    if (url.pathname === "/api/v1/businesses")
      return route.fulfill({
        json: {
          items: businesses.filter(
            (b) =>
              !url.searchParams.has("venue_id") ||
              b.venue_id === url.searchParams.get("venue_id"),
          ),
          next_cursor: null,
        },
      });
    const b = businesses.find(
      (b) => url.pathname === `/api/v1/businesses/${b.slug}`,
    );
    if (!b || options.failShop?.())
      return route.fulfill({
        status: b ? 503 : 404,
        json: { error: { code: b ? "UNAVAILABLE" : "NOT_FOUND" } },
      });
    return route.fulfill({
      json: {
        ...b,
        name: options.longName ?? b.name,
        catalog: options.empty
          ? []
          : catalog.filter((i) => i.business_id === b.id),
      },
    });
  });
  return { posts, errors };
}

async function fill(page: Page) {
  const form = page.locator(".inquiry-form form");
  await form.locator('[name="visitor_name"]').fill("Synthetic visitor");
  await form.locator('[name="contact"]').fill("synthetic@example.test");
  await form
    .locator('[name="message"]')
    .fill("Synthetic inquiry — local intercepted API only");
}

for (const width of [360, 390, 1440]) {
  for (const lang of ["ru", "kk"] as const) {
    test(`direct shop, reload, empty catalog and keyboard confirmation ${lang} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const longName = "Учебный магазин Әсем · длинное название торговой точки";
      const { posts, errors } = await isolate(page, { empty: true, longName });
      await page.addInitScript(
        (locale) => localStorage.setItem("qadam.locale", locale),
        lang,
      );
      await page.goto(`/shops/${shop.slug}`);
      await expect(page.locator(".inquiry-form")).toContainText(longName);
      await page.reload();
      const form = page.locator(".inquiry-form form");
      await expect(form).toBeVisible();
      await page
        .getByRole("link", {
          name: lang === "ru" ? "Оставить заявку" : "Өтінім қалдыру",
        })
        .click();
      await page.keyboard.press("Tab");
      await expect(form.locator('[name="visitor_name"]')).toBeFocused();
      await form.getByRole("button").click();
      await expect(form.locator('[name="visitor_name"]')).toBeFocused();
      await fill(page);
      for (const input of await form.getByRole("textbox").all()) {
        expect(
          await input.evaluate((el) =>
            parseFloat(getComputedStyle(el).fontSize),
          ),
        ).toBeGreaterThanOrEqual(16);
      }
      expect(
        (await form.getByRole("button").boundingBox())!.height,
      ).toBeGreaterThanOrEqual(44);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await mkdir(artifacts, { recursive: true });
      if ((lang === "ru" && width !== 360) || (lang === "kk" && width === 360))
        await page.screenshot({
          path: `${artifacts}/form-${lang}-${width}.png`,
          fullPage: true,
        });
      await form.getByRole("button").focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".inquiry-form.inq--ok")).toBeFocused();
      await expect(page.locator(".inquiry-form")).toContainText(longName);
      await expect(page.locator(".inquiry-form")).toContainText(receipt.id);
      expect(posts).toHaveLength(1);
      expect(posts[0].path).toBe(`/api/v1/businesses/${shop.id}/inquiries`);
      await page.keyboard.press("Tab");
      await expect(page.locator(".inquiry-form button")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator('[name="visitor_name"]')).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
}

test("lost response followed by 422 keeps the original request through explicit retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let count = 0;
  const { posts } = await isolate(page, {
    onPost: async (route) => {
      count++;
      if (count === 1) return route.abort();
      if (count === 2)
        return route.fulfill({
          status: 422,
          json: { error: { code: "VALIDATION_ERROR" } },
        });
      return route.fulfill({ status: 201, json: receipt });
    },
  });
  await page.goto(`/shops/${shop.slug}`);
  await fill(page);
  await page.locator(".inquiry-form button").click();
  await expect(page.getByRole("alert")).toContainText("Не удалось подтвердить");
  await expect(page.locator('[name="contact"]')).toHaveValue(
    "synthetic@example.test",
  );
  await expect(page.locator('[name="contact"]')).toBeDisabled();
  await mkdir(artifacts, { recursive: true });
  await page
    .locator(".inquiry-form")
    .screenshot({ path: `${artifacts}/unknown-ru-390.png` });
  await page.getByRole("button", { name: "Повторить отправку" }).click();
  await expect.poll(() => posts.length).toBe(2);
  await expect(page.getByRole("alert")).toContainText("Не удалось подтвердить");
  await page.getByRole("button", { name: "Повторить отправку" }).click();
  await expect(page.locator(".inq--ok")).toBeFocused();
  expect(posts).toHaveLength(3);
  expect(posts[1]).toEqual(posts[0]);
  expect(posts[2]).toEqual(posts[0]);
  await page
    .locator(".inq--ok")
    .screenshot({ path: `${artifacts}/success-ru-390.png` });
});

test("unknown shop and API failure do not show an unrelated inquiry form", async ({
  page,
}) => {
  let fail = true;
  const { posts } = await isolate(page, { failShop: () => fail });
  await page.goto("/shops/unknown-inquiry-fixture");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".inquiry-form")).toHaveCount(0);
  await page.goto(`/shops/${shop.slug}`);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".inquiry-form")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: /Повторить/ }).click();
  await expect(page.locator(".inquiry-form")).toContainText(shop.name);
  expect(posts).toHaveLength(0);
});

test("all nine real GLB hotspots keep the API UUID as inquiry recipient", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const { posts, errors } = await isolate(page);
  for (const b of businesses) {
    const venue = venues.find((v) => v.id === b.venue_id)!;
    await page.goto(`/venues/${venue.slug}`);
    const marker = page.locator(`[data-hotspot="${b.slug}"]`);
    await expect(marker).toBeVisible({ timeout: 20_000 });
    await marker.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/shops/${b.slug}$`));
    await expect(page.locator(".inquiry-form")).toContainText(b.name);
    await fill(page);
    await page.locator(".inquiry-form button").click();
    await expect(page.locator(".inq--ok")).toBeVisible();
    expect(posts.at(-1)!.path).toBe(`/api/v1/businesses/${b.id}/inquiries`);
  }
  expect(posts).toHaveLength(9);
  expect(errors).toEqual([]);
});
