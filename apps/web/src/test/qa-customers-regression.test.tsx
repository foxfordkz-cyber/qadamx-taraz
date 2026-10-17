import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  customerBody,
  customerInputErrors,
  readMe,
  readCustomers,
} from "../shared/api/bindings";
import { createApiClient } from "../shared/api/client";
import {
  customer,
  defaultFetch,
  deferred,
  errorBody,
  ids,
  json,
  meA,
  renderQa,
} from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  window.localStorage.clear();
});
async function openForm() {
  await screen.findByRole("heading", { name: "QA Клиент A" });
  await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
  const form = within(screen.getByRole("dialog"));
  await userEvent.type(form.getByLabelText("Имя"), "QA Новый");
  await userEvent.type(form.getByLabelText("Заметка"), "Тестовая заметка");
  return form;
}
describe("QA Customers — real bindings, hooks and HTTP transport with mock responses", () => {
  it("reuses the picker intent when the page form retries an unknown result", async () => {
    const keys: string[] = [];
    const created = customer(ids.shopA, "QA same intent", ids.customer2);
    const committedIds: string[] = [];
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/customer-creation-result")) {
        return Promise.resolve(
          json(
            committedIds.length
              ? { status: "completed", customer: created }
              : { status: "not_observed", customer: null },
          ),
        );
      }
      if (init?.method === "POST") {
        keys.push(new Headers(init.headers).get("Idempotency-Key") ?? "");
        if (keys.length === 1)
          return Promise.reject(new TypeError("Synthetic lost response"));
        committedIds.push(created.id);
        return Promise.resolve(json(created, 201));
      }
      return defaultFetch(input, init);
    });
    const qa = renderQa({ fetcher });
    await screen.findByRole("heading", { name: "QA Клиент A" });

    await userEvent.click(
      screen.getByRole("button", { name: "Выбрать клиента" }),
    );
    let dialog = within(screen.getByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Новый клиент" }));
    await userEvent.type(dialog.getByLabelText("Имя"), "QA same intent");
    await userEvent.click(
      dialog.getByRole("button", { name: "Создать клиента" }),
    );
    await waitFor(() => expect(keys).toHaveLength(1));
    await dialog.findByText(/Результат неизвестен: клиент мог быть создан/);
    const scopedIntentKey = `qadam.customer-create.v1:${encodeURIComponent(
      "https://qa.invalid/api/v1",
    )}:${ids.a}:${ids.shopA}`;
    const savedIntent = window.localStorage.getItem(scopedIntentKey);
    expect(savedIntent).not.toBeNull();
    expect(savedIntent).not.toContain("QA same intent");
    expect(
      window.localStorage.getItem(
        `qadam.customer-create.v1:${ids.a}:${ids.shopA}`,
      ),
    ).toBeNull();

    await userEvent.click(dialog.getByRole("button", { name: "Закрыть" }));
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Имя")).toHaveValue("QA same intent");
    await userEvent.click(
      dialog.getByRole("button", { name: "Безопасно повторить" }),
    );
    await screen.findByText("Клиент создан на сервере.");

    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    expect(committedIds).toEqual([ids.customer2]);
    expect(
      qa.fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(2);
  });
  it("reuses the Customers page intent when CustomerPicker retries an unknown result", async () => {
    const posts: { key: string; body: string }[] = [];
    const committedIds: string[] = [];
    const created = {
      ...customer(ids.shopA, "QA Новый", ids.customer2),
      note: "Тестовая заметка",
      balance_minor: 0,
    };
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/customer-creation-result")) {
        return Promise.resolve(
          json(
            committedIds.length
              ? { status: "completed", customer: created }
              : { status: "not_observed", customer: null },
          ),
        );
      }
      if (init?.method === "POST") {
        posts.push({
          key: new Headers(init.headers).get("Idempotency-Key") ?? "",
          body: String(init.body),
        });
        if (posts.length === 1)
          return Promise.reject(new TypeError("Synthetic lost response"));
        committedIds.push(created.id);
        return Promise.resolve(json(created, 201));
      }
      return defaultFetch(input, init);
    });
    renderQa({ fetcher });
    let dialog = await openForm();
    await userEvent.click(
      dialog.getByRole("button", { name: "Создать клиента" }),
    );
    await dialog.findByText(/Результат неизвестен: клиент мог быть создан/);
    expect(posts).toHaveLength(1);
    const scopedIntentKey = `qadam.customer-create.v1:${encodeURIComponent(
      "https://qa.invalid/api/v1",
    )}:${ids.a}:${ids.shopA}`;
    const savedIntent = window.localStorage.getItem(scopedIntentKey);
    expect(savedIntent).not.toBeNull();

    await userEvent.click(dialog.getByRole("button", { name: "Закрыть" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Выбрать клиента" }),
    );
    dialog = within(screen.getByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Новый клиент" }));
    expect(dialog.getByLabelText("Имя")).toHaveValue("QA Новый");
    expect(dialog.getByLabelText("Заметка")).toHaveValue("Тестовая заметка");
    await dialog.findByText(/Результат неизвестен: клиент мог быть создан/);
    expect(window.localStorage.getItem(scopedIntentKey)).toBe(savedIntent);
    expect(posts).toHaveLength(1);
    await userEvent.click(
      dialog.getByRole("button", { name: "Безопасно повторить" }),
    );
    await screen.findByText(/Выбран: QA Новый/);
    expect(posts).toHaveLength(2);
    expect(posts[1]).toEqual(posts[0]);
    expect(committedIds).toEqual([ids.customer2]);
    expect(window.localStorage.getItem(scopedIntentKey)).toBeNull();
  });
  it.each([403, 404, 409, 422, 429, 500])(
    "GET %i is an error, never empty data or automatic Demo",
    async (status) => {
      const qa = renderQa({
        fetcher: vi.fn((input, init) =>
          String(input).includes("/customers")
            ? Promise.resolve(json(errorBody(status), status))
            : defaultFetch(input, init),
        ),
      });
      await screen.findByRole(
        "heading",
        { name: "Не удалось загрузить данные" },
        { timeout: 3000 },
      );
      expect(screen.queryByText("Клиенты не найдены")).not.toBeInTheDocument();
      expect(
        screen.queryByText("PRIVATE_SERVER_TRACE_MUST_NOT_RENDER"),
      ).not.toBeInTheDocument();
      expect(qa.auth().demo).toBe(false);
      expect(
        screen.queryByText("Демо-режим · только просмотр"),
      ).not.toBeInTheDocument();
    },
  );
  it.each([403, 404, 409, 422, 429, 500])(
    "POST %i preserves fields, avoids success and never retries the mutation",
    async (status) => {
      const fetcher = vi.fn<typeof fetch>((input, init) =>
        init?.method === "POST"
          ? Promise.resolve(json(errorBody(status), status))
          : defaultFetch(input, init),
      );
      renderQa({ fetcher });
      const form = await openForm();
      await userEvent.click(
        form.getByRole("button", { name: "Создать клиента" }),
      );
      await form.findByText(`Код для поддержки: ${ids.request}`);
      if (status >= 500) {
        await form.findByText(
          "Результат неизвестен: клиент мог быть создан. Не начинайте создание заново. Проверьте результат или безопасно повторите запрос с теми же данными.",
        );
      }
      expect(screen.getByLabelText("Имя")).toHaveValue("QA Новый");
      expect(form.getByLabelText("Заметка")).toHaveValue("Тестовая заметка");
      expect(form.getByLabelText("Контакт (необязательно)")).toHaveValue("");
      expect(
        form.queryByText("Клиент создан на сервере."),
      ).not.toBeInTheDocument();
      expect(
        form.queryByText("PRIVATE_SERVER_TRACE_MUST_NOT_RENDER"),
      ).not.toBeInTheDocument();
      expect(
        fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(1);
      expect(
        fetcher.mock.calls.filter(([url]) =>
          String(url).includes("/customers"),
        ),
      ).toHaveLength(2);
    },
  );
  it("401 POST clears private queries, requests login and preserves the same user's draft", async () => {
    const qa = renderQa({
      fetcher: vi.fn((input, init) =>
        init?.method === "POST"
          ? Promise.resolve(json(errorBody(401), 401))
          : defaultFetch(input, init),
      ),
    });
    const form = await openForm();
    await userEvent.click(
      form.getByRole("button", { name: "Создать клиента" }),
    );
    await screen.findByText("Сессия истекла. Войдите снова.");
    expect(
      qa.cache
        .getQueryCache()
        .getAll()
        .every((q) => q.state.data === undefined),
    ).toBe(true);
    expect(qa.auth().demo).toBe(false);
    act(() => qa.mock.emit(qa.auth().session, "TOKEN_REFRESHED"));
    await screen.findByRole("heading", { name: "QA Клиент A" });
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    expect(
      within(screen.getByRole("dialog")).getByLabelText("Имя"),
    ).toHaveValue("QA Новый");
  });
  it("does not show success before POST; invalidates only the current business after 201", async () => {
    const saved = deferred<Response>();
    let confirmed = false;
    const created = customer(ids.shopA, "QA Новый", ids.customer2);
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      if (init?.method === "POST") return saved.promise;
      if (
        confirmed &&
        String(input).includes(`/businesses/${ids.shopA}/customers`)
      )
        return Promise.resolve(
          json({ items: [customer(), created], next_cursor: null }),
        );
      return defaultFetch(input, init);
    });
    const qa = renderQa({ fetcher });
    const form = await openForm();
    const otherKey = [qa.auth().scope, ids.shopA2, "customers", ""];
    qa.cache.setQueryData(otherKey, {
      pages: [{ items: [], next_cursor: null }],
      pageParams: [null],
    });
    await userEvent.click(
      form.getByRole("button", { name: "Создать клиента" }),
    );
    expect(form.getByRole("button", { name: "Сохранение…" })).toBeDisabled();
    expect(
      screen.queryByRole("heading", { name: "QA Новый" }),
    ).not.toBeInTheDocument();
    const post = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      display_name: "QA Новый",
      note: "Тестовая заметка",
      contact: null,
    });
    confirmed = true;
    await act(async () => {
      saved.resolve(json(created, 201));
    });
    await screen.findByText("Клиент создан на сервере.");
    await screen.findByRole("heading", { name: "QA Новый" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      fetcher.mock.calls.filter(([url]) =>
        String(url).includes(`/businesses/${ids.shopA}/customers`),
      ),
    ).toHaveLength(3);
    expect(qa.cache.getQueryState(otherKey)?.isInvalidated).toBe(false);
  });
  it("paginates with the same normalized q and distinct IDs for duplicate names", async () => {
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = new URL(String(input));
      if (!url.pathname.endsWith("/customers"))
        return defaultFetch(input, init);
      const second = url.searchParams.has("cursor");
      return Promise.resolve(
        json({
          items: [
            customer(
              ids.shopA,
              "QA Одноимённый",
              second ? ids.customer2 : ids.customer,
            ),
          ],
          next_cursor: second ? null : ids.customer,
        }),
      );
    });
    renderQa({ fetcher });
    await screen.findByRole("heading", { name: "QA Одноимённый" });
    await userEvent.type(
      screen.getByLabelText("Поиск по имени"),
      "  И\u0306 & ?  ",
    );
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(
          ([url]) => new URL(String(url)).searchParams.get("q") === "Й & ?",
        ),
      ).toBe(true),
    );
    await screen.findByRole("button", { name: "Показать ещё" });
    await userEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
    await waitFor(() =>
      expect(
        screen.getAllByRole("heading", { name: "QA Одноимённый" }),
      ).toHaveLength(2),
    );
    const last = new URL(String(fetcher.mock.calls.at(-1)![0]));
    expect(Object.fromEntries(last.searchParams)).toEqual({
      q: "Й & ?",
      cursor: ids.customer,
      limit: "50",
    });
    expect(
      screen.queryByRole("button", { name: "Показать ещё" }),
    ).not.toBeInTheDocument();
  });
  it.each(["malformed", "foreign"])(
    "POST %s success response cannot produce false success",
    async (kind) => {
      renderQa({
        fetcher: vi.fn((input, init) =>
          init?.method === "POST"
            ? Promise.resolve(
                kind === "malformed"
                  ? new Response("<html>", { status: 201 })
                  : json(customer(ids.shopB), 201),
              )
            : defaultFetch(input, init),
        ),
      });
      const form = await openForm();
      await userEvent.click(
        form.getByRole("button", { name: "Создать клиента" }),
      );
      await waitFor(() => expect(form.getByRole("alert")).toBeInTheDocument());
      expect(form.getByLabelText("Имя")).toHaveValue("QA Новый");
      expect(
        form.queryByText("Клиент создан на сервере."),
      ).not.toBeInTheDocument();
    },
  );
  it("rejects empty name in the form without a POST", async () => {
    const qa = renderQa();
    await screen.findByRole("heading", { name: "QA Клиент A" });
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Создать клиента",
      }),
    );
    await screen.findByText("Укажите имя клиента.");
    expect(
      qa.fetcher.mock.calls.some(([, init]) => init?.method === "POST"),
    ).toBe(false);
  });
  it("a mocked transport timeout remains unknown and offers a safe same-key retry", async () => {
    let postCount = 0;
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      init?.method === "POST"
        ? ++postCount === 1
          ? Promise.reject(
              new DOMException("Synthetic timeout", "TimeoutError"),
            )
          : Promise.resolve(json(customer(ids.shopA, "QA Новый"), 201))
        : defaultFetch(input, init),
    );
    renderQa({ fetcher });
    const form = await openForm();
    await userEvent.click(
      form.getByRole("button", { name: "Создать клиента" }),
    );
    await form.findByText(
      "Результат неизвестен: клиент мог быть создан. Не начинайте создание заново. Проверьте результат или безопасно повторите запрос с теми же данными.",
    );
    expect(form.getByLabelText("Имя")).toHaveValue("QA Новый");
    expect(
      form.queryByText("Клиент создан на сервере."),
    ).not.toBeInTheDocument();
    expect(
      form.queryByText(
        "Нет связи с сервером. Проверьте подключение и повторите.",
      ),
    ).not.toBeInTheDocument();
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    const firstPost = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    const key = new Headers(firstPost[1]?.headers).get("Idempotency-Key");
    expect(key).toMatch(/^[!-~]{1,200}$/);
    await userEvent.click(
      form.getByRole("button", { name: "Безопасно повторить" }),
    );
    await screen.findByText("Клиент создан на сервере.");
    const posts = fetcher.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts).toHaveLength(2);
    expect(
      posts.map(([, init]) =>
        new Headers(init?.headers).get("Idempotency-Key"),
      ),
    ).toEqual([key, key]);
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual(
      JSON.parse(String(posts[1][1]?.body)),
    );
  });
  it("recovers a saved result after reload without posting again", async () => {
    const key = "persistent-customer-intent-1";
    window.localStorage.setItem(
      `qadam.customer-create.v1:${encodeURIComponent("https://qa.invalid/api/v1")}:${ids.a}:${ids.shopA}`,
      JSON.stringify({ key, bodyHash: "a".repeat(64) }),
    );
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      String(input).endsWith("/customer-creation-result")
        ? Promise.resolve(
            json({
              status: "completed",
              customer: customer(ids.shopA, "QA Восстановлен"),
            }),
          )
        : defaultFetch(input, init),
    );
    renderQa({ fetcher });
    await screen.findByText("Клиент создан на сервере.");
    const lookup = fetcher.mock.calls.find(([url]) =>
      String(url).endsWith("/customer-creation-result"),
    );
    expect(new Headers(lookup?.[1]?.headers).get("Idempotency-Key")).toBe(key);
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false,
    );
  });
  it("shows an unresolved saved result in Kazakh after the customer page reloads", async () => {
    window.localStorage.setItem(
      `qadam.customer-create.v1:${encodeURIComponent("https://qa.invalid/api/v1")}:${ids.a}:${ids.shopA}`,
      JSON.stringify({
        key: "persistent-customer-intent-2",
        bodyHash: "b".repeat(64),
      }),
    );
    renderQa();
    await screen.findByText(
      "Результат неизвестен: клиент мог быть создан. Не начинайте создание заново. Проверьте результат или безопасно повторите запрос с теми же данными.",
    );
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    await screen.findByText(
      "Нәтиже белгісіз: клиент құрылуы мүмкін. Қайтадан жаңасын құрмаңыз. Нәтижені тексеріңіз немесе сол деректермен қауіпсіз қайталаңыз.",
    );
  });
  it("creates a customer through the sale CustomerPicker using the recovery flow", async () => {
    const fetcher = vi.fn(defaultFetch);
    renderQa({ route: "/seller/sale", fetcher });
    await screen.findByRole("heading", { name: "Новая запись" });
    await userEvent.click(
      screen.getByRole("button", { name: "Выбрать клиента" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Новый клиент" }),
    );
    const name = screen.getByLabelText("Имя");
    const form = within(name.closest("form")!);
    await userEvent.type(name, "Picker recovery");
    await userEvent.click(
      form.getByRole("button", { name: "Создать клиента" }),
    );
    await screen.findByText(/Клиент: Picker recovery/);
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    const post = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(new Headers(post[1]?.headers).get("Idempotency-Key")).toMatch(
      /^[!-~]{1,200}$/,
    );
  });
  it.each(["display_name", "note", "contact"] as const)(
    "enforces the %s request limit at the boundary",
    (field) => {
      const max = field === "note" ? 2000 : 200;
      const input = {
        display_name: "QA",
        note: "",
        contact: "",
        [field]: "я".repeat(max),
      };
      expect(customerBody(input)[field]).toHaveLength(max);
      expect(() =>
        customerBody({ ...input, [field]: "я".repeat(max + 1) }),
      ).toThrow();
    },
  );
  it("validates customer input limits by Unicode code points before any POST", async () => {
    expect(
      customerInputErrors({
        display_name: "я".repeat(201),
        note: "я".repeat(2001),
        contact: "я".repeat(201),
      }),
    ).toEqual({
      display_name: "tooLong",
      note: "tooLong",
      contact: "tooLong",
    });
    const qa = renderQa();
    const form = await openForm();
    const name = form.getByLabelText("Имя");
    await userEvent.clear(name);
    fireEvent.change(name, { target: { value: "я".repeat(201) } });
    await userEvent.click(
      form.getByRole("button", { name: "Создать клиента" }),
    );
    await form.findByText("Имя клиента должно быть не длиннее 200 символов.");
    expect(
      qa.fetcher.mock.calls.some(([, init]) => init?.method === "POST"),
    ).toBe(false);
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "KZ" }),
    );
    await form.findByText("Клиент есімі 200 таңбадан аспауы керек.");
  });
  it.each(["bad-uuid", "../../other", "", null])(
    "rejects malformed membership and customer UUID %s",
    (id) => {
      expect(() =>
        readMe({ ...meA, businesses: [{ ...meA.businesses[0], id }] }),
      ).toThrow();
      expect(() =>
        readCustomers({ items: [{ ...customer(), id }], next_cursor: null }),
      ).toThrow();
    },
  );
  it("supports a caller deadline via AbortSignal without mapping cancellation to success", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("QA deadline", "AbortError")),
            { once: true },
          );
        }),
    );
    const api = createApiClient({
      baseUrl: "https://qa.invalid",
      getToken: async () => "qa-only",
      fetcher,
    });
    const result = api
      .request("/me", { signal: controller.signal })
      .catch((error) => error);
    await Promise.resolve();
    setTimeout(() => controller.abort(), 100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
