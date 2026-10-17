import { expect, test, type Page } from "@playwright/test";
import { mockServices, qaIds } from "./qa-fixtures";

async function registrationServices(page: Page) {
  const service = await mockServices(page);
  const calls: {
    kind: string;
    body: Record<string, unknown>;
    query: string;
  }[] = [];
  await page.route(
    "**/__qa_supabase/auth/v1/{signup,resend}*",
    async (route) => {
      const url = new URL(route.request().url());
      const kind = url.pathname.split("/").at(-1)!;
      calls.push({
        kind,
        body: route.request().postDataJSON(),
        query: url.search,
      });
      await route.fulfill({
        json: kind === "signup" ? { id: qaIds.a, identities: [] } : {},
      });
    },
  );
  return { service, calls };
}
async function fill(page: Page) {
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("registration@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await page
    .getByLabel("Подтвердите пароль", { exact: true })
    .fill("synthetic-password");
}
for (const width of [360, 390, 768, 1440]) {
  test(`registration and resend: real SDK, RU/KZ, reload, keyboard at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const { service, calls } = await registrationServices(page);
    await page.goto("/login");
    await page.getByRole("link", { name: "Создать аккаунт" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { name: "Регистрация", exact: true }),
    ).toBeFocused();
    await fill(page);
    await page.getByRole("checkbox", { name: "Показать пароль" }).check();
    await expect(page.getByLabel("Пароль", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
    await expect(page.getByLabel("Подтвердите пароль")).toHaveAttribute(
      "type",
      "text",
    );
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(page.getByLabel("Құпиясөз", { exact: true })).toHaveValue(
      "synthetic-password",
    );
    await expect(page.getByLabel("Құпиясөзді растаңыз")).toHaveValue(
      "synthetic-password",
    );
    await page.getByRole("button", { name: "RU", exact: true }).click();
    await page.getByLabel("Подтвердите пароль").focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("checkbox", { name: "Показать пароль" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Зарегистрироваться" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", {
        name: "Подтвердите адрес электронной почты",
      }),
    ).toBeFocused();
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({
      email: "registration@example.test",
      password: "synthetic-password",
    });
    expect(new URLSearchParams(calls[0].query).get("redirect_to")).toBe(
      "https://qadamx-taraz.vercel.app/auth/callback",
    );
    expect(calls[0].body.code_challenge_method).toBe("s256");
    expect(calls[0].body.code_challenge).toEqual(expect.any(String));
    await expect(
      page.locator('input[autocomplete="new-password"]'),
    ).toHaveCount(0);
    expect(service.calls).toEqual([]); // no token, /me, Demo or money calls
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Электрондық поштаңызды растаңыз" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`registration-waiting-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Электрондық поштаңызды растаңыз" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Электрондық пошта", { exact: true }),
    ).toHaveValue("");
    expect(calls).toHaveLength(1); // no automatic signup/resend on reload
    const storage = await page.evaluate(() => ({
      session: { ...sessionStorage },
      local: { ...localStorage },
    }));
    expect(JSON.stringify(storage)).not.toMatch(
      /registration@example|synthetic-password|access_token/,
    );
    await page.getByRole("button", { name: "RU", exact: true }).click();
    await page
      .getByLabel("Электронная почта", { exact: true })
      .fill("registration@example.test");
    await page
      .getByRole("button", { name: "Отправить письмо повторно" })
      .click();
    await expect(page.getByRole("status")).toContainText("Запрос принят.");
    expect(calls).toHaveLength(2);
    expect(calls[1].body).toMatchObject({
      type: "signup",
      email: "registration@example.test",
    });
    expect(calls[1].body).not.toHaveProperty("password");
    await page.getByRole("link", { name: "Вернуться ко входу" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/seller?business_id=" + qaIds.shopB);
    await expect(page).toHaveURL(/\/login$/);
    expect(service.calls).toEqual([]);
    expect(service.unexpected).toEqual([]);
  });
}

test("invalid email, short password and mismatch never reach the real SDK transport", async ({
  page,
}) => {
  const { calls } = await registrationServices(page);
  await page.goto("/register");
  await fill(page);
  await page.getByLabel("Электронная почта", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  expect(calls).toEqual([]);
  await fill(page);
  await page.getByLabel("Пароль", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  expect(calls).toEqual([]);
  await fill(page);
  await page.getByLabel("Подтвердите пароль").fill("different");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page.getByRole("alert")).toHaveText("Пароли не совпадают.");
  await expect(page.getByLabel("Подтвердите пароль")).toBeFocused();
  expect(calls).toEqual([]);
});

for (const code of [
  "weak_password",
  "user_already_exists",
  "over_email_send_rate_limit",
  "network",
]) {
  test(`real SDK signup error: ${code}; no private data or automatic retry`, async ({
    page,
  }) => {
    const { service } = await registrationServices(page);
    let count = 0;
    await page.route("**/auth/v1/signup*", async (route) => {
      count++;
      if (code === "network") return route.abort("failed");
      await route.fulfill({
        status: code === "over_email_send_rate_limit" ? 429 : 422,
        headers: { "X-Supabase-Api-Version": "2024-01-01" },
        json: { code, msg: "PRIVATE_AUTH_DETAILS" },
      });
    });
    await page.goto("/register");
    await fill(page);
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    if (code === "user_already_exists") {
      await expect(
        page.getByRole("heading", {
          name: "Подтвердите адрес электронной почты",
        }),
      ).toBeVisible();
    } else
      await expect(page.getByRole("alert")).toContainText(
        code === "weak_password"
          ? "Выберите более надёжный пароль"
          : code === "network"
            ? "Не удалось получить ответ"
            : "Слишком много запросов",
      );
    await expect(page.getByText("PRIVATE_AUTH_DETAILS")).toHaveCount(0);
    expect(count).toBe(1);
    expect(service.calls).toEqual([]);
    expect(service.unexpected).toEqual([]);
  });
}

test("pending signup/resend each permit one HTTP request; resend rate limit does not retry", async ({
  page,
}) => {
  const { service } = await registrationServices(page);
  let release!: () => void;
  let gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let signups = 0;
  let resends = 0;
  await page.route("**/auth/v1/signup*", async (route) => {
    signups++;
    await gate;
    await route.fulfill({ json: { id: qaIds.a } });
  });
  await page.route("**/auth/v1/resend*", async (route) => {
    resends++;
    await gate;
    await route.fulfill({
      status: 429,
      headers: { "X-Supabase-Api-Version": "2024-01-01" },
      json: { code: "over_email_send_rate_limit", msg: "PRIVATE" },
    });
  });
  await page.goto("/register");
  await fill(page);
  const duplicate = () =>
    page.locator("form").evaluate((form: HTMLFormElement) => {
      form.requestSubmit();
      form.requestSubmit();
    });
  await duplicate();
  await expect.poll(() => signups).toBe(1);
  await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
  await page
    .getByRole("link", { name: "Вернуться ко входу" })
    .evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page).toHaveURL(/\/register$/);
  release();
  await expect(
    page.getByRole("heading", { name: "Подтвердите адрес электронной почты" }),
  ).toBeVisible();
  gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await duplicate();
  await expect.poll(() => resends).toBe(1);
  release();
  await expect(page.getByRole("alert")).toContainText("Слишком много запросов");
  expect(signups).toBe(1);
  expect(resends).toBe(1);
  expect(service.calls).toEqual([]);
});
