import { expect, test, type Page } from "@playwright/test";
import { login, mockServices, qaIds } from "./qa-fixtures";

async function expireStoredSession(page: Page) {
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) =>
      /^sb-.*-auth-token$/.test(key),
    );
    if (!key) throw new Error("Synthetic session not stored");
    const session = JSON.parse(localStorage.getItem(key)!);
    session.expires_at = 1;
    localStorage.setItem(key, JSON.stringify(session));
  });
}

test("first load, existing account, reload and repeat login use the real SDK", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = await mockServices(page);
  await page.goto("/seller");
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(state.unexpected).toEqual([]);
});

test("expired session refreshes once and returns to cabinet", async ({
  page,
}) => {
  const state = await mockServices(page);
  await login(page);
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
  await expireStoredSession(page);
  await page.reload();
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
  expect(
    state.calls.filter((call) =>
      call.query.includes("grant_type=refresh_token"),
    ),
  ).toHaveLength(1);
  expect(state.unexpected).toEqual([]);
});

test("unavailable refresh exits loading and explicit retry recovers without erasing session", async ({
  page,
}, info) => {
  await mockServices(page);
  await login(page);
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
  await expireStoredSession(page);
  let refreshes = 0;
  await page.route("**/auth/v1/token?grant_type=refresh_token", () => {
    refreshes++;
  });
  await page.reload();
  // Real elapsed-time test: no clock acceleration for the initialization deadline.
  await expect(page.getByText(/Служба входа не ответила/)).toBeVisible({
    timeout: 15_000,
  });
  expect(refreshes).toBeGreaterThan(0);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => /^sb-.*-auth-token$/.test(key)),
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("auth-timeout-ru.png") });
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(page.getByText(/Кіру қызметі уақытында/)).toBeVisible();
  await page.unroute("**/auth/v1/token?grant_type=refresh_token");
  await page.getByRole("button", { name: "Қайталау", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "RU", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
});

test("revoked refresh returns to login without a refresh loop or membership request", async ({
  page,
}) => {
  const state = await mockServices(page);
  await login(page);
  await expect(
    page.getByText("Скажите о продаже", { exact: true }),
  ).toBeVisible();
  await expireStoredSession(page);
  const priorMe = state.calls.filter(
    (call) => call.path === "/api/v1/me",
  ).length;
  let refreshes = 0;
  await page.route("**/auth/v1/token?grant_type=refresh_token", (route) => {
    refreshes++;
    return route.fulfill({
      status: 400,
      headers: { "x-supabase-api-version": "2024-01-01" },
      json: {
        code: "refresh_token_not_found",
        msg: "Synthetic revoked refresh",
      },
    });
  });
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Войти", exact: true }),
  ).toBeEnabled();
  expect(refreshes).toBe(1);
  expect(state.calls.filter((call) => call.path === "/api/v1/me")).toHaveLength(
    priorMe,
  );
});

test("pending membership settles, no automatic retry, manual retry reaches new-account state", async ({
  page,
}, info) => {
  await mockServices(page);
  await page.clock.install();
  let meCalls = 0;
  await page.route("**/api/v1/me", () => {
    meCalls++;
  });
  await login(page);
  await expect.poll(() => meCalls).toBe(1);
  await expect(page.getByText("Загрузка…", { exact: true })).toBeVisible();
  await page.clock.runFor(20_100);
  await expect(page.getByText(/Сервер Qadam не ответил вовремя/)).toBeVisible();
  await page.clock.runFor(90_000);
  expect(meCalls).toBe(1);
  await page.screenshot({ path: info.outputPath("backend-timeout-ru.png") });
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { id: qaIds.a, businesses: [] } }),
  );
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
  ).toBeVisible();
});

for (const status of [401, 403, 404, 429, 500, 503]) {
  test(`membership HTTP ${status} has a finite error state without automatic retries`, async ({
    page,
  }) => {
    await mockServices(page);
    let calls = 0;
    await page.route("**/api/v1/me", (route) => {
      calls++;
      return route.fulfill({
        status,
        json: {
          error: {
            code: status === 503 ? "DATABASE_UNAVAILABLE" : `HTTP_${status}`,
          },
        },
      });
    });
    await login(page);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Загрузка…", { exact: true })).toHaveCount(0);
    if (status === 503)
      await expect(page.getByText(/база данных недоступна/)).toBeVisible();
    expect(calls).toBe(1);
  });
}

test("backend disconnected is distinct from invalid credentials", async ({
  page,
}) => {
  await mockServices(page);
  await page.route("**/auth/v1/token?*", (route) =>
    route.fulfill({
      status: 400,
      headers: { "x-supabase-api-version": "2024-01-01" },
      json: { code: "invalid_credentials", msg: "Invalid login" },
    }),
  );
  await login(page);
  await expect(
    page.getByText(/Неверная электронная почта или пароль/),
  ).toBeVisible();
  await page.unroute("**/auth/v1/token?*");
  await page.route("**/api/v1/me", (route) => route.abort("connectionrefused"));
  await login(page);
  await expect(page.getByText(/Нет связи с сервером Qadam/)).toBeVisible();
  await expect(
    page.getByText(/Неверная электронная почта или пароль/),
  ).toHaveCount(0);
});
