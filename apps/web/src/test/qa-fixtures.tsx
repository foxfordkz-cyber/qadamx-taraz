import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import { vi } from "vitest";
import { App } from "../app/App";
import { AuthProvider, useAuth } from "../app/auth";
import { makeQueryClient } from "../app/query";
import { I18nProvider } from "../shared/i18n";
import type { components } from "../shared/api/generated";

// Synthetic data only. Reuse the production providers and existing test setup.
export const ids = {
  a: "50000000-0000-4000-8000-000000000001",
  b: "50000000-0000-4000-8000-000000000002",
  shopA: "10000000-0000-4000-8000-000000000001",
  shopA2: "10000000-0000-4000-8000-000000000002",
  shopB: "10000000-0000-4000-8000-000000000003",
  customer: "20000000-0000-4000-8000-000000000001",
  customer2: "20000000-0000-4000-8000-000000000002",
  request: "70000000-0000-4000-8000-000000000001",
};
export const membership = (id: string, name: string) => ({
  id,
  name,
  slug: `qa-${id}`,
  role: "owner" as const,
});
export const meA = {
  id: ids.a,
  businesses: [
    membership(ids.shopA, "QA MART"),
    membership(ids.shopA2, "QA Кайкармет"),
  ],
} satisfies components["schemas"]["MeResponse"];
export const meB = {
  id: ids.b,
  businesses: [membership(ids.shopB, "QA Ауыл Береке")],
} satisfies components["schemas"]["MeResponse"];
export const customer = (
  businessId = ids.shopA,
  name = "QA Клиент A",
  id = ids.customer,
) =>
  ({
    id,
    business_id: businessId,
    display_name: name,
    note: "Вымышленный клиент QA",
    contact: null,
    balance_minor: 12345,
  }) satisfies components["schemas"]["CustomerResponse"];
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
export const errorBody = (status: number) =>
  ({
    error: {
      code: status === 401 ? "AUTH_REQUIRED" : `QA_HTTP_${status}`,
      message: "PRIVATE_SERVER_TRACE_MUST_NOT_RENDER",
      fields: {},
    },
    request_id: ids.request,
  }) satisfies components["schemas"]["ErrorResponse"];
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export function session(id = ids.a, token = `qa-only-${id}`): Session {
  return {
    access_token: token,
    refresh_token: "qa-only-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id },
  } as Session;
}
export function mockAuth(initial: Session | null = session()) {
  let current = initial;
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
  const auth = {
    onAuthStateChange: vi.fn((callback: typeof listener) => {
      listener = callback;
      let active = true;
      queueMicrotask(() => {
        if (active) callback("INITIAL_SESSION", current);
      });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              active = false;
            },
          },
        },
      };
    }),
    getSession: vi.fn(async () => ({
      data: { session: current },
      error: null,
    })),
    signInWithPassword: vi.fn(async () => {
      const next = session();
      emit(next);
      return { data: { session: next }, error: null as Error | null };
    }),
    signOut: vi.fn(async () => {
      emit(null, "SIGNED_OUT");
      return { error: null };
    }),
  };
  return { auth, emit, client: { auth } as unknown as SupabaseClient };
}
export const defaultFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  const isB = new Headers(init?.headers).get("Authorization")?.includes(ids.b);
  if (url.pathname.endsWith("/me")) return json(isB ? meB : meA);
  if (url.pathname.endsWith("/customer-creation-result"))
    return json({ status: "not_observed", customer: null });
  if (url.pathname.endsWith("/customers") && init?.method === "POST") {
    const businessId = url.pathname.split("/").at(-2)!;
    const body = JSON.parse(String(init.body)) as {
      display_name: string;
      note: string;
      contact: string | null;
    };
    return json(
      {
        ...customer(businessId, body.display_name),
        note: body.note,
        contact: body.contact,
      },
      201,
    );
  }
  if (
    url.pathname.endsWith("/customers") &&
    (!init?.method || init.method === "GET")
  ) {
    const businessId = url.pathname.split("/").at(-2)!;
    return json({
      items: [customer(businessId, isB ? "QA Клиент B" : "QA Клиент A")],
      next_cursor: null,
    });
  }
  throw new Error(`Unexpected QA transport request: ${url.pathname}`);
};
export function renderQa({
  initial = session() as Session | null,
  route = "/seller/customers",
  fetcher = vi.fn(defaultFetch),
} = {}) {
  vi.stubEnv("VITE_API_BASE_URL", "https://qa.invalid/api/v1");
  vi.stubGlobal("fetch", fetcher);
  const mock = mockAuth(initial);
  const cache = makeQueryClient();
  let auth!: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return null;
  }
  const view = render(
    <QueryClientProvider client={cache}>
      <I18nProvider>
        <AuthProvider client={mock.client}>
          <Probe />
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { ...view, mock, cache, fetcher, auth: () => auth };
}
