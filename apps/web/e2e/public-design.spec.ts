import { expect, test } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { components } from "../src/shared/api/generated";

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
  const destination = path.resolve(
    process.env.QADAM_SCREENSHOT_ROOT ?? "../../docs/screenshots",
    "team-mvp-design",
  );
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
      page.getByText("Тестовый рюкзак", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("15 000 ₸", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Заявка продавцу", exact: true }),
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
    await expect(page.getByText("Заполните поле", { exact: true })).toHaveCount(
      3,
    );
    await expect(
      page.getByRole("heading", { name: "Заявка отправлена", exact: true }),
    ).toHaveCount(0);
    await page
      .getByLabel("Имя посетителя", { exact: true })
      .fill("Әсел · тест");
    await page
      .getByLabel("Контакт", { exact: false })
      .fill("@playwright_fixture");
    await page
      .locator(".inq textarea")
      .fill("Это тест формы без отправки на сервер.");
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(page.getByLabel("Келушінің аты", { exact: true })).toHaveValue(
      "Әсел · тест",
    );
    await expect(
      page.getByRole("heading", { name: "Сатушыға өтінім", exact: true }),
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
