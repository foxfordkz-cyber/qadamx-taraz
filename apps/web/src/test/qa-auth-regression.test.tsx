import { act, screen, waitFor, within, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BusinessProvider, useBusiness } from "../app/runtime";
import { createApiClient } from "../shared/api/client";
import {
  customer,
  defaultFetch,
  deferred,
  ids,
  json,
  meA,
  renderQa,
  session,
} from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("QA auth and isolation — mock transport through production App", () => {
  it("signs in with the mock Supabase client and loads memberships using Bearer", async () => {
    const qa = renderQa({ initial: null, route: "/login" });
    await screen.findByRole("button", { name: "Войти" });
    await userEvent.type(
      screen.getByLabelText("Электронная почта"),
      "seller@example.test",
    );
    await userEvent.type(
      screen.getByLabelText("Пароль", { exact: true }),
      "synthetic-qa-password",
    );
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));
    await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
    expect(qa.mock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "seller@example.test",
      password: "synthetic-qa-password",
    });
    expect(
      new Headers(qa.fetcher.mock.calls[0][1]?.headers).get("Authorization"),
    ).toBe(`Bearer ${session().access_token}`);
    expect(qa.auth().demo).toBe(false);
  });
  it("keeps failed login on the login screen without enabling Demo", async () => {
    const qa = renderQa({ initial: null, route: "/login" });
    qa.mock.auth.signInWithPassword.mockRejectedValue(
      new Error("mock invalid credentials"),
    );
    await screen.findByLabelText("Электронная почта");
    await userEvent.type(
      screen.getByLabelText("Электронная почта"),
      "seller@example.test",
    );
    await userEvent.type(
      screen.getByLabelText("Пароль", { exact: true }),
      "synthetic-qa-password",
    );
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));
    await screen.findByText(
      "Не удалось войти. Проверьте данные и попробуйте снова.",
    );
    expect(qa.fetcher).not.toHaveBeenCalled();
    expect(qa.auth().demo).toBe(false);
  });
  it.each([
    "",
    "/customers",
    "/inquiries",
    "/catalog",
    "/sale",
    "/debts",
    "/history",
    "/summary",
  ])("protects /seller%s with no session", async (route) => {
    const qa = renderQa({
      initial: null,
      route: `/seller${route}?business_id=${ids.shopB}`,
    });
    await screen.findByRole("button", { name: "Войти" });
    expect(qa.fetcher).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Торговая точка")).not.toBeInTheDocument();
  });
  it("restores INITIAL_SESSION and ignores a foreign business query parameter", async () => {
    const qa = renderQa({
      route: `/seller/customers?business_id=${ids.shopB}`,
    });
    await screen.findByRole("heading", { name: "QA Клиент A" });
    expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopA);
    expect(
      within(screen.getByLabelText("Торговая точка")).getAllByRole("option"),
    ).toHaveLength(2);
    expect(
      qa.fetcher.mock.calls.every(([url]) => !String(url).includes(ids.shopB)),
    ).toBe(true);
  });
  it("rejects a missing JWT before HTTP and enters reauthentication", async () => {
    const qa = renderQa({ initial: session(ids.a, "") });
    await screen.findByText("Сессия истекла. Войдите снова.");
    expect(qa.fetcher).not.toHaveBeenCalled();
    expect(qa.auth().expired).toBe(true);
    expect(qa.auth().demo).toBe(false);
    expect(
      qa.cache
        .getQueryCache()
        .getAll()
        .every((q) => q.state.data === undefined),
    ).toBe(true);
  });
  it("clears cached customers and private drafts on logout then account B", async () => {
    const qa = renderQa();
    await screen.findByRole("heading", { name: "QA Клиент A" });
    const scopeA = qa.auth().scope;
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    await userEvent.type(
      within(screen.getByRole("dialog")).getByLabelText("Имя"),
      "PRIVATE DRAFT A",
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Отмена",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
    await screen.findByRole("button", { name: "Войти" });
    expect(
      qa.cache
        .getQueryCache()
        .getAll()
        .every((q) => q.state.data === undefined),
    ).toBe(true);
    act(() => qa.mock.emit(session(ids.b)));
    await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
    await userEvent.click(screen.getAllByRole("link", { name: "Клиенты" })[0]);
    await screen.findByRole("heading", { name: "QA Клиент B" });
    expect(screen.queryByText("QA Клиент A")).not.toBeInTheDocument();
    expect(
      qa.cache
        .getQueryCache()
        .getAll()
        .every((q) => q.queryKey[0] !== scopeA),
    ).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    expect(
      within(screen.getByRole("dialog")).getByLabelText("Имя"),
    ).toHaveValue("");
  });
  it("drops a late successful A response after switching to B even if transport ignores abort", async () => {
    const late = deferred<Response>();
    let oldSignal: AbortSignal | null | undefined;
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      if (String(input).includes(`/businesses/${ids.shopA}/customers`)) {
        oldSignal = init?.signal;
        return late.promise;
      }
      return defaultFetch(input, init);
    });
    const qa = renderQa({ fetcher });
    await waitFor(() => expect(oldSignal).toBeDefined());
    const scopeA = qa.auth().scope;
    act(() => qa.mock.emit(session(ids.b)));
    await screen.findByRole("heading", { name: "QA Клиент B" });
    expect(oldSignal?.aborted).toBe(true);
    await act(async () => {
      late.resolve(
        json({
          items: [customer(ids.shopA, "LATE PRIVATE A")],
          next_cursor: null,
        }),
      );
    });
    expect(screen.queryByText("LATE PRIVATE A")).not.toBeInTheDocument();
    expect(
      qa.cache
        .getQueryCache()
        .getAll()
        .every((q) => q.queryKey[0] !== scopeA),
    ).toBe(true);
  });
  it("does not expire B when a pending A request returns 401", async () => {
    const qa = renderQa();
    await screen.findByRole("heading", { name: "QA Клиент A" });
    const late = deferred<Response>();
    const started = vi.fn(() => late.promise);
    const oldAuth = qa.auth();
    const pending = createApiClient({
      baseUrl: "https://qa.invalid",
      getToken: oldAuth.getToken,
      onUnauthorized: oldAuth.markExpired,
      fetcher: started,
    })
      .request("/me")
      .catch((error) => error);
    await waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    act(() => qa.mock.emit(session(ids.b)));
    await screen.findByRole("heading", { name: "QA Клиент B" });
    await act(async () => {
      late.resolve(json({}, 401));
      await pending;
    });
    expect(qa.auth().expired).toBe(false);
    expect(
      screen.getByRole("heading", { name: "QA Клиент B" }),
    ).toBeInTheDocument();
  });
  it("uses separate business query keys and restores only that business's draft", async () => {
    const qa = renderQa();
    await screen.findByRole("heading", { name: "QA Клиент A" });
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    await userEvent.type(
      within(screen.getByRole("dialog")).getByLabelText("Имя"),
      "SHOP A DRAFT",
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Отмена",
      }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Торговая точка"),
      ids.shopA2,
    );
    await waitFor(() =>
      expect(
        qa.cache.getQueryData([qa.auth().scope, ids.shopA2, "customers", ""]),
      ).toBeDefined(),
    );
    expect(
      qa.cache.getQueryData([qa.auth().scope, ids.shopA, "customers", ""]),
    ).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    expect(
      within(screen.getByRole("dialog")).getByLabelText("Имя"),
    ).toHaveValue("");
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Отмена",
      }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Торговая точка"),
      ids.shopA,
    );
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    expect(
      within(screen.getByRole("dialog")).getByLabelText("Имя"),
    ).toHaveValue("SHOP A DRAFT");
  });
  it("ignores direct foreign selection and removes a revoked selected membership", async () => {
    function Probe() {
      const b = useBusiness();
      return (
        <>
          <output>{b.business.id}</output>
          <button onClick={() => b.selectBusiness(ids.shopB)}>foreign</button>
          <button onClick={() => b.selectBusiness(ids.shopA2)}>allowed</button>
        </>
      );
    }
    const view = render(
      <BusinessProvider businesses={meA.businesses}>
        <Probe />
      </BusinessProvider>,
    );
    await userEvent.click(screen.getByText("foreign"));
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA);
    await userEvent.click(screen.getByText("allowed"));
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA2);
    view.rerender(
      <BusinessProvider businesses={[meA.businesses[0]]}>
        <Probe />
      </BusinessProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA);
  });
});

describe("document title", () => {
  it("names the cabinet only on login and seller routes", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json({ items: [], next_cursor: null }));
    const publicView = renderQa({ initial: null, route: "/", fetcher });
    await waitFor(() =>
      expect(document.title).toBe("Магазины рынков Тараза · Qadam Business"),
    );
    publicView.unmount();
    renderQa({ initial: null, route: "/login" });
    await screen.findByRole("button", { name: "Войти" });
    expect(document.title).toBe("Кабинет продавца · Qadam Business");
  });
});
