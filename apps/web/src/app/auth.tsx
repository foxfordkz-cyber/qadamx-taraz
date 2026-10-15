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

function makeSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    if (key.startsWith("sb_secret_")) return null;
    if (key.split(".").length === 3) {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") return null;
    }
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}
export const supabase = makeSupabase();
type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  demo: boolean;
  expired: boolean;
  configured: boolean;
  scope: string;
  signIn: (email: string, password: string) => Promise<void>;
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
  const [demo, setDemo] = useState(false);
  const [expired, setExpired] = useState(false);
  const identity = useRef<string | null>(null);
  const demoRef = useRef(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (!client) return;
    // Synchronous callback: never await another Supabase call inside the auth lock.
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (identity.current !== (next?.user.id ?? null)) {
        identity.current = next?.user.id ?? null;
        clearPrivateCache(queryClient);
        setGeneration((value) => value + 1);
      }
      if (!demoRef.current) setSession(next);
      if (next) setExpired(false);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [client, queryClient]);
  async function signIn(email: string, password: string) {
    if (!client) throw new Error("Auth unconfigured");
    const result = await client.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    demoRef.current = false;
    setDemo(false);
    setExpired(false);
    setSession(result.data.session);
  }
  async function signOut() {
    if (!demo && client) {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    }
    clearPrivateCache(queryClient);
    identity.current = null;
    demoRef.current = false;
    setSession(null);
    setDemo(false);
    setExpired(false);
    setGeneration((v) => v + 1);
  }
  function enterDemo() {
    clearPrivateCache(queryClient);
    demoRef.current = true;
    setDemo(true);
    setSession(null);
    setExpired(false);
    setGeneration((v) => v + 1);
  }
  async function getToken() {
    if (demoRef.current || !client) return null;
    const expectedId = session?.user.id;
    const { data, error } = await client.auth.getSession();
    if (
      error ||
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
        demo,
        expired,
        configured: !!client,
        scope: `${demo ? "demo" : (session?.user.id ?? "guest")}:${generation}`,
        signIn,
        signOut,
        enterDemo,
        getToken,
        markExpired: () => {
          if (identity.current !== session?.user.id || demoRef.current) return;
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
