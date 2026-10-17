import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import type { components } from "../src/shared/api/generated";
import { customers, login, newCustomer, qaIds } from "./qa-fixtures";

type Customer = components["schemas"]["CustomerResponse"];
type CustomerBody = components["schemas"]["CustomerCreate"];
type Intent = { key: string; bodyHash: string };
const apiBase = "http://127.0.0.1:4207/api/v1";
const storageKey = `qadam.customer-create.v1:${encodeURIComponent(apiBase)}:${qaIds.a}:${qaIds.shopA}`;
const legacyKey = `qadam.customer-create.v1:${qaIds.a}:${qaIds.shopA}`;
const unknown = /Результат неизвестен: клиент мог быть создан/;

// These responses model the public contract, not PostgreSQL idempotency. All
// requests from both real tabs share one synthetic server and one Auth session.
async function services(context: BrowserContext) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: qaIds.a,
    aud: "authenticated",
    role: "authenticated",
    email: "a@example.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-10-15T00:00:00Z",
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: qaIds.a, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 })}.cWEtb25seQ`;
  const session = {
    user,
    access_token: token,
    refresh_token: "synthetic-recovery-refresh",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
  };
  const state = {
    mode: "success" as "success" | "lost" | "commit-lost" | "held",
    gate: null as Promise<void> | null,
    posts: [] as { key: string; body: string }[],
    lookups: [] as string[],
    receipts: new Map<string, Customer>(),
    unexpected: [] as string[],
  };
  const existing: Customer = {
    id: qaIds.customer,
    business_id: qaIds.shopA,
    display_name: "QA Клиент A",
    note: "Synthetic fixture",
    contact: null,
    balance_minor: 0,
  };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4207") {
      state.unexpected.push(url.origin);
      return route.abort("blockedbyclient");
    }
    const path = url.pathname;
    if (!path.startsWith("/api/") && !path.startsWith("/__qa_supabase/"))
      return route.continue();
    const send = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", json: body });
    if (path.endsWith("/auth/v1/token")) return send(session);
    if (path.endsWith("/auth/v1/user")) return send(user);
    if (path.endsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
    expect(request.headers().authorization).toBe(`Bearer ${token}`);
    if (path === "/api/v1/me")
      return send({
        id: qaIds.a,
        businesses: [
          { id: qaIds.shopA, name: "QA MART", slug: "qa-mart", role: "owner" },
        ],
      });
    if (path === `/api/v1/businesses/${qaIds.shopA}/customer-creation-result`) {
      expect(request.method()).toBe("GET");
      expect(url.search).toBe("");
      const key = request.headers()["idempotency-key"];
      expect(key).toMatch(/^[\da-f-]{36}$/i);
      state.lookups.push(key);
      const customer = state.receipts.get(key);
      return send(
        customer
          ? { status: "completed", customer }
          : { status: "not_observed", customer: null },
      );
    }
    if (path === `/api/v1/businesses/${qaIds.shopA}/customers`) {
      if (request.method() === "GET")
        return send({
          items: [existing, ...state.receipts.values()],
          next_cursor: null,
        });
      expect(request.method()).toBe("POST");
      const key = request.headers()["idempotency-key"];
      expect(key).toMatch(/^[\da-f-]{36}$/i);
      const body = request.postData()!;
      state.posts.push({ key, body });
      if (state.gate) await state.gate;
      if (state.mode === "lost" || state.mode === "held")
        return route.abort("failed");
      const customer: Customer = {
        ...existing,
        ...(JSON.parse(body) as CustomerBody),
        id: qaIds.created,
      };
      state.receipts.set(key, customer);
      if (state.mode === "commit-lost") return route.abort("failed");
      return send(customer, 201);
    }
    state.unexpected.push(`${request.method()} ${path}`);
    return route.abort("blockedbyclient");
  });
  return state;
}

async function openForm(page: Page) {
  await login(page);
  await customers(page);
  return newCustomer(page);
}
const submit = (form: Locator) =>
  form.getByRole("button", { name: "Создать клиента", exact: true });
const retry = (form: Locator) =>
  form.getByRole("button", { name: "Безопасно повторить", exact: true });
async function savedIntent(page: Page): Promise<Intent | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, storageKey);
}
async function assertPrivateMarker(page: Page) {
  const intent = await savedIntent(page);
  expect(intent).not.toBeNull();
  expect(Object.keys(intent!).sort()).toEqual(["bodyHash", "key"]);
  expect(intent!.key).toMatch(/^[\da-f-]{36}$/i);
  expect(intent!.bodyHash).toMatch(/^[a-f\d]{64}$/);
  const serialized = JSON.stringify(intent);
  for (const secret of [
    "QA Новый",
    "Тестовая заметка",
    "contact",
    "Bearer",
    "access_token",
  ])
    expect(serialized).not.toContain(secret);
  return intent!;
}

test("lost acknowledgement after synthetic commit resolves through completed lookup without a second POST", async ({
  page,
  context,
}) => {
  const server = await services(context);
  server.mode = "commit-lost";
  const form = await openForm(page);
  await submit(form).click();
  await expect(form).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "QA Новый", exact: true }),
  ).toBeVisible();
  expect(server.posts).toHaveLength(1);
  expect(server.lookups).toContain(server.posts[0].key);
  expect(await savedIntent(page)).toBeNull();
  expect(server.unexpected).toEqual([]);
});

test("not_observed preserves the unknown attempt; an explicit retry sends identical key and body", async ({
  page,
  context,
}) => {
  const server = await services(context);
  server.mode = "lost";
  const form = await openForm(page);
  await submit(form).click();
  await expect(form.getByText(unknown)).toBeVisible();
  const intent = await assertPrivateMarker(page);
  expect(server.posts).toHaveLength(1);
  await expect(form.getByLabel("Имя", { exact: true })).toHaveValue("QA Новый");
  await form
    .getByRole("button", { name: "Проверить результат", exact: true })
    .click();
  await expect(form.getByText(unknown)).toBeVisible();
  expect(server.posts).toHaveLength(1);
  expect(await savedIntent(page)).toEqual(intent);
  server.mode = "success";
  await retry(form).click();
  await expect(form).not.toBeVisible();
  expect(server.posts).toHaveLength(2);
  expect(server.posts[1]).toEqual(server.posts[0]);
  expect(await savedIntent(page)).toBeNull();
  expect(server.unexpected).toEqual([]);
});

test("reload checks the original key with GET only; a different body cannot become a new customer", async ({
  page,
  context,
}) => {
  const server = await services(context);
  server.mode = "lost";
  let form = await openForm(page);
  await submit(form).click();
  await expect(form.getByText(unknown)).toBeVisible();
  const intent = await assertPrivateMarker(page);
  const beforeReload = server.lookups.length;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Клиенты", exact: true }),
  ).toBeVisible();
  await expect.poll(() => server.lookups.length).toBeGreaterThan(beforeReload);
  expect(server.lookups.at(-1)).toBe(intent.key);
  expect(server.posts).toHaveLength(1);
  await page
    .getByRole("button", { name: /Новый клиент/ })
    .first()
    .click();
  form = page.getByRole("dialog", { name: "Новый клиент" });
  await expect(form.getByLabel("Имя", { exact: true })).toHaveValue("");
  await expect(form.getByLabel("Заметка", { exact: true })).toHaveValue("");
  await form.getByLabel("Имя", { exact: true }).fill("Другой клиент");
  await retry(form).click();
  await expect(
    form.getByText(/Данные отличаются от исходного запроса/),
  ).toBeVisible();
  expect(server.posts).toHaveLength(1);
  expect(await savedIntent(page)).toEqual(intent);
  // Reentering exactly the original fields is an explicit action, not automatic
  // replay of contact data persisted by the browser.
  await form.getByLabel("Имя", { exact: true }).fill("QA Новый");
  await form.getByLabel("Заметка", { exact: true }).fill("Тестовая заметка");
  server.mode = "success";
  await retry(form).click();
  await expect(form).not.toBeVisible();
  expect(server.posts).toHaveLength(2);
  expect(server.posts[1]).toEqual(server.posts[0]);
  expect(server.unexpected).toEqual([]);
});

test("two real tabs queue native Web Locks and adopt storage events before different bodies can create twice", async ({
  page,
  context,
}) => {
  const server = await services(context);
  server.mode = "held";
  let releasePost!: () => void;
  server.gate = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  await context.addInitScript(() => {
    const target = window as typeof window & {
      recoveryStorageEvents?: string[];
    };
    target.recoveryStorageEvents = [];
    addEventListener("storage", (event) => {
      if (event.key?.startsWith("qadam.customer-create.v1:"))
        target.recoveryStorageEvents!.push(event.key);
    });
  });
  const first = await openForm(page);
  await first.getByLabel("Имя", { exact: true }).fill("Первый tab fixture");
  const secondPage = await context.newPage();
  await secondPage.goto("/seller/customers");
  await expect(
    secondPage.getByRole("heading", { name: "Клиенты", exact: true }),
  ).toBeVisible();
  const second = await newCustomer(secondPage);
  await second.getByLabel("Имя", { exact: true }).fill("Второй tab fixture");
  // Hold the browser's actual lock to force both stale forms to queue before
  // either claim. No navigator.locks or storage implementation is replaced.
  await page.evaluate((name) => {
    const target = window as typeof window & {
      recoveryReleaseLock?: () => void;
      recoveryLockHeld?: boolean;
    };
    if (!navigator.locks) throw new Error("Native Web Locks unavailable");
    void navigator.locks.request(name, async () => {
      target.recoveryLockHeld = true;
      await new Promise<void>((resolve) => {
        target.recoveryReleaseLock = resolve;
      });
    });
  }, storageKey);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { recoveryLockHeld?: boolean })
            .recoveryLockHeld,
      ),
    )
    .toBe(true);
  await Promise.all([submit(first).click(), submit(second).click()]);
  await expect
    .poll(() =>
      page.evaluate(
        async (name) =>
          (await navigator.locks.query()).pending?.filter(
            (lock) => lock.name === name,
          ).length ?? 0,
        storageKey,
      ),
    )
    .toBeGreaterThanOrEqual(2);
  expect(server.posts).toHaveLength(0);
  await page.evaluate(() =>
    (window as typeof window & { recoveryReleaseLock?: () => void })
      .recoveryReleaseLock!(),
  );
  await expect.poll(() => server.posts.length).toBe(1);
  const intent = await assertPrivateMarker(page);
  await expect
    .poll(async () => {
      const events = await Promise.all(
        [page, secondPage].map((tab) =>
          tab.evaluate(
            () =>
              (window as typeof window & { recoveryStorageEvents: string[] })
                .recoveryStorageEvents.length,
          ),
        ),
      );
      return events.reduce((total, count) => total + count, 0);
    })
    .toBeGreaterThan(0);
  expect(await savedIntent(secondPage)).toEqual(intent);
  releasePost();
  await expect(first.getByText(unknown)).toBeVisible();
  await expect(second.getByText(unknown)).toBeVisible();
  expect(server.posts).toHaveLength(1);
  await secondPage.reload();
  await expect(
    secondPage.getByRole("heading", { name: "Клиенты", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => server.lookups.filter((key) => key === intent.key).length)
    .toBeGreaterThan(0);
  expect(await savedIntent(secondPage)).toEqual(intent);
  expect(server.posts).toHaveLength(1);
  expect(server.unexpected).toEqual([]);
});

test("a legacy intent with unknown API origin stays blocked and is never migrated, looked up, or posted", async ({
  page,
  context,
}) => {
  const server = await services(context);
  await login(page);
  const legacy: Intent = {
    key: "77777777-7777-4777-8777-777777777777",
    bodyHash: "a".repeat(64),
  };
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: legacyKey, value: legacy },
  );
  await customers(page);
  const form = await newCustomer(page);
  await expect(
    form.getByText(/Найдена старая попытка без адреса сервера/),
  ).toBeVisible();
  await expect(submit(form)).toBeDisabled();
  expect(server.posts).toEqual([]);
  expect(server.lookups).toEqual([]);
  expect(await savedIntent(page)).toBeNull();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      legacyKey,
    ),
  ).toEqual(legacy);
  await page.reload();
  await page
    .getByRole("button", { name: /Новый клиент/ })
    .first()
    .click();
  await expect(
    submit(page.getByRole("dialog", { name: "Новый клиент" })),
  ).toBeDisabled();
  expect(server.posts).toEqual([]);
  expect(server.lookups).toEqual([]);
  expect(await savedIntent(page)).toBeNull();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      legacyKey,
    ),
  ).toEqual(legacy);
  expect(server.unexpected).toEqual([]);
});
