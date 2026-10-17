import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../app/auth";
import { App } from "../app/App";
import { makeQueryClient } from "../app/query";
import { supabaseProjectUrlIssue } from "../app/auth-config";
import { I18nProvider } from "../shared/i18n";
import { createApiClient } from "../shared/api/client";
import { createLiveGateway } from "../shared/api/gateway";
import { backendBindings } from "../shared/api/bindings";
import { ru } from "../shared/i18n/ru";
import { ids, json, mockAuth, renderQa, session } from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("registration deployment configuration boundaries", () => {
  it("does not construct an SDK client for the reported REST URL configuration", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co/rest/v1");
    vi.stubEnv(
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_synthetic_only",
    );
    vi.resetModules();
    const configured = await import("../app/auth");
    expect(configured.supabase).toBeNull();
  });
  it.each([
    "https://project.supabase.co/rest/v1",
    "https://project.supabase.co/auth/v1/",
    "https://project.supabase.co/storage/v1/object",
    "https://project.supabase.co/?apikey=private-placeholder",
    "https://user:private-placeholder@project.supabase.co",
    "https://project.supabase.co/#access_token=private-placeholder",
    "not a URL",
    "javascript:alert(1)",
  ])("rejects an invalid project URL without repairing it: %s", (url) => {
    expect(supabaseProjectUrlIssue(url)).toBe(true);
  });
  it.each([
    undefined,
    "https://project.supabase.co",
    "https://project.supabase.co/",
    "http://127.0.0.1:54321",
    "http://127.0.0.1:5198/__qa_supabase",
  ])(
    "preserves valid project/proxy URL or missing-config handling: %s",
    (url) => {
      expect(supabaseProjectUrlIssue(url)).toBe(false);
    },
  );
  it.each(["/login", "/register"])(
    "shows a safe RU/KZ configuration notice and prevents Auth calls on %s",
    async (route) => {
      vi.stubEnv(
        "VITE_SUPABASE_URL",
        "https://private-placeholder.invalid/rest/v1",
      );
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      render(
        <QueryClientProvider client={makeQueryClient()}>
          <I18nProvider>
            <AuthProvider client={null}>
              <MemoryRouter initialEntries={[route]}>
                <App />
              </MemoryRouter>
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>,
      );
      expect(await screen.findByText(ru.authProjectUrlInvalid)).toBeVisible();
      expect(
        screen.getByRole("button", {
          name: route === "/login" ? "Войти" : "Зарегистрироваться",
        }),
      ).toBeDisabled();
      await userEvent.click(screen.getByRole("button", { name: "KZ" }));
      expect(screen.getByRole("status")).toHaveTextContent(
        "Supabase мекенжайы қате",
      );
      expect(document.body.textContent).not.toContain("private-placeholder");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});

describe("GET /me error is never a successful zero-membership response", () => {
  it.each([
    [403, ru.forbidden],
    [404, ru.notFound],
    [500, ru.serverError],
  ] as const)(
    "keeps HTTP %s as an error without granting Demo or access",
    async (status, message) => {
      const qa = renderQa({
        route: "/seller",
        fetcher: vi.fn(async () =>
          json(
            { error: { code: "REJECTED", message: "private-placeholder" } },
            status,
          ),
        ),
      });
      // GET retries once after 1s; let the real retry policy finish.
      await screen.findByText(message, {}, { timeout: 3000 });
      expect(screen.queryByText(ru.noBusiness)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(ru.business)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toContain("private-placeholder");
      expect(qa.auth().demo).toBe(false);
      expect(
        qa.fetcher.mock.calls.every(([url]) => String(url).endsWith("/me")),
      ).toBe(true);
    },
  );
  it("keeps a network/CORS failure distinct, then allows explicit retry to a validated empty state", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("private-placeholder"));
    const qa = renderQa({ route: "/seller", fetcher });
    await screen.findByText(ru.network, {}, { timeout: 3000 });
    expect(screen.queryByText(ru.noBusiness)).not.toBeInTheDocument();
    fetcher.mockResolvedValue(json({ id: ids.a, businesses: [] }));
    await userEvent.click(screen.getByRole("button", { name: ru.retry }));
    await screen.findByRole("heading", { name: ru.noBusiness });
    expect(qa.auth().session?.user.id).toBe(ids.a);
    expect(qa.auth().demo).toBe(false);
  });
  it("does not turn a malformed 200 response into empty membership or expose it", async () => {
    renderQa({
      route: "/seller",
      fetcher: vi.fn(async () =>
        json({ id: ids.a, businesses: "private-placeholder" }),
      ),
    });
    await screen.findByText(ru.invalidResponse);
    expect(screen.queryByText(ru.noBusiness)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("private-placeholder");
  });
  it("marks a rejected JWT as expired and never creates memberships", async () => {
    const qa = renderQa({
      route: "/seller",
      fetcher: vi.fn(async () =>
        json({ error: { code: "INVALID_TOKEN" } }, 401),
      ),
    });
    await screen.findByText(ru.unauthorized);
    await waitFor(() => expect(qa.auth().expired).toBe(true));
    expect(screen.queryByText(ru.noBusiness)).not.toBeInTheDocument();
    expect(qa.auth().demo).toBe(false);
  });
  it("reports missing API configuration without making a network call or assuming zero memberships", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const mock = mockAuth(session());
    const api = createApiClient({
      baseUrl: "",
      getToken: async () => session().access_token,
      fetcher,
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <I18nProvider>
          <AuthProvider client={mock.client}>
            <MemoryRouter initialEntries={["/seller"]}>
              <App gateway={createLiveGateway(api, backendBindings, ids.a)} />
            </MemoryRouter>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>,
    );
    await screen.findByText(ru.apiUnavailable);
    expect(screen.queryByText(ru.noBusiness)).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
