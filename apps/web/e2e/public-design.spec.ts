import { expect, test } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { components } from "../src/shared/api/generated";
import demoSeed from "../../../packages/contracts/demo-seed.json" with { type: "json" };
import venueManifest from "../public/venue-assets.json" with { type: "json" };

type Schemas = components["schemas"];
const venue: Schemas["VenueResponse"] = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "design-fixture-venue",
  name: "Тестовая площадка · API stub",
  address_label: "Контрактная фикстура Playwright",
  geometry_status: "conceptual",
  is_demo: true,
};
const business: Schemas["PublicBusiness"] = {
  id: "22222222-2222-4222-8222-222222222222",
  venue_id: venue.id,
  slug: "design-fixture-shop",
  name: "Тестовый магазин · API stub",
  category: "clothes",
  description:
    "Контрактная фикстура Playwright. Живой backend не используется.",
  is_demo: true,
};
const shop: Schemas["ShopResponse"] = {
  ...business,
  catalog: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      business_id: business.id,
      name: "Тестовый рюкзак",
      price_minor: 1500000,
      available: true,
      is_demo: true,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      business_id: business.id,
      name: "Учебная корзина для дома",
      price_minor: null,
      available: false,
      is_demo: true,
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      business_id: business.id,
      name: "Учебный набор с длинным названием для проверки переноса строк",
      price_minor: 250005,
      available: true,
      is_demo: true,
    },
  ],
};

