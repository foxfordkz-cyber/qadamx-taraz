import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import { AuthProvider } from "../app/auth";
import { App } from "../app/App";
import { makeQueryClient } from "../app/query";
import { I18nProvider } from "../shared/i18n";
import { ApiError, createApiClient } from "../shared/api/client";
import { boundedAuthFetch } from "../app/auth-transport";
import { loginErrorKey } from "../app/login-errors";
import { deferred, json, renderQa, session } from "./qa-fixtures";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  onlineManager.setOnline(true);
});
describe("bounded session and membership restoration (synthetic SDK/HTTP)", () => {
  it("exits initialization without INITIAL_SESSION; offers RU/KZ recovery without clearing storage", async () => {
    vi.useFakeTimers();
    const stopAutoRefresh = vi.fn().mockResolvedValue(undefined);
    let listener!: (event: AuthChangeEvent, value: Session | null) => void;
    const client = {
      auth: {
        stopAutoRefresh,
        onAuthStateChange: vi.fn((callback: typeof listener) => {
          listener = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
    } as unknown as SupabaseClient;
    localStorage.setItem("qa-preserved-session", "opaque-test-value");
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <I18nProvider>
          <AuthProvider client={client}>
            <MemoryRouter initialEntries={["/seller"]}>
              <App />
            </MemoryRouter>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Загрузка…")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(10_001));
    expect(screen.queryByText("Загрузка…")).not.toBeInTheDocument();
    expect(screen.getByText(/Служба входа не ответила/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Повторить" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByText(/Кіру қызметі уақытында/)).toBeInTheDocument();
    expect(localStorage.getItem("qa-preserved-session")).toBe(
      "opaque-test-value",
    );
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
    act(() => listener("INITIAL_SESSION", null));
    act(() => listener("TOKEN_REFRESHED", session()));
    expect(screen.getByText(/Кіру қызметі уақытында/)).toBeInTheDocument();
  });
  it("bounds a blocked token lookup without sending /me or marking the user expired", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>();
    const qa = renderQa({ route: "/seller/customers", fetcher });
    qa.mock.auth.getSession.mockImplementation(() => new Promise(() => {}));
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(10_001));
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByText(/Служба входа не ответила/)).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    expect(qa.auth().expired).toBe(false);
  });
  it("requires recovery after a blocked login and ignores its late SDK event", async () => {
    vi.useFakeTimers();
    const qa = renderQa({ initial: null, route: "/login" });
    await act(() => vi.advanceTimersByTimeAsync(0));
    const late =
      deferred<Awaited<ReturnType<typeof qa.mock.auth.signInWithPassword>>>();
    qa.mock.auth.signInWithPassword.mockImplementation(() => late.promise);
    const pending = qa
      .auth()
      .signIn("synthetic@example.test", "synthetic-password");
    const rejected = expect(pending).rejects.toMatchObject({
      code: "AUTH_UNAVAILABLE",
    });
    await act(() => vi.advanceTimersByTimeAsync(10_001));
    await rejected;
    expect(screen.getByText(/Служба входа не ответила/)).toBeInTheDocument();
    act(() => qa.mock.emit(session()));
    late.resolve({ data: { session: session() }, error: null });
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(qa.auth().session).toBeNull();
    expect(qa.auth().restoreFailed).toBe(true);
  });
  it("settles a pending /me, never retries automatically, and recovers on Retry", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
    renderQa({ route: "/seller/customers", fetcher });
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(20_001));
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(
      screen.getByText(/Сервер Qadam не ответил вовремя/),
    ).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(
      json({ id: "50000000-0000-4000-8000-000000000001", businesses: [] }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(
      screen.getByText("У вас пока нет торговых точек"),
    ).toBeInTheDocument();
  });
  it.each([401, 403, 404, 429, 500, 503])(
    "settles /me HTTP %s without retries",
    async (status) => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        json(
          {
            error: {
              code: status === 503 ? "DATABASE_UNAVAILABLE" : `HTTP_${status}`,
            },
          },
          status,
        ),
      );
      const qa = renderQa({ route: "/seller/customers", fetcher });
      await screen.findByRole("alert");
      expect(screen.queryByText("Загрузка…")).not.toBeInTheDocument();
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(qa.auth().expired).toBe(status === 401);
      if (status === 503)
        expect(screen.getByText(/база данных недоступна/)).toBeInTheDocument();
    },
  );
  it("does not leave an offline membership query paused forever", async () => {
    onlineManager.setOnline(false);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderQa({ fetcher: vi.fn().mockRejectedValue(new TypeError("offline")) });
    expect(
      await screen.findByText(
        /Нет соединения с интернетом/,
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
describe("transport deadlines preserve auth and write boundaries", () => {
  it("does not require the newer AbortSignal.throwIfAborted browser method", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      AbortSignal.prototype,
      "throwIfAborted",
    )!;
    Object.defineProperty(AbortSignal.prototype, "throwIfAborted", {
      ...descriptor,
      value: undefined,
    });
    try {
      const fetcher = vi.fn<typeof fetch>(async () => json({ ok: true }));
      const api = createApiClient({
        baseUrl: "https://qa.invalid",
        getToken: async () => "synthetic",
        fetcher,
      });
      await expect(api.request("/me")).resolves.toEqual({ ok: true });
      const response = await boundedAuthFetch(fetcher)(
        "https://qa.invalid/auth/v1/token",
      );
      expect(await response.json()).toEqual({ ok: true });
    } finally {
      Object.defineProperty(
        AbortSignal.prototype,
        "throwIfAborted",
        descriptor,
      );
    }
  });
  it("never sends a late token after the request has timed out", async () => {
    vi.useFakeTimers();
    const token = deferred<string>();
    const fetcher = vi.fn();
    const expire = vi.fn();
    const request = createApiClient({
      baseUrl: "https://qa.invalid",
      getToken: () => token.promise,
      fetcher,
      onUnauthorized: expire,
      authTimeoutMs: 5,
    }).request("/me");
    const result = expect(request).rejects.toMatchObject({
      code: "AUTH_UNAVAILABLE",
    });
    await vi.advanceTimersByTimeAsync(6);
    await result;
    token.resolve("synthetic");
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(expire).not.toHaveBeenCalled();
  });
  it("ignores late 401 after timeout and aborts its read signal", async () => {
    vi.useFakeTimers();
    const response = deferred<Response>();
    const expire = vi.fn();
    const fetcher = vi.fn<typeof fetch>(() => response.promise);
    const request = createApiClient({
      baseUrl: "https://qa.invalid",
      getToken: async () => "synthetic",
      fetcher,
      onUnauthorized: expire,
      readTimeoutMs: 5,
    }).request("/me");
    const result = expect(request).rejects.toMatchObject({
      code: "BACKEND_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(6);
    await result;
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    response.resolve(new Response("{}", { status: 401 }));
    await vi.advanceTimersByTimeAsync(1);
    expect(expire).not.toHaveBeenCalled();
  });
  it("bounds a response body that never completes", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(new ReadableStream({ start() {} })));
    const request = createApiClient({
      baseUrl: "https://qa.invalid",
      getToken: async () => "synthetic",
      fetcher,
      readTimeoutMs: 5,
    }).request("/me");
    const result = expect(request).rejects.toMatchObject({
      code: "BACKEND_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(6);
    await result;
  });
  it("bounds auth transport, including bodies, without adding retries", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
    const request = boundedAuthFetch(
      fetcher,
      5,
    )("https://auth.qa.invalid/auth/v1/token");
    const result = expect(request).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await vi.advanceTimersByTimeAsync(6);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  it.each([
    ["invalid_credentials", 400, "authBadCredentials"],
    ["email_not_confirmed", 400, "authEmailPending"],
    ["over_request_rate_limit", 429, "authRateLimit"],
    ["AUTH_UNAVAILABLE", 0, "authRestoreUnavailable"],
  ])("classifies login %s", (code, status, key) => {
    expect(loginErrorKey({ code, status }, true)).toBe(key);
    expect(loginErrorKey(new ApiError(0, "AUTH_UNAVAILABLE"), false)).toBe(
      "authOffline",
    );
  });
});
