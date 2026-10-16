import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { customerBody, readMe, readCustomers } from "../shared/api/bindings";
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
      expect(form.getByLabelText("Имя")).toHaveValue("QA Новый");
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
  it("a mocked transport timeout retains the form and never retries a POST", async () => {
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      init?.method === "POST"
        ? Promise.reject(new DOMException("Synthetic timeout", "TimeoutError"))
        : defaultFetch(input, init),
    );
    renderQa({ fetcher });
    const form = await openForm();
    await userEvent.click(
      form.getByRole("button", { name: "Создать клиента" }),
    );
    await form.findByText(
      "Нет связи с сервером. Проверьте подключение и повторите.",
    );
    expect(form.getByLabelText("Имя")).toHaveValue("QA Новый");
    expect(
      form.queryByText("Клиент создан на сервере."),
    ).not.toBeInTheDocument();
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
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
