import { expect, test, type Page } from "@playwright/test";
import { login, mockServices, qaIds } from "./qa-fixtures";

// Every Auth/API response is synthetic. External requests are blocked by mockServices.
async function setup(page: Page) {
  const services = await mockServices(page);
  const state = {
    items: [] as ReturnType<typeof operation>[],
    next: null as string | null,
    status: 200,
    gate: null as Promise<void> | null,
    calls: [] as string[],
  };
  await page.route("**/api/v1/businesses/*/summary?*", (route) =>
    route.fulfill({
      json: {
        sales_minor: 0,
        receipts_minor: 0,
        outstanding_minor: 0,
        new_inquiries_count: 0,
      },
    }),
  );
  await page.route("**/api/v1/businesses/*/operations?*", async (route) => {
    expect(route.request().method()).toBe("GET");
    state.calls.push(new URL(route.request().url()).search);
    if (state.gate) await state.gate;
    await route.fulfill({
      status: state.status,
      json:
        state.status === 200
          ? { items: state.items, next_cursor: state.next }
          : {
              error: {
                code: "UNAVAILABLE",
                message: "Synthetic error",
                fields: {},
              },
              request_id: qaIds.request,
            },
    });
  });
  await login(page);
  await expect(page).toHaveURL(/\/seller$/);
  return { state, services };
}
function operation() {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    business_id: qaIds.shopA,
    customer_id: qaIds.customer,
    sale_id: "30000000-0000-4000-8000-000000000002",
    kind: "sale",
    sales_delta_minor: 450000,
    receipts_delta_minor: 200000,
    reversal_of: null,
    description: "Учебная продажа",
    created_at: "2026-10-17T08:00:00Z",
    created_by: qaIds.a,
  };
}

for (const path of [
  "/seller/debts",
  "/seller/history",
  "/seller/debts?customer_id=20000000-0000-4000-8000-000000000051",
]) {
  test(`customer beyond 50 survives direct URL and reload: ${path}`, async ({
    page,
  }) => {
    const { state, services } = await setup(page);
    const customerId = "20000000-0000-4000-8000-000000000051";
    const lookups: string[][] = [];
    await page.route("**/api/v1/businesses/*/customers?*", (route) => {
      const query = new URL(route.request().url()).searchParams;
      expect([...query.keys()]).toEqual(["ids"]);
      expect(query.getAll("ids")).toEqual([customerId]);
      lookups.push(query.getAll("ids"));
      return route.fulfill({
        json: {
          items: [
            {
              id: customerId,
              business_id: qaIds.shopA,
              display_name: "Учебный клиент 51",
              balance_minor: 630000,
              note: "",
              contact: null,
            },
          ],
          next_cursor: null,
        },
      });
    });
    state.items = [{ ...operation(), customer_id: customerId }];
    if (path.includes("debts"))
      await page.route("**/api/v1/businesses/*/operations?*", (route) =>
        route.fulfill({
          json: {
            items: [
              {
                id: operation().sale_id,
                customer_id: customerId,
                description: "Учебный долг",
                total_minor: 450000,
                received_minor: 200000,
                balance_minor: 250000,
                created_at: operation().created_at,
              },
            ],
            next_cursor: null,
          },
        }),
      );
    await page.goto(path);
    await expect(
      page.getByText("Учебный клиент 51", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Учебный клиент 51", { exact: true }),
    ).toBeVisible();
    expect(lookups.length).toBeGreaterThanOrEqual(2);
    if (path.includes("customer_id"))
      await expect(page.locator(".debt-total")).toContainText("6 300 ₸");
    expect(services.unexpected).toEqual([]);
  });
}

test("initial loading, successful empty and reload on mobile", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { state, services } = await setup(page);
  let release!: () => void;
  state.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.goto("/seller/history");
  await expect(
    page.getByRole("heading", { name: "История операций" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("history-loading.png"),
    fullPage: true,
  });
  await expect(page.getByRole("status")).toContainText("Загрузка");
  await expect(page.getByRole("heading", { name: "Записей нет" })).toHaveCount(
    0,
  );
  state.gate = null;
  release();
  await expect(
    page.getByRole("heading", { name: "Записей нет" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("history-empty.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Записей нет" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(services.unexpected).toEqual([]);
});

test("initial failure is not empty and retries successfully", async ({
  page,
}, info) => {
  const { state, services } = await setup(page);
  state.status = 503;
  await page.goto("/seller/history");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Записей нет" })).toHaveCount(
    0,
  );
  await page.screenshot({
    path: info.outputPath("history-error.png"),
    fullPage: true,
  });
  state.status = 200;
  state.items = [operation()];
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Учебная продажа" }),
  ).toBeVisible();
  await expect(page.locator(".history-row")).toContainText("4 500 ₸");
  expect(services.unexpected).toEqual([]);
});

test("next page retains rows, announces loading and retries the cursor", async ({
  page,
}, info) => {
  const { state, services } = await setup(page);
  state.items = [operation()];
  state.next = "synthetic-next-cursor";
  await page.goto("/seller/history");
  await expect(
    page.getByRole("heading", { name: "Учебная продажа" }),
  ).toBeVisible();
  let release!: () => void;
  state.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.status = 503;
  await page
    .getByRole("button", { name: "Загрузить ещё", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Загрузка следующей страницы…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Учебная продажа" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("history-next-page.png"),
    fullPage: true,
  });
  state.gate = null;
  release();
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось загрузить следующую страницу",
  );
  const beforeRetry = state.calls.length;
  state.status = 200;
  state.items = [];
  state.next = null;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Загрузить ещё", exact: true }),
  ).toHaveCount(0);
  expect(state.calls.length).toBe(beforeRetry + 1);
  expect(state.calls.at(-1)).toContain("cursor=synthetic-next-cursor");
  expect(services.unexpected).toEqual([]);
});
