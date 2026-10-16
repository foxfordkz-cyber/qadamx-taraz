import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../app/auth";
import { makeQueryClient } from "../app/query";
import { createApiClient } from "../shared/api/client";

// Synthetic SDK events and HTTP responses only; no live Supabase or backend.
function session(id: string, token = `synthetic-${id}`): Session {
  return {
    user: { id },
    access_token: token,
    refresh_token: "synthetic-refresh",
    expires_in: 3600,
    token_type: "bearer",
  } as Session;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function setup() {
  let current: Session | null = null;
  let listener: (
    event: AuthChangeEvent,
    value: Session | null,
  ) => void = () => {};
  const emit = (
    value: Session | null,
    event: AuthChangeEvent = "SIGNED_IN",
  ) => {
    current = value;
    listener(event, value);
  };
  const getSession = vi.fn(async () => ({
    data: { session: current },
    error: null,
  }));
  const signOut = vi.fn(async () => {
    emit(null, "SIGNED_OUT");
    return { error: null };
  });
  const signInWithPassword = vi.fn(async () => {
    const next = session("a");
    emit(next);
    return { data: { session: next }, error: null };
  });
  const client = {
    auth: {
      onAuthStateChange: (callback: typeof listener) => {
        listener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession,
      signOut,
      signInWithPassword,
    },
  } as unknown as SupabaseClient;
  const cache = makeQueryClient();
  const hook = renderHook(() => useAuth(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={cache}>
        <AuthProvider client={client}>{children}</AuthProvider>
      </QueryClientProvider>
    ),
  });
  return {
    ...hook,
    cache,
    getSession,
    signOut,
    signInWithPassword,
    emit: (value: Session | null, event?: AuthChangeEvent) =>
      act(() => emit(value, event)),
  };
}

describe("auth epoch isolation with synthetic SDK and HTTP responses", () => {
  it("keeps fresh A data and session after an old A request returns 401 across A/B/A", async () => {
    const h = setup();
    h.emit(session("a", "synthetic-old-a"));
    const oldAuth = h.result.current;
    const late = deferred<Response>();
    const fetcher = vi.fn<typeof fetch>(() => late.promise);
    const request = createApiClient({
      baseUrl: "https://qa.invalid/api/v1",
      getToken: oldAuth.getToken,
      onUnauthorized: oldAuth.markExpired,
      fetcher,
    })
      .request("/me")
      .catch((error: unknown) => error);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(
      new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization"),
    ).toBe("Bearer synthetic-old-a");
    h.emit(session("b"));
    h.emit(session("a", "synthetic-new-a"));
    const newKey = [h.result.current.scope, "private"];
    h.cache.setQueryData(newKey, ["fresh A"]);
    await act(async () => {
      late.resolve(new Response("{}", { status: 401 }));
      expect(await request).toMatchObject({ status: 401 });
    });
    expect(h.result.current.expired).toBe(false);
    expect(h.cache.getQueryData(newKey)).toEqual(["fresh A"]);
    expect(h.result.current.scope).not.toBe(oldAuth.scope);
    expect(await h.result.current.getToken()).toBe("synthetic-new-a");
    const reads = h.getSession.mock.calls.length;
    expect(await oldAuth.getToken()).toBeNull();
    expect(h.getSession).toHaveBeenCalledTimes(reads);
  });

  it("rejects getSession completion from an earlier epoch even when A returns", async () => {
    const h = setup();
    h.emit(session("a"));
    const late = deferred<{
      data: { session: Session | null };
      error: null;
    }>();
    h.getSession.mockReturnValueOnce(late.promise);
    const token = h.result.current.getToken();
    h.emit(session("b"));
    h.emit(session("a", "synthetic-new-a"));
    late.resolve({ data: { session: session("a") }, error: null });
    expect(await token).toBeNull();
    expect(await h.result.current.getToken()).toBe("synthetic-new-a");
    expect(h.result.current.expired).toBe(false);
  });

  it("invalidates callbacks synchronously before React renders an A/B/A event batch", async () => {
    const h = setup();
    h.emit(session("a"));
    const oldAuth = h.result.current;
    let oldToken!: Promise<string | null>;
    act(() => {
      h.emit(session("b"));
      h.emit(session("a", "synthetic-new-a"));
      oldAuth.markExpired();
      oldToken = oldAuth.getToken();
    });
    expect(await oldToken).toBeNull();
    expect(h.result.current.expired).toBe(false);
  });

  it("allows a current 401 to expire the session and clear current data", async () => {
    const h = setup();
    h.emit(session("a"));
    h.cache.setQueryData([h.result.current.scope, "private"], ["A"]);
    const api = createApiClient({
      baseUrl: "https://qa.invalid/api/v1",
      getToken: h.result.current.getToken,
      onUnauthorized: h.result.current.markExpired,
      fetcher: vi.fn<typeof fetch>(
        async () => new Response("{}", { status: 401 }),
      ),
    });
    await act(async () => {
      await expect(api.request("/me")).rejects.toMatchObject({ status: 401 });
    });
    expect(h.result.current.expired).toBe(true);
    expect(h.cache.getQueryCache().getAll()).toHaveLength(0);
  });

  it("keeps scope and data on same-user token refresh and obtains the latest token", async () => {
    const h = setup();
    h.emit(session("a", "synthetic-before-refresh"));
    const auth = h.result.current;
    const key = [auth.scope, "private"];
    h.cache.setQueryData(key, ["A"]);
    h.emit(session("a", "synthetic-after-refresh"), "TOKEN_REFRESHED");
    expect(h.result.current.scope).toBe(auth.scope);
    expect(h.cache.getQueryData(key)).toEqual(["A"]);
    expect(await auth.getToken()).toBe("synthetic-after-refresh");
  });

  it("keeps old callbacks invalid after logout and a later sign-in of A", async () => {
    const h = setup();
    h.emit(session("a"));
    const oldAuth = h.result.current;
    await act(async () => oldAuth.signOut());
    expect(h.result.current.session).toBeNull();
    expect(h.signOut).toHaveBeenCalledWith({ scope: "local" });
    h.emit(session("a", "synthetic-new-a"));
    const key = [h.result.current.scope, "private"];
    h.cache.setQueryData(key, ["fresh A"]);
    act(() => oldAuth.markExpired());
    expect(await oldAuth.getToken()).toBeNull();
    expect(h.result.current.expired).toBe(false);
    expect(h.cache.getQueryData(key)).toEqual(["fresh A"]);
  });

  it("does not let a delayed logout completion clear a newer A session", async () => {
    const h = setup();
    h.emit(session("a"));
    const late = deferred<{ error: null }>();
    h.signOut.mockImplementationOnce(() => late.promise);
    let logout!: Promise<void>;
    act(() => {
      logout = h.result.current.signOut();
    });
    h.emit(null, "SIGNED_OUT");
    h.emit(session("b"));
    h.emit(session("a", "synthetic-new-a"));
    const key = [h.result.current.scope, "private"];
    h.cache.setQueryData(key, ["fresh A"]);
    await act(async () => {
      late.resolve({ error: null });
      await logout;
    });
    expect(await h.result.current.getToken()).toBe("synthetic-new-a");
    expect(h.cache.getQueryData(key)).toEqual(["fresh A"]);
  });

  it("invalidates previous callbacks across Demo and return to the same identity", async () => {
    const h = setup();
    h.emit(session("a"));
    const oldAuth = h.result.current;
    act(() => oldAuth.enterDemo());
    expect(h.result.current.demo).toBe(true);
    expect(await oldAuth.getToken()).toBeNull();
    await act(async () => h.result.current.signOut());
    h.emit(session("a", "synthetic-after-demo"));
    act(() => oldAuth.markExpired());
    expect(h.result.current.expired).toBe(false);
    expect(await h.result.current.getToken()).toBe("synthetic-after-demo");
  });

  it("accepts the SDK SIGNED_IN event emitted before sign-in resolves", async () => {
    const h = setup();
    h.emit(null, "INITIAL_SESSION");
    await act(async () =>
      h.result.current.signIn("a@example.test", "synthetic-password"),
    );
    expect(h.result.current.session?.user.id).toBe("a");
    expect(await h.result.current.getToken()).toBe("synthetic-a");
  });
});
