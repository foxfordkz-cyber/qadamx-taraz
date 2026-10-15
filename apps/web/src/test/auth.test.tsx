import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../app/auth";
import { makeQueryClient } from "../app/query";

function makeSession(id: string): Session {
  return {
    access_token: `token-${id}`,
    user: { id },
    refresh_token: "test",
    expires_in: 3600,
    token_type: "bearer",
  } as Session;
}
function setup() {
  let listener: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void = () => {};
  let session: Session | null = null;
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const unsubscribe = vi.fn();
  const client = {
    auth: {
      onAuthStateChange: (callback: typeof listener) => {
        listener = callback;
        return { data: { subscription: { unsubscribe } } };
      },
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      signOut,
    },
  } as unknown as SupabaseClient;
  const cache = makeQueryClient();
  let auth: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return (
      <>
        <span>
          {auth.loading ? "loading" : (auth.session?.user.id ?? "guest")}
        </span>
        <button onClick={() => void auth.signOut().catch(() => {})}>
          logout
        </button>
      </>
    );
  }
  const result = render(
    <QueryClientProvider client={cache}>
      <AuthProvider client={client}>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return {
    ...result,
    cache,
    signOut,
    unsubscribe,
    getAuth: () => auth!,
    emit: (next: Session | null, event: AuthChangeEvent = "SIGNED_IN") =>
      act(() => {
        session = next;
        listener(event, next);
      }),
  };
}
describe("authentication identity boundaries (test auth client, no live Supabase)", () => {
  it("restores initial session and obtains its token", async () => {
    const fixture = setup();
    fixture.emit(makeSession("seller-a"), "INITIAL_SESSION");
    expect(screen.getByText("seller-a")).toBeInTheDocument();
    expect(await fixture.getAuth().getToken()).toBe("token-seller-a");
  });
  it("clears cached data on user switch and invalidates old token callbacks", async () => {
    const fixture = setup();
    fixture.emit(makeSession("seller-a"));
    const oldAuth = fixture.getAuth();
    fixture.cache.setQueryData(["private-a"], ["secret"]);
    fixture.emit(makeSession("seller-b"));
    expect(fixture.cache.getQueryData(["private-a"])).toBeUndefined();
    expect(screen.getByText("seller-b")).toBeInTheDocument();
    expect(await oldAuth.getToken()).toBeNull();
    act(() => oldAuth.markExpired());
    expect(fixture.getAuth().expired).toBe(false);
  });
  it("does not clear cache for refresh of the same identity", () => {
    const fixture = setup();
    fixture.emit(makeSession("seller-a"));
    const scope = fixture.getAuth().scope;
    fixture.cache.setQueryData(["keep"], ["value"]);
    fixture.emit(makeSession("seller-a"), "TOKEN_REFRESHED");
    expect(fixture.cache.getQueryData(["keep"])).toEqual(["value"]);
    expect(fixture.getAuth().scope).toBe(scope);
  });
  it("logout clears data and removes the session", async () => {
    const fixture = setup();
    fixture.emit(makeSession("seller-a"));
    fixture.cache.setQueryData(["private"], ["a"]);
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
    expect(fixture.cache.getQueryCache().getAll()).toHaveLength(0);
    expect(fixture.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("retains session if signout fails, rather than claiming success", async () => {
    const fixture = setup();
    fixture.emit(makeSession("seller-a"));
    fixture.signOut.mockResolvedValue({ error: new Error("network") });
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(screen.getByText("seller-a")).toBeInTheDocument();
  });
  it("unsubscribes on unmount", () => {
    const fixture = setup();
    fixture.unmount();
    expect(fixture.unsubscribe).toHaveBeenCalled();
  });
});
