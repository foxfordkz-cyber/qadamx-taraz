import { expect, test, type Page } from "@playwright/test";
import type { components } from "../src/shared/api/generated";

type Schemas = components["schemas"];
const idA = "22222222-2222-4222-8222-222222222222";
const idB = "55555555-5555-4555-8555-555555555555";
const venue: Schemas["VenueResponse"] = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "inquiry-fixture",
  name: "Тестовая площадка",
  address_label: "Synthetic",
  geometry_status: "conceptual",
  is_demo: true,
};
const shop = (id: string, suffix: string): Schemas["ShopResponse"] => ({
  id,
  venue_id: venue.id,
  slug: `inquiry-fixture-${suffix.toLowerCase()}`,
  name: `Учебный магазин ${suffix}`,
  category: "clothes",
  description: "Synthetic fixture",
  is_demo: true,
  catalog: [],
});
const receipt: Schemas["InquiryReceipt"] = {
  id: "33333333-3333-4333-8333-333333333333",
  created_at: "2026-10-17T10:00:00Z",
};
const entry = "/e2e/inquiry-harness.html?shop=inquiry-fixture-a";

async function fixtures(page: Page) {
  const state = {
    mode: "success" as "success" | "lost" | "reject" | "invalid" | "gate",
    shopStatus: 200,
    writes: [] as {
      id: string;
      body: Schemas["InquiryCreate"];
      auth?: string;
    }[],
    saved: new Map<string, Schemas["InquiryReceipt"]>(),
    release: null as (() => void) | null,
    unexpected: [] as string[],
  };
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4189") {
      state.unexpected.push(url.origin);
      return route.abort("blockedbyclient");
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (request.method() === "GET") {
      if (url.pathname === "/api/v1/venues")
        return route.fulfill({ json: { items: [venue], next_cursor: null } });
      if (
        url.pathname === "/api/v1/businesses/inquiry-fixture-a" ||
        url.pathname === "/api/v1/businesses/inquiry-fixture-b"
      ) {
        if (state.shopStatus !== 200)
          return route.fulfill({
            status: state.shopStatus,
            json: { error: { code: "NOT_FOUND" } },
          });
        return route.fulfill({
          json: url.pathname.endsWith("-a") ? shop(idA, "A") : shop(idB, "B"),
        });
      }
    }
    const match = url.pathname.match(
      /^\/api\/v1\/businesses\/([^/]+)\/inquiries$/,
    );
    if (request.method() === "POST" && match) {
      const body = request.postDataJSON() as Schemas["InquiryCreate"];
      state.writes.push({
        id: match[1],
        body,
        auth: request.headers().authorization,
      });
      if (state.mode === "reject")
        return route.fulfill({
          status: 422,
          json: { error: { code: "VALIDATION_ERROR" } },
        });
      const key = `${match[1]}:${body.client_request_id}`;
      state.saved.set(key, receipt);
      if (state.mode === "lost") return route.abort("failed");
      if (state.mode === "invalid")
        return route.fulfill({ json: { id: "", created_at: "" } });
      if (state.mode === "gate")
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      return route.fulfill({ json: state.saved.get(key) });
    }
    state.unexpected.push(`${request.method()} ${url.pathname}`);
    return route.abort("blockedbyclient");
  });
  return state;
}

async function fill(page: Page) {
  await page
    .getByLabel("Имя посетителя", { exact: true })
    .fill("Synthetic visitor");
  await page
    .getByLabel("Контакт", { exact: true })
    .fill("synthetic@example.test");
  await page
    .getByLabel("Сообщение", { exact: true })
    .fill("Synthetic browser inquiry");
}

