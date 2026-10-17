import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { PRODUCTION_EMAIL_CALLBACK_URL } from "../src/app/auth-callback-config";
import { mockServices, qaIds } from "./qa-fixtures";

const origin = new URL(PRODUCTION_EMAIL_CALLBACK_URL).origin;
const local = "http://127.0.0.1:4209";
async function prepare(page: Page) {
  const service = await mockServices(page, origin);
  const mail: { kind: string; redirect: string | null; pkce: unknown }[] = [];
  let meCalls = 0;
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/__qa_supabase/")
    )
      return route.fallback();
    // Explicitly proxy only static GETs to our isolated server, never the live URL.
    expect(route.request().method()).toBe("GET");
    const response = await page.request.get(
      `${local}${url.pathname}${url.search}`,
    );
    return route.fulfill({ response });
  });
  await page.route(
    "**/__qa_supabase/auth/v1/{signup,resend}*",
    async (route) => {
      const url = new URL(route.request().url());
      const body = route.request().postDataJSON();
      mail.push({
        kind: url.pathname.split("/").at(-1)!,
        redirect: url.searchParams.get("redirect_to"),
        pkce: body.code_challenge,
      });
      await route.fulfill({
        json: url.pathname.endsWith("signup")
          ? { id: qaIds.a, identities: [] }
          : {},
      });
    },
  );
  await page.route("**/api/v1/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    meCalls++;
    await route.fulfill({ json: { id: qaIds.a, businesses: [] } });
  });
  await page.route("**/auth/v1/token?grant_type=pkce", async (route) => {
    // The synthetic Auth boundary must check the real SDK verifier, rather
    // than returning a successful session for any supplied value.
    const body = route.request().postDataJSON();
    expect(body.code_verifier).toEqual(expect.any(String));
    expect(
      createHash("sha256").update(body.code_verifier).digest("base64url"),
    ).toBe(mail.at(-1)?.pkce);
    await route.fallback();
  });
  return { service, mail, meCalls: () => meCalls };
}

