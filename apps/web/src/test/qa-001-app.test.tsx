// Adapted only QA-001 from PR #12 to Team MVP 0.4.0; no old QA suite merge.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { AuthProvider, useAuth } from "../app/auth";
import { makeQueryClient } from "../app/query";
import { I18nProvider } from "../shared/i18n";
import type { components } from "../shared/api/generated";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("QA-001: late customer POST 401 after A/B/A leaves the current App and cache usable", async () => {
  const ids = {
    a: "50000000-0000-4000-8000-000000000001",
    b: "50000000-0000-4000-8000-000000000002",
    shop: "10000000-0000-4000-8000-000000000001",
    customer: "20000000-0000-4000-8000-000000000001",
  };
  const session = (id: string, token = `synthetic-${id}`) =>
    ({ user: { id }, access_token: token }) as Session;
  let current: Session | null = session(ids.a);
  let listener: (event: AuthChangeEvent, session: Session | null) => void;
  const client = {
    auth: {
      onAuthStateChange: (callback: typeof listener) => {
        listener = callback;
        let active = true;
        queueMicrotask(() => active && listener("INITIAL_SESSION", current));
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                active = false;
              },
            },
          },
        };
      },
      getSession: async () => ({ data: { session: current }, error: null }),
    },
  } as unknown as SupabaseClient;
  let release!: (response: Response) => void;
  const late = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const json = (value: unknown) => new Response(JSON.stringify(value));
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
    if (init?.method === "POST") return late;
    const path = new URL(String(_input)).pathname;
    if (path.endsWith("/me")) {
      const me: components["schemas"]["MeResponse"] = {
        id: current!.user.id,
        businesses: [
          {
            id: ids.shop,
            slug: "synthetic-shop",
            name: "Synthetic shop",
            role: "owner",
          },
        ],
      };
      return json(me);
    }
    if (path.endsWith("/customers"))
      return json({
        items: [
          {
            id: ids.customer,
            business_id: ids.shop,
            display_name: `Client ${current!.user.id === ids.a ? "A" : "B"}`,
            note: "Synthetic",
            contact: null,
            balance_minor: 0,
          },
        ],
        next_cursor: null,
      });
    throw new Error(`Unexpected fixture request: ${path}`);
  });
  vi.stubEnv("VITE_API_BASE_URL", "https://qa.invalid/api/v1");
  vi.stubGlobal("fetch", fetcher);
  const cache = makeQueryClient();
  let auth!: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return null;
  }
  render(
    <QueryClientProvider client={cache}>
      <I18nProvider>
        <AuthProvider client={client}>
          <Probe />
          <MemoryRouter initialEntries={["/seller/customers"]}>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "Client A" });
  const oldScope = auth.scope;
  await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
  const form = within(screen.getByRole("dialog"));
  await userEvent.type(
    form.getByLabelText("Имя"),
    "Synthetic delayed customer",
  );
  await userEvent.click(form.getByRole("button", { name: "Создать клиента" }));
  await waitFor(() =>
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1),
  );
  const emit = (next: Session) =>
    act(() => {
      current = next;
      listener("SIGNED_IN", next);
    });
  emit(session(ids.b));
  await screen.findByRole("heading", { name: "Client B" });
  emit(session(ids.a, "synthetic-new-a"));
  await screen.findByRole("heading", { name: "Client A" });
  expect(auth.scope).not.toBe(oldScope);
  const marker = [auth.scope, "fresh-session-marker"];
  cache.setQueryData(marker, "keep");
  await act(async () => {
    release(new Response("{}", { status: 401 }));
  });
  expect(auth.expired).toBe(false);
  expect(cache.getQueryData(marker)).toBe("keep");
  expect(await auth.getToken()).toBe("synthetic-new-a");
  expect(screen.getByRole("heading", { name: "Client A" })).toBeInTheDocument();
});
