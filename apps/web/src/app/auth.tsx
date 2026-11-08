import {
  createClient,
  type SupabaseClient,
  type Session,
} from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearPrivateCache } from "./query";
import { withinDeadline } from "../shared/api/deadline";
import { ApiError } from "../shared/api/errors";
import { boundedAuthFetch } from "./auth-transport";
import { isExistingEmail, rememberConfirmation } from "./registration-model";
import { supabaseProjectUrlIssue } from "./auth-config";
import { registrationOriginAllowed } from "./auth-callback-config";
import {
  callbackAwareFetch,
  completeAuthCallback,
  EMAIL_CALLBACK_URL,
  type CallbackAttempt,
  type CallbackResult,
} from "./auth-callback-model";

function makeSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || supabaseProjectUrlIssue(url)) return null;
  try {
    if (key.startsWith("sb_secret_")) return null;
    if (key.split(".").length === 3) {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") return null;
    }
    const client: SupabaseClient = createClient(url, key, {
      global: { fetch: boundedAuthFetch(callbackAwareFetch(() => client)) },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
    return client;
  } catch {
    return null;
  }
}
export const supabase = makeSupabase();
type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  restoreFailed: boolean;
  demo: boolean;
  expired: boolean;
  configured: boolean;
  invalidProjectUrl: boolean;
  scope: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<"confirmation" | "session">;
  resendConfirmation: (email: string) => Promise<void>;
  confirmEmail: (attempt: CallbackAttempt) => Promise<CallbackResult>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  getToken: () => Promise<string | null>;
  markExpired: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({
  children,
  client = supabase,
}: {
  children: ReactNode;
  client?: SupabaseClient | null;
}) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!client);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const restoreTimedOut = useRef(false);
  const [demo, setDemo] = useState(false);
  const [expired, setExpired] = useState(false);
  const identity = useRef<string | null>(null);
  const demoRef = useRef(false);
  const [generation, setGeneration] = useState(0);
  const generationRef = useRef(0);
  const registrationPending = useRef(false);
  useEffect(() => {
    if (!client) return;
    // INITIAL_SESSION can be blocked by refresh/network/SDK lock acquisition.
    // End the UI wait without inventing a session or deleting stored credentials.
    const timer = setTimeout(() => {
      restoreTimedOut.current = true;
      setLoading(false);
      setRestoreFailed(true);
      // A manual reload retries initialization; do not keep periodic refresh
      // attempts running after the initialization deadline.
      void client.auth.stopAutoRefresh?.().catch(() => {});
    }, 10_000);
    // Synchronous callback: never await another Supabase call inside the auth lock.
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      clearTimeout(timer);
      // Recovery requires an explicit reload. A late SDK response cannot reopen
      // the cabinet after this initialization attempt has already failed.
      if (restoreTimedOut.current) return;
      restoreTimedOut.current = false;
      setRestoreFailed(false);
      if (identity.current !== (next?.user.id ?? null)) {
        identity.current = next?.user.id ?? null;
        clearPrivateCache(queryClient);
        setGeneration(++generationRef.current);
      }
      if (!demoRef.current) setSession(next);
      if (next) {
        setExpired(false);
        rememberConfirmation(false);
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [client, queryClient]);
  async function signIn(email: string, password: string) {
    if (!client) throw new Error("Auth unconfigured");
    const result = await withinDeadline(
      () => client.auth.signInWithPassword({ email, password }),
      10_000,
      () => new ApiError(0, "AUTH_UNAVAILABLE"),
    ).catch((error: unknown) => {
      if (error instanceof ApiError && error.code === "AUTH_UNAVAILABLE") {
        // An SDK lock may ignore cancellation. Do not allow another login to
        // race this attempt; reload creates a fresh SDK before the next attempt.
        restoreTimedOut.current = true;
        setRestoreFailed(true);
        void client.auth.stopAutoRefresh?.().catch(() => {});
      }
      throw error;
    });
    if (result.error) throw result.error;
    demoRef.current = false;
    setDemo(false);
    setExpired(false);
    setSession(result.data.session);
  }
  async function registrationRequest<T>(operation: () => Promise<T>) {
    if (
      !client ||
      !registrationOriginAllowed(
        EMAIL_CALLBACK_URL,
        window.location.origin,
        import.meta.env.PROD,
      ) ||
      identity.current ||
      demoRef.current ||
      generationRef.current !== generation ||
      registrationPending.current
    )
      throw new Error("Registration unavailable");
    registrationPending.current = true;
    try {
      return await operation();
    } finally {
      registrationPending.current = false;
    }
  }
  async function signUp(email: string, password: string) {
    return registrationRequest(async () => {
      // SDK auth events alone establish a session; a returned user is not login.
      const result = await client!.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: EMAIL_CALLBACK_URL },
      });
      if (!result) throw new Error("Unexpected registration response");
      if (isExistingEmail(result.error)) return "confirmation" as const;
      if (result.error) throw result.error;
      if (
        !result.data?.user?.id ||
        (result.data.session !== null && !result.data.session?.access_token)
      )
        throw new Error("Unexpected registration response");
      return result.data.session
        ? ("session" as const)
        : ("confirmation" as const);
    });
  }
  async function resendConfirmation(email: string) {
    await registrationRequest(async () => {
      const result = await client!.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: EMAIL_CALLBACK_URL },
      });
      if (!result) throw new Error("Unexpected resend response");
      if (isExistingEmail(result.error)) return;
      if (result.error) throw result.error;
      if (!result.data || typeof result.data !== "object")
        throw new Error("Unexpected resend response");
    });
  }
  function confirmEmail(attempt: CallbackAttempt): Promise<CallbackResult> {
    if (!client || demoRef.current)
      return Promise.resolve({ issue: "changed" });
    const start = generationRef.current;
    const initialId = identity.current;
    return withinDeadline(
      (signal) =>
        completeAuthCallback(client, attempt, {
          current: () =>
            !signal.aborted &&
            generationRef.current === start &&
            !demoRef.current,
          accept: (userId, exchanged) => {
            const expectedGeneration =
              start + (exchanged && !initialId ? 1 : 0);
            if (
              signal.aborted ||
              demoRef.current ||
              identity.current !== userId ||
              generationRef.current !== expectedGeneration
            )
              return null;
            return `${userId}:${generationRef.current}`;
          },
        }),
      20_000,
      () => new ApiError(0, "AUTH_UNAVAILABLE"),
    ).catch(() => ({ issue: "unknown" }));
  }
  async function signOut() {
    if (!demo && client) {
      const { error } = await withinDeadline(
        () => client.auth.signOut({ scope: "local" }),
        10_000,
        () => new ApiError(0, "AUTH_UNAVAILABLE"),
      );
      if (error) throw error;
    }
    clearPrivateCache(queryClient);
    identity.current = null;
    demoRef.current = false;
    setSession(null);
    setDemo(false);
    setExpired(false);
    setGeneration(++generationRef.current);
    rememberConfirmation(false);
  }
  function enterDemo() {
    clearPrivateCache(queryClient);
    demoRef.current = true;
    setDemo(true);
    setSession(null);
    setExpired(false);
    setGeneration(++generationRef.current);
  }
  async function getToken() {
    if (demoRef.current || !client || generationRef.current !== generation)
      return null;
    const expectedId = session?.user.id;
    const { data, error } = await withinDeadline(
      () => client.auth.getSession(),
      10_000,
      () => new ApiError(0, "AUTH_UNAVAILABLE"),
    );
    if (error && ![400, 401, 403].includes(error.status ?? 0))
      throw new ApiError(0, "AUTH_UNAVAILABLE");
    if (
      error ||
      demoRef.current ||
      generationRef.current !== generation ||
      !expectedId ||
      identity.current !== expectedId ||
      data.session?.user.id !== expectedId
    )
      return null;
    return data.session?.access_token ?? null;
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        restoreFailed,
        demo,
        expired,
        configured: !!client,
        invalidProjectUrl:
          !client && supabaseProjectUrlIssue(import.meta.env.VITE_SUPABASE_URL),
        scope: `${demo ? "demo" : (session?.user.id ?? "guest")}:${generation}`,
        signIn,
        signUp,
        resendConfirmation,
        confirmEmail,
        signOut,
        enterDemo,
        getToken,
        markExpired: () => {
          if (
            generationRef.current !== generation ||
            identity.current !== session?.user.id ||
            demoRef.current
          )
            return;
          clearPrivateCache(queryClient);
          setExpired(true);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