for (const width of [360, 1440]) {
  test(`Cloudflare signup/resend → same-origin callback → session → empty /me at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const qa = await prepare(page);
    await page.goto("/register");
    await page
      .getByLabel("Электронная почта", { exact: true })
      .fill("preview@example.test");
    await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
    await page
      .getByLabel("Подтвердите пароль", { exact: true })
      .fill("synthetic-password");
    await page
      .getByRole("button", { name: "Зарегистрироваться", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Подтвердите адрес электронной почты",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/Откройте последнюю ссылку из письма/),
    ).toBeVisible();
    await expect(page.getByText(/Vercel/)).toHaveCount(0);
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(page.getByText(/Соңғы хаттағы сілтемені/)).toBeVisible();
    await expect(page.getByText(/Vercel/)).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`preview-confirmation-kk-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "RU", exact: true }).click();
    expect(qa.mail).toHaveLength(1);
    expect(qa.mail[0]).toMatchObject({
      kind: "signup",
      redirect: PRODUCTION_EMAIL_CALLBACK_URL,
      pkce: expect.any(String),
    });
    expect(qa.meCalls()).toBe(0);
    await page
      .getByRole("button", { name: "Отправить письмо повторно" })
      .click();
    await expect(page.getByText(/Запрос принят/)).toBeVisible();
    expect(qa.mail).toHaveLength(2);
    expect(qa.mail[1]).toMatchObject({
      kind: "resend",
      redirect: PRODUCTION_EMAIL_CALLBACK_URL,
    });
    // Synthetic email click. This verifies browser/SDK behavior, not mail delivery.
    await page.goto(`${qa.mail[1].redirect}?code=SYNTHETIC_PREVIEW_CODE`);
    await expect(page).toHaveURL(`${origin}/seller`);
    await expect(
      page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeVisible();
    await expect(
      page.getByText("a@example.test", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Доступ к торговой точке ещё не назначен/),
    ).toBeVisible();
    const beforeRefresh = qa.meCalls();
    await page
      .getByRole("button", { name: "Обновить доступ", exact: true })
      .click();
    await expect.poll(qa.meCalls).toBeGreaterThan(beforeRefresh);
    expect(qa.meCalls()).toBeGreaterThan(0);
    const exchanges = qa.service.calls.filter(
      (call) => call.query === "?grant_type=pkce",
    );
    expect(exchanges).toHaveLength(1);
    expect(exchanges[0].body).toMatchObject({
      auth_code: "SYNTHETIC_PREVIEW_CODE",
      code_verifier: expect.any(String),
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Сізде әзірге сауда нүктелері жоқ" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`preview-empty-kk-${width}.png`),
      fullPage: true,
    });
    await expect(
      page.getByText("a@example.test", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Қолжетімділікті жаңарту",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Шығу", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/login`);
    expect(
      qa.service.calls.filter((call) =>
        call.path.startsWith("/api/v1/businesses"),
      ),
    ).toEqual([]);
    expect(qa.service.unexpected).toEqual([]);
  });
}

test("another origin cannot start signup/resend and links to the approved Cloudflare origin in RU/KZ", async ({
  page,
}) => {
  const qa = await prepare(page);
  await page.goto(`${local}/register`);
  await expect(
    page.getByRole("link", { name: "Открыть регистрацию Qadam" }),
  ).toHaveAttribute("href", `${origin}/register`);
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveCount(0);
  await page.evaluate(() =>
    sessionStorage.setItem("qadam.registration.pending", "1"),
  );
  await page.reload();
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Qadam тіркелуін ашу" }),
  ).toHaveAttribute("href", `${origin}/register`);
  await expect(page.locator("form")).toHaveCount(0);
  expect(qa.mail).toEqual([]);
  expect(qa.meCalls()).toBe(0);
  expect(qa.service.calls).toEqual([]);
  expect(qa.service.unexpected).toEqual([]);
});

async function startSignup(page: Page) {
  await page.goto(`${origin}/register`);
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("gate@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await page
    .getByLabel("Подтвердите пароль", { exact: true })
    .fill("synthetic-password");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Подтвердите адрес электронной почты" }),
  ).toBeVisible();
}

for (const keepsCode of [true, false]) {
  test(`synthetic access gate returns with callback code ${keepsCode ? "preserved" : "missing"}`, async ({
    page,
  }) => {
    const qa = await prepare(page);
    await startSignup(page);
    const callback = `${origin}/auth/callback?code=SYNTHETIC_GATE_CODE`;
    const gate = "https://vercel-auth.example.test/login";
    let intercepted = false;
    await page.route(callback, async (route) => {
      if (intercepted) return route.fallback();
      intercepted = true;
      // Start a separate browser navigation so every hop is intercepted.
      // A fulfilled HTTP 302 can bypass Playwright's per-page redirect routing.
      await route.fulfill({
        contentType: "text/html",
        body: `<script>location.replace(${JSON.stringify(gate)})</script>`,
      });
    });
    // This models a platform access redirect, not the real Vercel login service.
    // No request is sent to Vercel and no access setting is changed.
    await page.route(gate, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<main><h1>Synthetic access gate</h1><a href="${keepsCode ? callback : PRODUCTION_EMAIL_CALLBACK_URL}">Continue synthetic access</a></main>`,
      }),
    );
    await page.goto(callback);
    await expect(
      page.getByRole("heading", { name: "Synthetic access gate" }),
    ).toBeVisible();
    expect(qa.meCalls()).toBe(0);
    await page.getByRole("link", { name: "Continue synthetic access" }).click();
    if (keepsCode) {
      await expect(page).toHaveURL(`${origin}/seller`);
      await expect(
        page.getByText("У вас пока нет торговых точек"),
      ).toBeVisible();
      expect(
        qa.service.calls.filter((call) => call.query === "?grant_type=pkce"),
      ).toHaveLength(1);
    } else {
      await expect(page.getByRole("alert")).toContainText(
        "Ссылка недействительна или уже использована",
      );
      await expect(
        page.getByRole("link", { name: "Вернуться ко входу" }),
      ).toBeVisible();
      await expect(page.getByText("У вас пока нет торговых точек")).toHaveCount(
        0,
      );
      expect(qa.meCalls()).toBe(0);
      expect(
        qa.service.calls.filter((call) => call.query === "?grant_type=pkce"),
      ).toEqual([]);
    }
    expect(qa.service.unexpected).toEqual([]);
  });
}

test("email opened in a different browser has no verifier and offers password login without claiming callback success", async ({
  page,
  browser,
}) => {
  const original = await prepare(page);
  await startSignup(page);
  expect(original.mail).toHaveLength(1);
  const other = await browser.newContext({
    baseURL: origin,
    serviceWorkers: "block",
    viewport: { width: 360, height: 800 },
  });
  try {
    const otherPage = await other.newPage();
    const qa = await prepare(otherPage);
    await otherPage.goto(
      `${origin}/auth/callback?code=SYNTHETIC_OTHER_BROWSER`,
    );
    await expect(otherPage.getByRole("alert")).toContainText(
      "Откройте письмо в том же браузере",
    );
    expect(qa.meCalls()).toBe(0);
    expect(qa.service.calls).toEqual([]);
    await otherPage.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(otherPage.getByRole("alert")).toContainText(
      "Хатты тіркелуді бастаған браузерде",
    );
    await otherPage.getByRole("button", { name: "RU", exact: true }).click();
    await otherPage.getByRole("link", { name: "Вернуться ко входу" }).click();
    await otherPage
      .getByLabel("Электронная почта", { exact: true })
      .fill("a@example.test");
    await otherPage
      .getByLabel("Пароль", { exact: true })
      .fill("synthetic-password");
    await otherPage.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(otherPage).toHaveURL(`${origin}/seller`);
    await expect(
      otherPage.getByText("У вас пока нет торговых точек"),
    ).toBeVisible();
    expect(
      qa.service.calls.filter((call) => call.query === "?grant_type=pkce"),
    ).toEqual([]);
    expect(qa.service.unexpected).toEqual([]);
  } finally {
    await other.close();
  }
});
