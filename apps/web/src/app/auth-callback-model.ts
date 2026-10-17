import type { SupabaseClient } from "@supabase/supabase-js";

// Vite pins the shared Cloudflare URL, independently of hosting metadata/env.
export const EMAIL_CALLBACK_URL: string = import.meta.env
  .VITE_AUTH_EMAIL_CALLBACK_URL;
export type CallbackIssue =
  | "invalid"
  | "missing"
  | "browser"
  | "unknown"
  | "changed";
export type CallbackResult =
  | { userId: string; scope: string }
  | { issue: CallbackIssue };
export type CallbackAttempt = {
  code: string | null;
  issue: CallbackIssue | null;
  flights: WeakMap<SupabaseClient, Promise<CallbackResult>>;
};
let captured: CallbackAttempt | undefined;
const responseGuards = new WeakMap<SupabaseClient, () => boolean>();
const pendingAttempts = new WeakMap<SupabaseClient, CallbackAttempt>();

// The SDK saves a successful exchange before notifying AuthProvider. Reject a
// superseded HTTP response before it reaches that save (e.g. a newer login B).
export function callbackAwareFetch(
  getClient: () => SupabaseClient,
): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const guard =
      url.pathname.endsWith("/auth/v1/token") &&
      url.searchParams.get("grant_type") === "pkce"
        ? responseGuards.get(getClient())
        : undefined;
    const response = await fetch(input, init);
    if (!guard) return response;
    const body = await response.arrayBuffer();
    if (!guard())
      return new Response(
        JSON.stringify({
          code: "callback_superseded",
          message: "Authentication attempt superseded",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
            "X-Supabase-Api-Version": "2024-01-01",
          },
        },
      );
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
export function captureAuthCallback(): CallbackAttempt {
  const url = new URL(window.location.href);
  if (url.pathname === "/auth/callback" && (url.search || url.hash)) {
    const codes = url.searchParams.getAll("code");
    const hasError = ["error", "error_code", "error_description"].some((key) =>
      url.searchParams.has(key),
    );
    const code = codes.length === 1 && codes[0].trim() ? codes[0] : null;
    captured = {
      code: !hasError && !url.hash ? code : null,
      issue: hasError || url.hash || !code ? "invalid" : null,
      flights: new WeakMap(),
    };
    // Remove all parameters before rendering links or sending API requests.
    window.history.replaceState(window.history.state, "", "/auth/callback");
  }
  return (captured ??= {
    code: null,
    issue: "missing",
    flights: new WeakMap(),
  });
}
function issueFor(error: unknown): CallbackIssue {
  const value = error as {
    code?: string;
    name?: string;
    status?: number;
  } | null;
  if (
    value?.code === "pkce_verifier_not_found" ||
    value?.name === "AuthPKCECodeVerifierMissingError" ||
    value?.code === "bad_code_verifier"
  )
    return "browser";
  if (value?.code === "callback_superseded") return "changed";
  if (value?.status === 400 || value?.status === 403 || value?.status === 422)
    return "invalid";
  return "unknown";
}
// Shared across mounts; no automatic exchange retry, session assignment or signOut.
export function completeAuthCallback(
  client: SupabaseClient,
  attempt: CallbackAttempt,
  guard: {
    current: () => boolean;
    accept: (userId: string, exchanged: boolean) => string | null;
  },
): Promise<CallbackResult> {
  const existing = attempt.flights.get(client);
  if (existing) return existing;
  if (pendingAttempts.has(client)) {
    attempt.code = null;
    return Promise.resolve({ issue: "changed" });
  }
  pendingAttempts.set(client, attempt);
  const run = async (): Promise<CallbackResult> => {
    let exchanged = false;
    let expectedId: string | undefined;
    let issue: CallbackIssue = attempt.issue ?? "unknown";
    try {
      const current = await client.auth.getSession();
      if (!guard.current()) return { issue: "changed" };
      if (current.error) return { issue: "unknown" };
      if (current.data.session?.user.id && current.data.session.access_token) {
        const scope = guard.accept(current.data.session.user.id, false);
        return scope
          ? { userId: current.data.session.user.id, scope }
          : { issue: "changed" };
      }
      if (!attempt.code) return { issue };
      const code = attempt.code;
      attempt.code = null;
      exchanged = true;
      responseGuards.set(client, guard.current);
      const result = await client.auth.exchangeCodeForSession(code);
      expectedId = result.data?.session?.user.id;
      if (result.error) issue = issueFor(result.error);
    } catch (error) {
      issue = issueFor(error);
    } finally {
      attempt.code = null;
      if (responseGuards.get(client) === guard.current)
        responseGuards.delete(client);
      if (pendingAttempts.get(client) === attempt)
        pendingAttempts.delete(client);
    }
    if (issue === "changed") return { issue };
    // Lost response is not proof of failure. Read SDK state, then validate /me.
    try {
      const current = await client.auth.getSession();
      const session = current.data.session;
      if (!current.error && session?.user.id && session.access_token) {
        if (expectedId && expectedId !== session.user.id)
          return { issue: "changed" };
        const scope = guard.accept(session.user.id, exchanged);
        return scope
          ? { userId: session.user.id, scope }
          : { issue: "changed" };
      }
    } catch {
      /* Never expose provider text. */
    }
    return { issue };
  };
  const promise = run();
  attempt.flights.set(client, promise);
  return promise;
}
