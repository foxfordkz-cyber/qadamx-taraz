import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthApiError, type Session } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { AuthProvider, useAuth } from "../app/auth";
import {
  callbackAwareFetch,
  captureAuthCallback,
  completeAuthCallback,
  type CallbackAttempt,
} from "../app/auth-callback-model";
import { makeQueryClient } from "../app/query";
import { I18nProvider } from "../shared/i18n";
import {
  deferred,
  errorBody,
  ids,
  json,
  mockAuth,
  session,
} from "./qa-fixtures";

function setup({
  initial = null as Session | null,
  query = "?code=SYNTHETIC_CODE",
  fetcher = vi.fn<typeof fetch>(async () =>
    json({ id: ids.a, businesses: [] }),
  ),
} = {}) {
  window.history.replaceState({}, "", "/auth/callback" + query);
  vi.stubEnv("VITE_API_BASE_URL", "https://qa.invalid/api/v1");
  vi.stubGlobal("fetch", fetcher);
  const mock = mockAuth(initial);
  const exchange = vi.fn<
    (code: string) => Promise<{
      data: { session: Session; user: Session["user"] };
      error: null;
    }>
  >(async () => {
    mock.emit(session());
    return { data: { session: session(), user: session().user }, error: null };
  });
  Object.assign(mock.auth, { exchangeCodeForSession: exchange });
  let auth!: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return null;
  }
  const cache = makeQueryClient();
  cache.setDefaultOptions({ queries: { retry: false, staleTime: 30_000 } });
  const tree = (
    <StrictMode>
      <QueryClientProvider client={cache}>
        <I18nProvider>
          <AuthProvider client={mock.client}>
            <Probe />
            <MemoryRouter initialEntries={["/auth/callback"]}>
              <App />
            </MemoryRouter>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </StrictMode>
  );
  return { ...render(tree), mock, exchange, fetcher, auth: () => auth };
}
afterEach(() => {
  window.history.replaceState({}, "", "/");
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("PKCE confirmation boundaries (isolated SDK/API)", () => {
  it("exchanges once across StrictMode and identity remount, validates /me, then shows empty membership state", async () => {
    const qa = setup();
    await screen.findByRole("heading", {
      name: "У вас пока нет торговых точек",
    });
    expect(qa.exchange).toHaveBeenCalledExactlyOnceWith("SYNTHETIC_CODE");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
    expect(qa.fetcher).toHaveBeenCalled();
    expect(String(qa.fetcher.mock.calls[0]?.[0])).toContain("/me");
    expect(qa.auth().demo).toBe(false);
    expect(qa.mock.auth.signOut).not.toHaveBeenCalled();
    expect(document.querySelector(".demo-banner")).toBeNull();
  });
  it("does not navigate while /me is pending", async () => {
    const held = deferred<void>();
    const qa = setup({
      fetcher: vi.fn(async () => {
        await held.promise;
        return json({ id: ids.a, businesses: [] });
      }),
    });
    await waitFor(() => expect(qa.fetcher).toHaveBeenCalled());
    expect(
      screen.queryByText("У вас пока нет торговых точек"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Проверяем подтверждение и доступ к кабинету…"),
    ).toBeInTheDocument();
    await act(async () => held.resolve());
    await screen.findByText("У вас пока нет торговых точек");
  });
  it.each([401, 403, 404, 500, 200])(
    "/me %i failure never becomes empty membership or Demo",
    async (status) => {
      const qa = setup({
        fetcher: vi.fn(async () =>
          json(status === 200 ? { businesses: [] } : errorBody(status), status),
        ),
      });
      await screen.findByRole("alert");
      expect(
        screen.queryByText("У вас пока нет торговых точек"),
      ).not.toBeInTheDocument();
      expect(qa.auth().demo).toBe(false);
      expect(qa.exchange).toHaveBeenCalledTimes(1);
      if (status !== 401) {
        qa.fetcher.mockResolvedValue(json({ id: ids.a, businesses: [] }));
        await userEvent.click(
          screen.getByRole("button", { name: "Повторить" }),
        );
        await screen.findByText("У вас пока нет торговых точек");
        expect(qa.exchange).toHaveBeenCalledTimes(1);
      }
    },
  );
  it("uses an existing valid session and does not exchange a reopened link or replace identity", async () => {
    const qa = setup({
      initial: session(ids.b),
      fetcher: vi.fn(async () => json({ id: ids.b, businesses: [] })),
    });
    await screen.findByText("У вас пока нет торговых точек");
    expect(qa.exchange).not.toHaveBeenCalled();
    expect(qa.auth().session?.user.id).toBe(ids.b);
  });
  it.each([
    "?error=access_denied&error_code=otp_expired&error_description=PRIVATE_TEXT",
    "?code=one&code=two",
    "#access_token=PRIVATE_TOKEN",
    "?next=https://evil.invalid",
  ])(
    "cleans invalid callback %s without exchange, private text, or automatic email",
    async (query) => {
      const qa = setup({ query });
      await screen.findByRole("alert");
      expect(qa.exchange).not.toHaveBeenCalled();
      expect(qa.fetcher).not.toHaveBeenCalled();
      expect(
        window.location.pathname +
          window.location.search +
          window.location.hash,
      ).toBe("/auth/callback");
      expect(document.body.textContent).not.toMatch(/PRIVATE|evil/);
      await userEvent.click(
        screen.getByRole("link", { name: "Отправить письмо повторно" }),
      );
      await screen.findByRole("heading", {
        name: "Подтвердите адрес электронной почты",
      });
      expect(screen.getByLabelText("Электронная почта")).toHaveValue("");
    },
  );
  it("recovers SDK session after a lost exchange response without a second exchange", async () => {
    const qa = setup();
    qa.exchange.mockImplementation(async () => {
      qa.mock.emit(session());
      throw new TypeError("PRIVATE_NETWORK");
    });
    await screen.findByText("У вас пока нет торговых точек");
    expect(qa.exchange).toHaveBeenCalledTimes(1);
    expect(qa.mock.auth.getSession.mock.calls.length).toBeGreaterThan(1);
  });
  it("unknown exchange with no session permits explicit recovery actions only", async () => {
    const qa = setup();
    qa.exchange.mockRejectedValue(new TypeError("PRIVATE_NETWORK"));
    await screen.findByText(/Не удалось подтвердить результат/);
    expect(qa.exchange).toHaveBeenCalledTimes(1);
    expect(qa.fetcher).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Нәтижені растау мүмкін болмады",
    );
    expect(document.body.textContent).not.toContain("PRIVATE_NETWORK");
  });
  it("missing verifier explains the original browser or password login", async () => {
    const qa = setup();
    qa.exchange.mockRejectedValue(
      new AuthApiError("PRIVATE", 400, "pkce_verifier_not_found"),
    );
    await screen.findByText(/Откройте письмо в том же браузере/);
    expect(qa.fetcher).not.toHaveBeenCalled();
  });
  it("late exchange cannot navigate as A or sign out a newer B session", async () => {
    const qa = setup();
    const held = deferred<Awaited<ReturnType<typeof qa.exchange>>>();
    qa.exchange.mockReturnValue(held.promise);
    await waitFor(() => expect(qa.exchange).toHaveBeenCalledTimes(1));
    await act(async () => qa.mock.emit(session(ids.b)));
    await act(async () =>
      held.resolve({
        data: { session: session(), user: session().user },
        error: null,
      }),
    );
    await screen.findByText(/Сеанс изменился/);
    expect(qa.auth().session?.user.id).toBe(ids.b);
    expect(qa.mock.auth.signOut).not.toHaveBeenCalled();
    expect(
      screen.queryByText("У вас пока нет торговых точек"),
    ).not.toBeInTheDocument();
  });
  it("logout during exchange invalidates its eventual result", async () => {
    const qa = setup();
    const held = deferred<Awaited<ReturnType<typeof qa.exchange>>>();
    qa.exchange.mockReturnValue(held.promise);
    await waitFor(() => expect(qa.exchange).toHaveBeenCalledTimes(1));
    await act(async () => {
      await qa.auth().signOut();
    });
    await act(async () => {
      qa.mock.emit(session());
      held.resolve({
        data: { session: session(), user: session().user },
        error: null,
      });
    });
    await screen.findByText(/Сеанс изменился/);
    expect(
      screen.queryByText("У вас пока нет торговых точек"),
    ).not.toBeInTheDocument();
    expect(qa.mock.auth.signOut).toHaveBeenCalledTimes(1);
  });
  it("retains a shared promise for remounts and consumes the code only once", async () => {
    const mock = mockAuth(null);
    const exchange = vi.fn(async () => {
      throw new TypeError("offline");
    });
    Object.assign(mock.auth, { exchangeCodeForSession: exchange });
    const attempt: CallbackAttempt = {
      code: "single-code",
      issue: null,
      flights: new WeakMap(),
    };
    const guard = { current: () => true, accept: () => "unused" };
    const first = completeAuthCallback(mock.client, attempt, guard);
    expect(completeAuthCallback(mock.client, attempt, guard)).toBe(first);
    await expect(first).resolves.toEqual({ issue: "unknown" });
    expect(attempt.code).toBeNull();
    await completeAuthCallback(mock.client, attempt, guard);
    expect(exchange).toHaveBeenCalledTimes(1);
  });
  it("captures the URL only in memory and returns the same attempt after URL cleanup", () => {
    window.history.replaceState(
      {},
      "",
      "/auth/callback?code=memory-only&next=https://evil.invalid",
    );
    const attempt = captureAuthCallback();
    expect(captureAuthCallback()).toBe(attempt);
    expect(attempt.code).toBe("memory-only");
    expect({ ...localStorage, ...sessionStorage }).toEqual({});
  });
  it("blocks a second callback attempt while the first exchange is pending", async () => {
    const mock = mockAuth(null);
    const held = deferred<never>();
    const exchange = vi.fn(() => held.promise);
    Object.assign(mock.auth, { exchangeCodeForSession: exchange });
    const first: CallbackAttempt = {
      code: "K1",
      issue: null,
      flights: new WeakMap(),
    };
    const second: CallbackAttempt = {
      code: "K2",
      issue: null,
      flights: new WeakMap(),
    };
    const guard = { current: () => true, accept: () => null };
    const pending = completeAuthCallback(mock.client, first, guard);
    await waitFor(() => expect(exchange).toHaveBeenCalledTimes(1));
    await expect(
      completeAuthCallback(mock.client, second, guard),
    ).resolves.toEqual({ issue: "changed" });
    expect(second.code).toBeNull();
    held.reject(new TypeError("offline"));
    await pending;
    expect(exchange).toHaveBeenCalledExactlyOnceWith("K1");
  });
  it("rejects a superseded HTTP response before the SDK can save its session", async () => {
    const mock = mockAuth(null);
    const held = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => held.promise),
    );
    const transport = callbackAwareFetch(() => mock.client);
    let current = true;
    const exchange = vi.fn(async () => {
      const response = await transport(
        "https://auth.invalid/auth/v1/token?grant_type=pkce",
        { method: "POST" },
      );
      const body = await response.json();
      expect(response.status).toBe(409);
      expect(body).not.toHaveProperty("access_token");
      return {
        data: { session: null },
        error: { code: body.code, status: response.status },
      };
    });
    Object.assign(mock.auth, { exchangeCodeForSession: exchange });
    const attempt: CallbackAttempt = {
      code: "old",
      issue: null,
      flights: new WeakMap(),
    };
    const pending = completeAuthCallback(mock.client, attempt, {
      current: () => current,
      accept: () => null,
    });
    await waitFor(() => expect(exchange).toHaveBeenCalledTimes(1));
    current = false;
    held.resolve(json({ access_token: "SYNTHETIC_OLD_TOKEN" }));
    await expect(pending).resolves.toEqual({ issue: "changed" });
    expect(mock.auth.signOut).not.toHaveBeenCalled();
  });
});
