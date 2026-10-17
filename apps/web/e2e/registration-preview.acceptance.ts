import { expect, test, type Page } from "@playwright/test";
import { PR43_EMAIL_CALLBACK_URL } from "../src/app/auth-callback-config";
import { mockServices, qaIds } from "./qa-fixtures";

const origin = new URL(PR43_EMAIL_CALLBACK_URL).origin;
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
  return { service, mail, meCalls: () => meCalls };
}

for (const width of [360, 1440]) {
  test(`Preview signup/resend → same-origin callback → session → empty /me at ${width}`, async ({
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
    expect(qa.mail).toHaveLength(1);
    expect(qa.mail[0]).toMatchObject({
      kind: "signup",
      redirect: PR43_EMAIL_CALLBACK_URL,
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
      redirect: PR43_EMAIL_CALLBACK_URL,
    });
    // Synthetic email click. This verifies browser/SDK behavior, not mail delivery.
    await page.goto(`${qa.mail[1].redirect}?code=SYNTHETIC_PREVIEW_CODE`);
    await expect(page).toHaveURL(`${origin}/seller`);
    await expect(
      page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeVisible();
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

test("another origin cannot start signup/resend and links to the approved Preview in RU/KZ", async ({
  page,
}) => {
  const qa = await prepare(page);
  await page.goto(`${local}/register`);
  await expect(
    page.getByRole("link", { name: "Открыть тестовую регистрацию" }),
  ).toHaveAttribute("href", `${origin}/register`);
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveCount(0);
  await page.evaluate(() =>
    sessionStorage.setItem("qadam.registration.pending", "1"),
  );
  await page.reload();
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Сынақ тіркелуін ашу" }),
  ).toHaveAttribute("href", `${origin}/register`);
  await expect(page.locator("form")).toHaveCount(0);
  expect(qa.mail).toEqual([]);
  expect(qa.meCalls()).toBe(0);
  expect(qa.service.calls).toEqual([]);
  expect(qa.service.unexpected).toEqual([]);
});
