import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultFetch,
  deferred,
  ids,
  json,
  renderQa,
  session,
} from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("existing Auth onboarding boundaries — synthetic SDK/HTTP", () => {
  it.each([
    "",
    "/customers",
    "/sale",
    "/debts",
    "/history",
    "/summary",
    "/analytics",
  ])(
    "keeps an authenticated zero-membership user on an empty state at /seller%s",
    async (route) => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        json({ id: ids.a, businesses: [] }),
      );
      const qa = renderQa({
        route: `/seller${route}?business_id=${ids.shopB}`,
        fetcher,
      });
      await screen.findByRole("heading", {
        name: "У вас пока нет торговых точек",
      });
      expect(qa.auth().session?.user.id).toBe(ids.a);
      expect(qa.auth().demo).toBe(false);
      expect(screen.queryByLabelText("Торговая точка")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Посмотреть демо/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("QA MART")).not.toBeInTheDocument();
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(String(fetcher.mock.calls[0][0])).toBe(
        "https://qa.invalid/api/v1/me",
      );
      expect(
        new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization"),
      ).toBe(`Bearer ${session().access_token}`);
      await userEvent.click(screen.getByRole("button", { name: "KZ" }));
      await screen.findByRole("heading", {
        name: "Сізде әзірге сауда нүктелері жоқ",
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("refetches only /me on request and unlocks only server-assigned memberships", async () => {
    let assigned = false;
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      !assigned
        ? Promise.resolve(json({ id: ids.a, businesses: [] }))
        : defaultFetch(input, init),
    );
    renderQa({ route: "/seller/customers", fetcher });
    await screen.findByRole("heading", {
      name: "У вас пока нет торговых точек",
    });
    expect(
      screen.getByText(
        /Создание точки и приглашения в кабинете пока недоступны/,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Обновить" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(
      screen.getByRole("heading", { name: "У вас пока нет торговых точек" }),
    ).toBeInTheDocument();
    expect(
      fetcher.mock.calls.every(([url]) => String(url).endsWith("/me")),
    ).toBe(true);
    assigned = true;
    await userEvent.click(screen.getByRole("button", { name: "Обновить" }));
    await screen.findByRole("heading", { name: "QA Клиент A" });
    expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopA);
    expect(
      fetcher.mock.calls.every(
        ([, init]) => !init?.method || init.method === "GET",
      ),
    ).toBe(true);
  });

  it("lets a zero-membership user log out without manufacturing access", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      json({ id: ids.a, businesses: [] }),
    );
    const qa = renderQa({ route: "/seller", fetcher });
    await screen.findByRole("heading", {
      name: "У вас пока нет торговых точек",
    });
    await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
    await screen.findByRole("button", { name: "Войти" });
    expect(qa.auth().session).toBeNull();
    expect(qa.auth().demo).toBe(false);
    expect(qa.mock.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("drops the empty user's scope when an existing owner signs in", async () => {
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      new Headers(init?.headers).get("Authorization")?.includes(ids.a)
        ? Promise.resolve(json({ id: ids.a, businesses: [] }))
        : defaultFetch(input, init),
    );
    const qa = renderQa({ fetcher });
    await screen.findByRole("heading", {
      name: "У вас пока нет торговых точек",
    });
    const oldScope = qa.auth().scope;
    act(() => qa.mock.emit(session(ids.b)));
    await screen.findByRole("heading", { name: "QA Клиент B" });
    expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopB);
    expect(
      qa.cache
        .getQueryCache()
        .getAll()
        .every((query) => query.queryKey[0] !== oldScope),
    ).toBe(true);
  });

  it("describes Demo in RU/KZ and keeps financial confirmation read-only without auth or API requests", async () => {
    const qa = renderQa({ initial: null, route: "/login" });
    await screen.findByText(
      "В деморежиме используются учебные данные; изменения не сохраняются",
    );
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    await screen.findByText(
      "Демо режимінде оқу деректері қолданылады; өзгерістер сақталмайды",
    );
    await userEvent.click(screen.getByRole("button", { name: "RU" }));
    await userEvent.click(
      screen.getByRole("button", { name: /Посмотреть демо/ }),
    );
    await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
    await userEvent.click(screen.getAllByRole("link", { name: "Продажа" })[0]);
    await screen.findByText("Учебный просмотр: денежная запись отключена");
    expect(
      screen.getByRole("button", { name: "Подтвердить запись" }),
    ).toBeDisabled();
    expect(qa.mock.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(qa.mock.auth.getSession).not.toHaveBeenCalled();
    expect(qa.fetcher).not.toHaveBeenCalled();
  });

  it("submits Login only once for synchronous duplicate submits while authentication is pending", async () => {
    const qa = renderQa({ initial: null, route: "/login" });
    const held =
      deferred<Awaited<ReturnType<typeof qa.mock.auth.signInWithPassword>>>();
    qa.mock.auth.signInWithPassword.mockImplementation(() => held.promise);
    await screen.findByRole("button", { name: "Войти" });
    await userEvent.type(
      screen.getByLabelText("Электронная почта"),
      "qa@example.test",
    );
    await userEvent.type(
      screen.getByLabelText("Пароль", { exact: true }),
      "synthetic-password",
    );
    const form = screen.getByRole("button", { name: "Войти" }).closest("form")!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(qa.mock.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    await act(async () =>
      held.resolve({
        data: { session: session() },
        error: new Error("synthetic auth rejection"),
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Войти" })).toBeEnabled(),
    );
    expect(qa.auth().demo).toBe(false);
    expect(qa.fetcher).not.toHaveBeenCalled();
  });
});