for (const width of [360, 390, 768, 1440]) {
  test(`RU/KZ, empty catalog, keyboard and confirmed shop at ${width}px — component harness`, async ({
    page,
  }, info) => {
    const state = await fixtures(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(entry);
    await page.reload();
    await expect(page.getByTestId("catalog-count")).toHaveText("Товаров: 0");
    await expect(
      page.getByRole("heading", { name: "Заявка продавцу" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Отправить заявку", exact: true })
      .click();
    await expect(page.getByText("Заполните поле", { exact: true })).toHaveCount(
      3,
    );
    await expect(
      page.getByLabel("Имя посетителя", { exact: true }),
    ).toBeFocused();
    await fill(page);
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(page.getByLabel("Келушінің аты", { exact: true })).toHaveValue(
      "Synthetic visitor",
    );
    const button = page.getByRole("button", {
      name: "Өтінім жіберу",
      exact: true,
    });
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    for (const control of await page
      .locator(".inquiry-form input, .inquiry-form textarea")
      .all()) {
      expect(
        await control.evaluate((element) =>
          parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBeGreaterThanOrEqual(16);
    }
    expect(
      await page
        .getByLabel("Байланыс", { exact: true })
        .getAttribute("inputmode"),
    ).toBe("text");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`form-kk-${width}.png`),
      fullPage: true,
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Өтінім жіберілді", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Учебный магазин A");
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].id).toBe(idA);
    expect(state.writes[0].auth).toBeUndefined();
    expect(state.unexpected).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`success-kk-${width}.png`),
      fullPage: true,
    });
  });
}

test("lost response → explicit identical replay; no parallel click or early success", async ({
  page,
}, info) => {
  const state = await fixtures(page);
  state.mode = "lost";
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(entry);
  await fill(page);
  await page
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Результат отправки пока неизвестен",
  );
  await expect(page.getByLabel("Контакт", { exact: true })).toHaveValue(
    "synthetic@example.test",
  );
  await expect(page.getByLabel("Контакт", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page.screenshot({
    path: info.outputPath("unknown-ru-360.png"),
    fullPage: true,
  });
  state.mode = "gate";
  await page
    .getByRole("button", { name: "Повторить отправку", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Отправляем…", exact: true }),
  ).toBeDisabled();
  // Exercise two submissions directly as well as the disabled visible button.
  await page.locator(".inquiry-form form").evaluate((form) => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  expect(state.writes).toHaveLength(2);
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toHaveCount(0);
  await expect.poll(() => state.release !== null).toBe(true);
  state.release?.();
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toBeVisible();
  expect(state.writes[1]).toEqual(state.writes[0]);
  expect(state.saved.size).toBe(1); // Fixture behavior, not proof of server deduplication.
  expect(state.unexpected).toEqual([]);
});

test("422 keeps editable input; malformed success stays unknown", async ({
  page,
}) => {
  const state = await fixtures(page);
  state.mode = "reject";
  await page.goto(entry);
  await fill(page);
  await page
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Сервер отклонил данные заявки",
  );
  await expect(page.getByLabel("Контакт", { exact: true })).toBeEditable();
  await page
    .getByLabel("Сообщение", { exact: true })
    .fill("Corrected synthetic request");
  state.mode = "invalid";
  await page
    .getByRole("button", { name: "Повторить отправку", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Результат отправки пока неизвестен",
  );
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toHaveCount(0);
  expect(state.writes[1].body.message).toBe("Corrected synthetic request");
  expect(state.unexpected).toEqual([]);
});

test("shop B direct URL and reload preserve recipient; API rejection shows retry", async ({
  page,
}) => {
  const state = await fixtures(page);
  await page.goto(entry.replace("fixture-a", "fixture-b"));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Учебный магазин B" }),
  ).toBeVisible();
  await fill(page);
  await page
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Учебный магазин B");
  expect(state.writes[0].id).toBe(idB);
  state.shopStatus = 503;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Заявка продавцу" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Повторить", exact: true }),
  ).toBeVisible();
  state.shopStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Заявка продавцу" }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(1); // Reload/GET never resubmits an inquiry.
  expect(state.unexpected).toEqual([]);
});
