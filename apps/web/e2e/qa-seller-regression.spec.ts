import { expect, test } from "@playwright/test";
import {
  customers,
  login,
  mockServices,
  newCustomer,
  qaIds,
} from "./qa-fixtures";

test.describe("QA browser regression — intercepted Supabase and API, never live", () => {
  test("mock login, session reload, business selection, logout and account B isolation", async ({
    page,
  }) => {
    const state = await mockServices(page);
    await login(page);
    await expect(
      page.getByRole("heading", { name: "Хорошего рабочего дня!" }),
    ).toBeVisible();
    await customers(page);
    await expect(
      page.getByRole("heading", { name: "QA Клиент A" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "QA Клиент A" }),
    ).toBeVisible();
    expect(state.calls.filter((c) => c.path.endsWith("/token"))).toHaveLength(
      1,
    );
    const form = await newCustomer(page);
    await form.getByRole("button", { name: "Отмена" }).click();
    await page
      .getByLabel("Торговая точка", { exact: true })
      .selectOption(qaIds.shopA2);
    await expect
      .poll(() => state.calls.some((c) => c.path.includes(qaIds.shopA2)))
      .toBe(true);
    await page
      .getByRole("button", { name: /Новый клиент/ })
      .first()
      .click();
    await expect(
      page.getByRole("dialog").getByLabel("Имя", { exact: true }),
    ).toHaveValue("");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Отмена" })
      .click();
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/seller/customers");
    await expect(page).toHaveURL(/\/login$/);
    await login(page, "b");
    await customers(page);
    await expect(
      page.getByRole("heading", { name: "QA Клиент B" }),
    ).toBeVisible();
    await expect(page.getByText("QA Клиент A", { exact: true })).toHaveCount(0);
    await expect(
      page.getByLabel("Торговая точка", { exact: true }).locator("option"),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: /Новый клиент/ })
      .first()
      .click();
    await expect(
      page.getByRole("dialog").getByLabel("Имя", { exact: true }),
    ).toHaveValue("");
    expect(state.unexpected).toEqual([]);
  });
  test("rejected mock login keeps private routes closed and never enters Demo", async ({
    page,
  }) => {
    const state = await mockServices(page);
    state.loginStatus = 400;
    await login(page);
    await expect(
      page.getByText("Не удалось войти. Проверьте данные и попробуйте снова."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(state.calls.some((c) => c.path.startsWith("/api/"))).toBe(false);
    await expect(page.locator(".demo-banner")).toHaveCount(0);
    expect(state.unexpected).toEqual([]);
  });
  test("POST waits for the server, sends null contact, refreshes the list and supports search", async ({
    page,
  }) => {
    const state = await mockServices(page);
    let release!: () => void;
    state.postGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await login(page);
    await customers(page);
    const form = await newCustomer(page);
    await form.getByRole("button", { name: "Создать клиента" }).click();
    await expect(
      form.getByRole("button", { name: "Сохранение…" }),
    ).toBeDisabled();
    await expect(page.getByRole("heading", { name: "QA Новый" })).toHaveCount(
      0,
    );
    release();
    await expect(form).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "QA Новый" })).toBeVisible();
    expect(
      state.calls
        .filter((c) => c.method === "POST" && c.path.endsWith("/customers"))
        .map((c) => c.body),
    ).toEqual([
      { display_name: "QA Новый", note: "Тестовая заметка", contact: null },
    ]);
    await page
      .getByLabel("Поиск по имени", { exact: true })
      .fill("  QA Новый  ");
    await expect(
      page.getByRole("heading", { name: "QA Клиент A" }),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "QA Новый" })).toBeVisible();
    expect(state.unexpected).toEqual([]);
  });
  for (const status of [403, 404, 409, 422, 429, 500]) {
    test(`POST ${status} retains inputs without false success or automatic Demo`, async ({
      page,
    }) => {
      const state = await mockServices(page);
      state.postStatus = status;
      await login(page);
      await customers(page);
      const form = await newCustomer(page);
      await form.getByRole("button", { name: "Создать клиента" }).click();
      if ([404, 422].includes(status)) {
        await expect(
          form.getByText(`Код для поддержки: ${qaIds.request}`),
        ).toBeVisible();
      } else {
        await expect(
          form.getByText(/Результат неизвестен: клиент мог быть создан/),
        ).toBeVisible();
      }
      await expect(form.getByLabel("Имя", { exact: true })).toHaveValue(
        "QA Новый",
      );
      await expect(form.getByLabel("Заметка", { exact: true })).toHaveValue(
        "Тестовая заметка",
      );
      await expect(form.getByText("Клиент создан на сервере.")).toHaveCount(0);
      await expect(page.locator(".demo-banner")).toHaveCount(0);
      await expect(
        page.getByText("PRIVATE_SERVER_TRACE_MUST_NOT_RENDER"),
      ).toHaveCount(0);
      expect(
        state.calls.filter(
          (c) => c.method === "POST" && c.path.endsWith("/customers"),
        ),
      ).toHaveLength(1);
      expect(state.unexpected).toEqual([]);
    });
  }
  test("expired JWT is represented by API 401 and removes private data", async ({
    page,
  }) => {
    const state = await mockServices(page);
    await login(page);
    await customers(page);
    await expect(
      page.getByRole("heading", { name: "QA Клиент A" }),
    ).toBeVisible();
    state.customerStatus = 401;
    await page.getByLabel("Поиск по имени", { exact: true }).fill("new-query");
    await expect(
      page.getByText("Сессия истекла. Войдите снова."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "QA Клиент A" }),
    ).toHaveCount(0);
    await expect(page.locator(".demo-banner")).toHaveCount(0);
    expect(state.unexpected).toEqual([]);
  });
  test("foreign business_id in a customer response is rejected", async ({
    page,
  }) => {
    const state = await mockServices(page);
    state.foreignCustomer = true;
    await login(page);
    await customers(page);
    await expect(
      page.getByRole("heading", { name: "Не удалось загрузить данные" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "QA Клиент A" }),
    ).toHaveCount(0);
    expect(state.unexpected).toEqual([]);
  });
  test("malformed successful JSON cannot close the create form or claim success", async ({
    page,
  }) => {
    const state = await mockServices(page);
    state.invalidPostJson = true;
    await login(page);
    await customers(page);
    const form = await newCustomer(page);
    await form.getByRole("button", { name: "Создать клиента" }).click();
    await expect(page.getByText("Клиент создан на сервере.")).toBeVisible();
    await expect(form).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "QA Новый" })).toBeVisible();
    expect(state.created).toHaveLength(1);
    expect(state.unexpected).toEqual([]);
  });
  test("a lost POST response is resolved from the durable receipt without another create", async ({
    page,
  }) => {
    const state = await mockServices(page);
    state.losePostResponse = true;
    await login(page);
    await customers(page);
    const form = await newCustomer(page);
    await form.getByRole("button", { name: "Создать клиента" }).click();
    await expect(form).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "QA Новый" })).toBeVisible();
    expect(state.created).toHaveLength(1);
    expect(
      state.calls.filter(
        (call) => call.method === "POST" && call.path.endsWith("/customers"),
      ),
    ).toHaveLength(1);
    expect(
      state.calls.filter((call) =>
        call.path.endsWith("/customer-creation-result"),
      ),
    ).toHaveLength(2);
    expect(state.unexpected).toEqual([]);
  });
  test("manual Demo never calls auth/API or writes financial/customer data, and reload exits Demo", async ({
    page,
  }) => {
    const state = await mockServices(page);
    await page.goto("/seller/customers");
    await expect(page).toHaveURL(/\/login$/);
    expect(state.calls).toEqual([]);
    await page.getByRole("button", { name: /Посмотреть демо/ }).click();
    await customers(page);
    const form = await newCustomer(page);
    await expect(
      form.getByRole("button", { name: "Создать клиента" }),
    ).toBeDisabled();
    await form.getByRole("button", { name: "Отмена" }).click();
    await page.locator('a[href="/seller/sale"]:visible').first().click();
    await expect(
      page.getByRole("heading", { name: "Новая запись" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Подтвердить запись", exact: true }),
    ).toBeDisabled();
    expect(state.calls).toEqual([]);
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    expect(state.calls).toEqual([]);
    expect(state.unexpected).toEqual([]);
  });
});
