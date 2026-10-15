import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "../shared/api/client";
const state = vi.hoisted(() => ({
  api: { request: vi.fn() },
  drafts: new Map<string, unknown>(),
  scope: "test-user",
  gateway: { mode: "live" },
}));
vi.mock("../app/runtime", () => ({
  useRuntime: () => state,
  useBusiness: () => ({ business: { id: "test-business" } }),
}));
import { Sale } from "../features/voice/Sale";
import { I18nProvider } from "../shared/i18n";
describe("voice form with stub provider responses", () => {
  it.each(["timeout", "invalid-json"])(
    "keeps text and manual inputs after %s",
    async (kind) => {
      state.drafts.clear();
      state.api.request.mockReset().mockImplementation(async (path: string) => {
        if (path.endsWith("/drafts")) {
          if (kind === "timeout") throw new ApiError(504, "AI_TIMEOUT");
          return { not: "a draft" };
        }
        if (path.includes("/summary"))
          return {
            sales_minor: 0,
            receipts_minor: 0,
            outstanding_minor: 0,
            new_inquiries_count: 0,
          };
        return { items: [], next_cursor: null };
      });
      render(
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <I18nProvider>
            <MemoryRouter>
              <Sale />
            </MemoryRouter>
          </I18nProvider>
        </QueryClientProvider>,
      );
      await userEvent.type(
        screen.getByLabelText("Описание"),
        "manual retained",
      );
      await userEvent.type(
        screen.getByLabelText("Текст для AI"),
        "unknown payment",
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Подготовить черновик" }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Ручной ввод" }),
        ).toBeEnabled(),
      );
      expect(screen.getByLabelText("Текст для AI")).toHaveValue(
        "unknown payment",
      );
      expect(screen.getByLabelText("Описание")).toHaveValue("manual retained");
      expect(
        state.api.request.mock.calls.filter(
          ([path, init]) =>
            String(path).endsWith("/operations") && init?.method === "POST",
        ),
      ).toHaveLength(0);
    },
  );
});
