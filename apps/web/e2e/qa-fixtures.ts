import { expect, type Page } from "@playwright/test";
import type { components } from "../src/shared/api/generated";

// All credentials, tokens, memberships and customers are synthetic. Real SDK,
// production App and fetch run in Chromium; auth/API responses are intercepted.
export const qaIds = {
  a: "50000000-0000-4000-8000-000000000001",
  b: "50000000-0000-4000-8000-000000000002",
  shopA: "10000000-0000-4000-8000-000000000001",
  shopA2: "10000000-0000-4000-8000-000000000002",
  shopB: "10000000-0000-4000-8000-000000000003",
  customer: "20000000-0000-4000-8000-000000000001",
  created: "20000000-0000-4000-8000-000000000002",
  request: "70000000-0000-4000-8000-000000000001",
};
const member = (id: string, name: string) => ({
  id,
  name,
  slug: `qa-${id}`,
  role: "owner" as const,
});
const me = {
  a: {
    id: qaIds.a,
    businesses: [
      member(qaIds.shopA, "QA MART"),
      member(qaIds.shopA2, "QA Кайкармет"),
    ],
  },
  b: { id: qaIds.b, businesses: [member(qaIds.shopB, "QA Ауыл Береке")] },
} satisfies Record<string, components["schemas"]["MeResponse"]>;
const customer = (businessId: string, name: string) => ({
  id: qaIds.customer,
  business_id: businessId,
  display_name: name,
  note: "Synthetic QA",
  contact: null,
  balance_minor: 12345,
});
function authSession(account: "a" | "b") {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: qaIds[account],
    aud: "authenticated",
    role: "authenticated",
    email: `${account}@example.test`,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-10-15T00:00:00Z",
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    user,
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 })}.cWEtb25seQ`,
    refresh_token: `synthetic-refresh-${account}`,
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
  };
}
export async function mockServices(page: Page) {
  const sessions = { a: authSession("a"), b: authSession("b") };
  const state = {
    meStatus: 200,
    customerStatus: 200,
    postStatus: 201,
    invalidPostJson: false,
    foreignCustomer: false,
    loginStatus: 200,
    postGate: null as Promise<void> | null,
    calls: [] as {
      path: string;
      method: string;
      query: string;
      authorization: string | undefined;
      body: unknown;
    }[],
    unexpected: [] as string[],
    created: [] as components["schemas"]["CustomerResponse"][],
  };
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      state.unexpected.push(url.origin);
      return route.abort("blockedbyclient");
    }
    const path = url.pathname;
    if (!path.startsWith("/api/") && !path.startsWith("/__qa_supabase/"))
      return route.continue();
    const method = request.method();
    const authorization = request.headers().authorization;
    const body = request.postData() ? request.postDataJSON() : null;
    state.calls.push({ path, method, query: url.search, authorization, body });
    const send = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    const error = (status: number) =>
      send(
        {
          error: {
            code: status === 401 ? "AUTH_REQUIRED" : `QA_HTTP_${status}`,
            message: "PRIVATE_SERVER_TRACE_MUST_NOT_RENDER",
            fields: {},
          },
          request_id: qaIds.request,
        },
        status,
      );
    if (path.endsWith("/auth/v1/token")) {
      if (state.loginStatus !== 200)
        return send(
          {
            error: "invalid_grant",
            error_description: "Synthetic rejected login",
          },
          state.loginStatus,
        );
      const account =
        body?.email === "b@example.test" ||
        body?.refresh_token === "synthetic-refresh-b"
          ? "b"
          : "a";
      return send(sessions[account]);
    }
    if (path.endsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
    const account =
      authorization === `Bearer ${sessions.b.access_token}` ? "b" : "a";
    if (path.endsWith("/auth/v1/user")) return send(sessions[account].user);
    if (authorization !== `Bearer ${sessions[account].access_token}`)
      return error(401);
    if (path === "/api/v1/me")
      return state.meStatus === 200 ? send(me[account]) : error(state.meStatus);
    const match = path.match(/^\/api\/v1\/businesses\/([^/]+)\/customers$/);
    if (match) {
      const businessId = match[1];
      if (!me[account].businesses.some((b) => b.id === businessId))
        return error(404);
      if (method === "POST") {
        if (state.postGate) await state.postGate;
        if (state.postStatus !== 201) return error(state.postStatus);
        if (state.invalidPostJson)
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: "<invalid-json>",
          });
        const created = {
          ...customer(businessId, body.display_name),
          ...body,
          id: qaIds.created,
        };
        state.created.push(created);
        return send(created, 201);
      }
      if (state.customerStatus !== 200) return error(state.customerStatus);
      const first = customer(
        state.foreignCustomer ? qaIds.shopB : businessId,
        `QA Клиент ${account.toUpperCase()}`,
      );
      const query = url.searchParams.get("q") ?? "";
      const items = [
        first,
        ...state.created.filter((c) => c.business_id === businessId),
      ].filter((c) => c.display_name.includes(query));
      return send({ items, next_cursor: null });
    }
    state.unexpected.push(`${method} ${path}`);
    return error(500);
  });
  return state;
}
export async function login(page: Page, account: "a" | "b" = "a") {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Войти", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill(`${account}@example.test`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("synthetic-qa-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
}
export async function customers(page: Page) {
  await page.locator('a[href="/seller/customers"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Клиенты", exact: true }),
  ).toBeVisible();
}
export async function newCustomer(page: Page) {
  await page
    .getByRole("button", { name: /Новый клиент/ })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "Новый клиент" });
  await form.getByLabel("Имя", { exact: true }).fill("QA Новый");
  await form.getByLabel("Заметка", { exact: true }).fill("Тестовая заметка");
  return form;
}
