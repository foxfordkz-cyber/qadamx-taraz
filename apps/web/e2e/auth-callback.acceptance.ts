import { expect, test, type Page } from "@playwright/test";
import { mockServices, qaIds } from "./qa-fixtures";

async function prepare(page: Page) {
  const service = await mockServices(page);
  const mail: {
    kind: string;
    redirect: string | null;
    body: Record<string, unknown>;
  }[] = [];
  await page.route(
    "**/__qa_supabase/auth/v1/{signup,resend}*",
    async (route) => {
      const url = new URL(route.request().url());
      mail.push({
        kind: url.pathname.split("/").at(-1)!,
        redirect: url.searchParams.get("redirect_to"),
        body: route.request().postDataJSON(),
      });
      await route.fulfill({
        json: url.pathname.endsWith("signup")
          ? { id: qaIds.a, identities: [] }
          : {},
      });
    },
  );
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { id: qaIds.a, businesses: [] } }),
  );
  return { service, mail };
}
async function signup(page: Page) {
  await page.goto("/register");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("callback@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await page
    .getByLabel("Подтвердите пароль", { exact: true })
    .fill("synthetic-password");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(
    page.getByRole("heading", { name: "Подтвердите адрес электронной почты" }),
  ).toBeVisible();
}
for (const width of [360, 390, 768, 1440]) {
  test(`PKCE confirmation, no memberships, repeat link, reload and logout at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const { service, mail } = await prepare(page);
    await signup(page);
    expect(mail[0].redirect).toBe(
      "https://qadamx-taraz.pages.dev/auth/callback",
    );
    expect(mail[0].body.code_challenge_method).toBe("s256");
    expect(mail[0].body.code_challenge).toEqual(expect.any(String));
    await page.goto(
      "/auth/callback?code=SYNTHETIC_CALLBACK&next=https://evil.invalid",
    );
    await expect(page).toHaveURL(/\/seller$/);
    await expect(
      page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeVisible();
    const exchanges = () =>
      service.calls.filter((call) => call.query === "?grant_type=pkce");
    expect(exchanges()).toHaveLength(1);
    expect(exchanges()[0].body).toMatchObject({
      auth_code: "SYNTHETIC_CALLBACK",
      code_verifier: expect.any(String),
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeVisible();
    await page.goto("/auth/callback?code=SYNTHETIC_USED");
    await expect(page).toHaveURL(/\/seller$/);
    expect(exchanges()).toHaveLength(1);
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
      path: info.outputPath(`callback-empty-kk-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Шығу", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(service.unexpected).toEqual([]);
    expect(
      service.calls.filter((call) =>
        call.path.startsWith("/api/v1/businesses"),
      ),
    ).toEqual([]);
  });
}
test("other browser without verifier and provider error show safe RU/KZ recovery actions", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { service, mail } = await prepare(page);
  await page.goto("/auth/callback?code=NO_VERIFIER");
  await expect(page.getByRole("alert")).toContainText(
    "Откройте письмо в том же браузере",
  );
  expect(service.calls).toEqual([]);
  await page.goto(
    "/auth/callback?error=access_denied&error_code=otp_expired&error_description=PRIVATE_TEXT",
  );
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await expect(page.getByRole("alert")).toContainText(
    "Ссылка недействительна или уже использована",
  );
  await expect(page.getByText("PRIVATE_TEXT")).toHaveCount(0);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Сілтеме жарамсыз");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const links = page.locator("main a.button");
  for (const link of await links.all())
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: info.outputPath("callback-invalid-kk-360.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await page.getByRole("link", { name: "Отправить письмо повторно" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("heading", { name: "Подтвердите адрес электронной почты" }),
  ).toBeVisible();
  expect(mail).toEqual([]);
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("callback@example.test");
  await page.getByRole("button", { name: "Отправить письмо повторно" }).click();
  await expect(page.getByRole("status")).toContainText("Запрос принят");
  expect(mail).toHaveLength(1);
  expect(mail[0].redirect).toBe("https://qadamx-taraz.pages.dev/auth/callback");
  expect(mail[0].body.code_challenge_method).toBe("s256");
  expect(service.unexpected).toEqual([]);
});
test("lost exchange response is not replayed after rerender or reload", async ({
  page,
}) => {
  await prepare(page);
  await signup(page);
  let exchanges = 0;
  await page.route("**/auth/v1/token?grant_type=pkce", async (route) => {
    exchanges++;
    await route.abort("failed");
  });
  await page.goto("/auth/callback?code=LOST_RESPONSE");
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось подтвердить результат",
  );
  await expect(page).toHaveURL(/\/auth\/callback$/);
  expect(exchanges).toBe(1);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Сілтеме жарамсыз");
  expect(exchanges).toBe(1);
});
test("/me refusal remains an error; explicit GET retry succeeds without another exchange", async ({
  page,
}) => {
  const { service } = await prepare(page);
  await signup(page);
  let refused = true;
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: refused ? 403 : 200,
      json: refused
        ? { error: { code: "ACCESS_DENIED", message: "PRIVATE" } }
        : { id: qaIds.a, businesses: [] },
    }),
  );
  await page.goto("/auth/callback?code=CONFIRM_THEN_DENIED");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await expect(page.getByText("У вас пока нет торговых точек")).toHaveCount(0);
  refused = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page).toHaveURL(/\/seller$/);
  await expect(page.getByText("У вас пока нет торговых точек")).toBeVisible();
  expect(
    service.calls.filter((call) => call.query === "?grant_type=pkce"),
  ).toHaveLength(1);
  expect(service.unexpected).toEqual([]);
});

test("a late real SDK exchange response cannot overwrite a newer B login", async ({
  page,
}) => {
  const { service } = await prepare(page);
  await page.route("**/api/v1/me", (route) => {
    const token = route.request().headers().authorization.split(" ")[1];
    const { sub } = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    return route.fulfill({ json: { id: sub, businesses: [] } });
  });
  await signup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let exchangeStarted = false;
  await page.route("**/auth/v1/token?grant_type=pkce", async (route) => {
    exchangeStarted = true;
    await held;
    await route.fallback();
  });
  await page.goto("/auth/callback?code=LATE_A");
  await expect.poll(() => exchangeStarted).toBe(true);
  // Same-document navigation: retain the pending exchange and AuthProvider.
  await page.evaluate(() => {
    history.pushState({}, "", "/login");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("b@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByText("У вас пока нет торговых точек")).toBeVisible();
  release();
  await expect
    .poll(
      () =>
        service.calls.filter((call) => call.query === "?grant_type=pkce")
          .length,
    )
    .toBe(1);
  const currentUser = () =>
    page.evaluate(() => {
      const key = Object.keys(localStorage).find((key) =>
        key.endsWith("-auth-token"),
      );
      return key ? JSON.parse(localStorage.getItem(key)!).user.id : null;
    });
  await expect.poll(currentUser).toBe(qaIds.b);
  await page.reload();
  await expect(page.getByText("У вас пока нет торговых точек")).toBeVisible();
  expect(await currentUser()).toBe(qaIds.b);
  expect(service.calls.filter((call) => call.path.endsWith("/logout"))).toEqual(
    [],
  );
  expect(service.unexpected).toEqual([]);
});
