import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { components } from "../src/shared/api/generated";

// Only the Auth/customer transport needed by QA-001/003, adapted to API 0.4.
// The real SDK/App run against synthetic responses; external traffic is blocked.
async function services(context: BrowserContext) {
  const ids = {
    a: "50000000-0000-4000-8000-000000000001",
    b: "50000000-0000-4000-8000-000000000002",
    shopA: "10000000-0000-4000-8000-000000000001",
    shopB: "10000000-0000-4000-8000-000000000002",
    customer: "20000000-0000-4000-8000-000000000001",
    created: "20000000-0000-4000-8000-000000000002",
  };
  const tokens = new Map<string, "a" | "b">();
  let sequence = 0;
  const state = {
    postGate: null as Promise<void> | null,
    postStatus: 201,
    posts: [] as components["schemas"]["CustomerCreate"][],
    created: [] as components["schemas"]["CustomerResponse"][],
    unexpected: [] as string[],
  };
  const session = (account: "a" | "b") => {
    const now = Math.floor(Date.now() / 1000);
    const user = {
      id: ids[account],
      aud: "authenticated",
      role: "authenticated",
      email: `${account}@example.test`,
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-10-15T00:00:00Z",
    };
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600, session_id: ++sequence })}.c3ludGhldGlj`;
    tokens.set(token, account);
    return {
      user,
      access_token: token,
      refresh_token: `synthetic-refresh-${account}`,
      expires_in: 3600,
      expires_at: now + 3600,
      token_type: "bearer",
    };
  };
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      state.unexpected.push(url.origin);
      return route.abort("blockedbyclient");
    }
    const path = url.pathname;
    if (!path.startsWith("/api/") && !path.startsWith("/__fixes_auth/"))
      return route.continue();
    const send = (body: unknown, status = 200) =>
      route.fulfill({ status, json: body });
    const fail = (status: number) =>
      send(
        {
          error: {
            code: status === 401 ? "AUTH_REQUIRED" : "NOT_FOUND",
            message: "Synthetic",
            fields: {},
          },
          request_id: "70000000-0000-4000-8000-000000000001",
        },
        status,
      );
    if (path.endsWith("/auth/v1/token")) {
      const body = request.postDataJSON();
      return send(
        session(
          body.email === "b@example.test" ||
            body.refresh_token === "synthetic-refresh-b"
            ? "b"
            : "a",
        ),
      );
    }
    if (path.endsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
    const token = request.headers().authorization?.replace(/^Bearer /, "");
    const account = token ? tokens.get(token) : undefined;
    if (!account) return fail(401);
    if (path.endsWith("/auth/v1/user"))
      return send({
        id: ids[account],
        aud: "authenticated",
        role: "authenticated",
      });
    const shop = account === "a" ? ids.shopA : ids.shopB;
    if (path === "/api/v1/me") {
      const me: components["schemas"]["MeResponse"] = {
        id: ids[account],
        businesses: [
          {
            id: shop,
            slug: `synthetic-${account}`,
            name: `Fix shop ${account.toUpperCase()}`,
            role: "owner",
          },
        ],
      };
      return send(me);
    }
    if (path === `/api/v1/businesses/${shop}/customers`) {
      if (request.method() === "POST") {
        const body =
          request.postDataJSON() as components["schemas"]["CustomerCreate"];
        state.posts.push(body);
        const gate = state.postGate,
          status = state.postStatus;
        if (gate) await gate;
        if (status !== 201) return fail(status);
        const created: components["schemas"]["CustomerResponse"] = {
          ...body,
          id: ids.created,
          business_id: shop,
          balance_minor: 0,
        };
        state.created.push(created);
        return send(created, 201);
      }
      const first: components["schemas"]["CustomerResponse"] = {
        id: ids.customer,
        business_id: shop,
        display_name: `Клиент ${account.toUpperCase()}`,
        note: "Synthetic fixture",
        contact: null,
        balance_minor: 0,
      };
      const q = url.searchParams.get("q") ?? "";
      return send({
        items: [
          first,
          ...state.created.filter((c) => c.business_id === shop),
        ].filter((c) => c.display_name.includes(q)),
        next_cursor: null,
      });
    }
    state.unexpected.push(`${request.method()} ${path}`);
    return fail(404);
  });
  return state;
}

async function login(page: Page, account: "a" | "b" = "a") {
  await page.goto("/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill(`${account}@example.test`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("synthetic-fixes-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByLabel("Торговая точка", { exact: true }),
  ).toBeVisible();
}
async function customers(page: Page, account: "A" | "B" = "A") {
  await page.locator('a[href="/seller/customers"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: `Клиент ${account}`, exact: true }),
  ).toBeVisible();
}
async function createForm(page: Page) {
  await page
    .getByRole("button", { name: /Новый клиент/ })
    .first()
    .click();
  // The accessible title changes with RU/KZ; retain the same dialog locator.
  return page.getByRole("dialog");
}

test("QA-001: late POST 401 cannot expire A after real SDK cross-tab A/B/A transitions (synthetic transport)", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const state = await services(context);
  await login(page);
  await customers(page);
  const form = await createForm(page);
  await form.getByLabel("Имя", { exact: true }).fill("Synthetic old A request");
  let release!: () => void;
  state.postGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.postStatus = 401;
  await form
    .getByRole("button", { name: "Создать клиента", exact: true })
    .click();
  await expect.poll(() => state.posts.length).toBe(1);
  const other = await context.newPage();
  await other.goto("/seller");
  await other.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(other, "b");
  await expect(
    page.getByLabel("Торговая точка", { exact: true }).locator("option"),
  ).toHaveText(["Fix shop B"]);
  await other.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(other, "a");
  await expect(
    page.getByLabel("Торговая точка", { exact: true }).locator("option"),
  ).toHaveText(["Fix shop A"]);
  await customers(page);
  const lateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/customers") &&
      response.status() === 401,
  );
  release();
  await (await lateResponse).finished();
  const fresh = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/customers?") &&
      response.url().includes("q=") &&
      response.status() === 200,
  );
  await page.getByLabel("Поиск по имени", { exact: true }).fill("Клиент");
  await fresh;
  await expect(
    page.getByRole("heading", { name: "Клиент A", exact: true }),
  ).toBeVisible();
  expect(state.unexpected).toEqual([]);
  await other.close();
});

for (const width of [390, 1440]) {
  test(`QA-003: Unicode boundaries survive input, POST and response at ${width}px (synthetic transport)`, async ({
    page,
    context,
  }) => {
    const state = await services(context);
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await customers(page);
    const form = await createForm(page);
    const name = "😀".repeat(200),
      note = "𐍈".repeat(2000),
      contact = "ӘҒҚҢӨҰҮҺІ".repeat(22) + "ӘҒ";
    await form.getByLabel("Имя", { exact: true }).fill(name + "😀");
    await form
      .getByRole("button", { name: "Создать клиента", exact: true })
      .click();
    await expect(form.getByLabel("Имя", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(state.posts).toHaveLength(0);
    await form.getByLabel("Имя", { exact: true }).fill(name);
    await form.getByLabel("Заметка", { exact: true }).fill(note + "𐍈");
    await form
      .getByRole("button", { name: "Создать клиента", exact: true })
      .click();
    await expect(form.getByLabel("Заметка", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(state.posts).toHaveLength(0);
    await form.getByLabel("Заметка", { exact: true }).fill(note);
    await form
      .getByLabel("Контакт (необязательно)", { exact: true })
      .fill(contact + "Ә");
    await form
      .getByRole("button", { name: "Создать клиента", exact: true })
      .click();
    await expect(
      form.getByLabel("Контакт (необязательно)", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(state.posts).toHaveLength(0);
    await form.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(form.locator('input[aria-invalid="true"]')).toHaveCount(1);
    await form.getByRole("button", { name: "RU", exact: true }).click();
    await form
      .getByLabel("Контакт (необязательно)", { exact: true })
      .fill(contact);
    await form
      .getByRole("button", { name: "Создать клиента", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    expect(state.posts).toEqual([{ display_name: name, note, contact }]);
    expect(state.unexpected).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