test("public venue/shop/catalog/inquiry routes and WebGL fallback — intercepted OpenAPI fixtures only", async ({
  page,
}) => {
  test.setTimeout(60000);
  const unexpected: string[] = [];
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    // Exercise the supported list fallback deterministically, without a GPU.
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        context: string,
        ...args: unknown[]
      ) {
        if (
          context === "webgl" ||
          context === "webgl2" ||
          context === "experimental-webgl"
        )
          return null;
        return Reflect.apply(original, this, [context, ...args]);
      },
    });
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
      return;
    }
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${url.pathname}`);
      await route.abort();
      return;
    }
    let json: unknown;
    if (url.pathname === "/api/v1/venues")
      json = { items: [venue], next_cursor: null };
    else if (url.pathname === "/api/v1/businesses")
      json = { items: [business], next_cursor: null };
    else if (url.pathname === `/api/v1/businesses/${business.slug}`)
      json = shop;
    else {
      unexpected.push(url.pathname);
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      json,
    });
  });
  await page.route("**/venue-assets.json", (route) =>
    route.fulfill({
      status: 200,
      json: { schema_version: 1, venues: [] },
    }),
  );
  const destination = path.resolve("../../docs/screenshots/team-mvp-design");
  const exportDirectory = process.env.QADAM_SCREENSHOT_OUTPUT;
  await mkdir(destination, { recursive: true });
  if (exportDirectory) await mkdir(exportDirectory, { recursive: true });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Найдите магазин на рынке Тараза",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "WebGL недоступен — 3D отключено. Карточки ниже работают как обычно.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Кабинет продавца", exact: true }),
    ).toHaveAttribute("href", "/seller");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440) {
      const filename = `public-home-api-stub-${width === 390 ? "mobile" : "desktop"}.png`;
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.screenshot({
        path: path.join(destination, filename),
        fullPage: true,
        animations: "disabled",
      });
      if (exportDirectory)
        await copyFile(
          path.join(destination, filename),
          path.join(exportDirectory, filename),
        );
    }
    await page.locator(`a[href="/venues/${venue.slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/venues/${venue.slug}$`));
    await expect(
      page.getByRole("heading", { name: venue.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "WebGL недоступен — 3D отключено. Карточки ниже работают как обычно.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.locator(`a[href="/shops/${business.slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/shops/${business.slug}$`));
    await expect(
      page.getByRole("heading", { name: business.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Учебный магазин", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("На площадке: Тестовая площадка · API stub"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Оставить заявку", exact: false }),
    ).toHaveAttribute("href", "#inquiry");
    await expect(
      page.getByRole("img", { name: "Фото магазина пока нет" }),
    ).toBeVisible();
    await expect(
      page.getByText("Тестовый рюкзак", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("15 000 ₸", { exact: true })).toBeVisible();
    await expect(page.getByText("Доступен", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Недоступен", { exact: true })).toBeVisible();
    await expect(page.getByText("Уточнить", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Оставить заявку", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440) {
      const filename = `public-shop-api-stub-${width === 390 ? "mobile" : "desktop"}.png`;
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.screenshot({
        path: path.join(destination, filename),
        fullPage: true,
        animations: "disabled",
      });
      if (exportDirectory)
        await copyFile(
          path.join(destination, filename),
          path.join(exportDirectory, filename),
        );
    }
    await page
      .getByRole("button", { name: "Отправить заявку", exact: true })
      .click();
    await expect(
      page.getByText("Обязательное поле", { exact: true }),
    ).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "Заявка отправлена:", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("link", { name: "Оставить заявку", exact: false })
      .click();
    await expect(page).toHaveURL(/#inquiry$/);
    await page.getByLabel("Ваше имя", { exact: false }).fill("Әсел · тест");
    await page
      .getByLabel("Как с вами связаться", { exact: false })
      .fill("@playwright_fixture");
    await page
      .locator(".inq textarea")
      .fill("Это тест формы без отправки на сервер.");
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(page.getByLabel("Атыңыз", { exact: false })).toHaveValue(
      "Әсел · тест",
    );
    await expect(
      page.getByRole("heading", { name: "Өтінім қалдыру", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "RU", exact: true }).click();
    await page.getByRole("link", { name: /Назад/ }).click();
    await expect(page).toHaveURL(new RegExp(`/venues/${venue.slug}$`));
  }
  await page.goto("/");
  await page
    .getByRole("link", { name: "Кабинет продавца", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(unexpected).toEqual([]);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("all nine seeded shop routes and inquiry target IDs stay bound to their venue", async ({
  page,
}) => {
  test.setTimeout(90000);
  const venues = demoSeed.tables.venues as Schemas["VenueResponse"][];
  const businesses = demoSeed.tables.businesses as Schemas["PublicBusiness"][];
  const catalog = demoSeed.tables.catalog_items as Schemas["CatalogResponse"][];
  const postTargets: string[] = [];
  const postBodies: unknown[] = [];
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        context: string,
        ...args: unknown[]
      ) {
        if (
          context === "webgl" ||
          context === "webgl2" ||
          context === "experimental-webgl"
        )
          return null;
        return Reflect.apply(original, this, [context, ...args]);
      },
    });
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }
    if (url.pathname === "/api/v1/venues") {
      await route.fulfill({
        status: 200,
        json: { items: venues, next_cursor: null },
      });
      return;
    }
    if (url.pathname === "/api/v1/businesses" && request.method() === "GET") {
      const venueId = url.searchParams.get("venue_id");
      const items = venueId
        ? businesses.filter((shop) => shop.venue_id === venueId)
        : businesses;
      await route.fulfill({ status: 200, json: { items, next_cursor: null } });
      return;
    }
    const slug = url.pathname.split("/").at(-1);
    const business = businesses.find((shop) => shop.slug === slug);
    if (request.method() === "GET" && business) {
      await route.fulfill({
        status: 200,
        json: {
          ...business,
          catalog: catalog.filter((item) => item.business_id === business.id),
        },
      });
      return;
    }
    const businessId = url.pathname.split("/").at(-2);
    const inquiryBusiness = businesses.find((shop) => shop.id === businessId);
    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/inquiries") &&
      inquiryBusiness
    ) {
      postTargets.push(url.pathname);
      postBodies.push(request.postDataJSON());
      await route.fulfill({
        status: 200,
        json: {
          id: "66666666-6666-4666-8666-666666666666",
          created_at: "2026-10-17T09:00:00Z",
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: "Fixture not found" } });
  });
  await page.route("**/venue-assets.json", (route) =>
    route.fulfill({ status: 200, json: venueManifest }),
  );

  for (const venue of venues) {
    const venueShops = businesses.filter((shop) => shop.venue_id === venue.id);
    await page.goto(`/venues/${venue.slug}`);
    await expect(page.getByRole("heading", { name: venue.name })).toBeVisible();
    for (const business of venueShops) {
      await expect(
        page.locator(`a[href="/shops/${business.slug}"]`),
      ).toBeVisible();
      await page.locator(`a[href="/shops/${business.slug}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/shops/${business.slug}$`));
      await expect(
        page.getByRole("heading", { name: business.name, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(`На площадке: ${venue.name}`, { exact: true }),
      ).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole("heading", { name: business.name, exact: true }),
      ).toBeVisible();
      await page
        .getByLabel("Ваше имя", { exact: false })
        .fill("Тестовый покупатель");
      await page
        .getByLabel("Как с вами связаться", { exact: false })
        .fill("test@example.test");
      await page
        .locator(".inq textarea")
        .fill("Тестовая заявка без реального API.");
      await page.getByRole("button", { name: "Отправить заявку" }).click();
      await expect(
        page.getByText("Заявка отправлена:", { exact: true }),
      ).toBeVisible();
      expect(postTargets.at(-1)).toBe(
        `/api/v1/businesses/${business.id}/inquiries`,
      );

      await page.goto(`/venues/${venue.slug}`);
    }
  }

  expect(postTargets).toHaveLength(9);
  expect(postBodies).toHaveLength(9);
  for (let index = 0; index < postBodies.length; index += 1) {
    const body = postBodies[index];
    if (typeof body !== "object" || body === null || Array.isArray(body))
      throw new Error("Inquiry request must be a JSON object");
    expect(Object.keys(body).sort()).toEqual(
      ["client_request_id", "contact", "message", "visitor_name"].sort(),
    );
    expect(body).toMatchObject({
      visitor_name: "Тестовый покупатель",
      contact: "test@example.test",
      message: "Тестовая заявка без реального API.",
    });
    expect(body).not.toHaveProperty("product_id");
  }
});

test("shop direct route shows truthful empty/error states and retries the API", async ({
  page,
}) => {
  const attempts = new Map<string, number>();
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
      return;
    }
    if (url.pathname === "/api/v1/venues") {
      await route.fulfill({
        status: 200,
        json: { items: [venue], next_cursor: null },
      });
      return;
    }
    const slug = url.pathname.split("/").at(-1);
    if (slug === business.slug) {
      const count = (attempts.get(slug) ?? 0) + 1;
      attempts.set(slug, count);
      if (count <= 2) {
        await route.fulfill({
          status: 503,
          json: {
            error: { code: "DATABASE_UNAVAILABLE", fields: {} },
            request_id: "77777777-7777-4777-8777-777777777777",
          },
        });
      } else {
        await route.fulfill({
          status: 200,
          json: { ...business, is_demo: false, catalog: [] },
        });
      }
      return;
    }
    await route.fulfill({
      status: 404,
      json: {
        error: { code: "NOT_FOUND", fields: {} },
        request_id: "88888888-8888-4888-8888-888888888888",
      },
    });
  });

  await page.goto(`/shops/${business.slug}`);
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось загрузить данные",
  );
  await page.getByRole("button", { name: /Повторить/ }).click();
  await expect(
    page.getByRole("heading", { name: business.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Каталог пока не добавлен. Вы можете уточнить детали у продавца.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Учебный магазин", { exact: true })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.goto("/shops/unknown-shop-slug");
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось загрузить данные",
  );
  expect(attempts.get(business.slug)).toBeGreaterThanOrEqual(3);
});
