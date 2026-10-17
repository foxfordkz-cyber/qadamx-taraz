/** Synthetic, read-only API fixtures. Each mount starts with an empty query cache. */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../shared/i18n";
import { ApiError } from "../shared/api/client";

const state = vi.hoisted(() => ({
  business: { id: "business-A" },
  scope: "account-A",
  drafts: new Map<string, unknown>(),
  gateway: { mode: "live", customers: vi.fn() },
  api: { request: vi.fn() },
}));
vi.mock("../app/runtime", () => ({
  useRuntime: () => state,
  useBusiness: () => ({ business: state.business }),
}));
import { Debts, History } from "../features/ledger/Ledger";

const operation = (id = "operation-1", businessId = "business-A") => ({
  id,
  business_id: businessId,
  customer_id: "customer-51",
  sale_id: "sale-1",
  kind: "sale" as const,
  sales_delta_minor: 450000,
  receipts_delta_minor: 200000,
  reversal_of: null,
  description: `Учебная операция ${id}`,
  created_at: "2026-10-17T08:00:00Z",
  created_by: "account-A",
});
const sale = {
  id: "sale-1",
  customer_id: "customer-51",
  description: "Учебный долг",
  total_minor: 450000,
  received_minor: 200000,
  balance_minor: 250000,
  created_at: "2026-10-17T08:00:00Z",
};
const customer = (index: number, businessId = "business-A") => ({
  id: `customer-${index}`,
  business_id: businessId,
  display_name: `Учебный клиент ${index}`,
  note: "",
  contact: null,
  balance_minor: index === 51 ? 630000 : 0,
});
const page = <T,>(items: T[] = [], next_cursor: string | null = null) => ({
  items,
  next_cursor,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function mount(path = "/seller/history") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          {path.includes("/debts") ? <Debts /> : <History />}
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
  const view = render(tree());
  return { ...view, client, refresh: () => view.rerender(tree()) };
}
beforeEach(() => {
  state.business = { id: "business-A" };
  state.scope = "account-A";
  state.gateway.mode = "live";
  state.drafts.clear();
  state.gateway.customers
    .mockReset()
    .mockImplementation(async (_business, _search, cursor) =>
      cursor
        ? page([customer(51)])
        : page(
            Array.from({ length: 50 }, (_, i) => customer(i + 1)),
            "customer-50",
          ),
    );
  state.api.request.mockReset().mockImplementation(async (path: string) => {
    if (path.includes("/summary"))
      return {
        sales_minor: 0,
        receipts_minor: 0,
        outstanding_minor: 830000,
        new_inquiries_count: 0,
      };
    return path.includes("outstanding_only")
      ? page([sale])
      : page([operation()]);
  });
});

describe("history request states", () => {
  it("announces initial loading and shows empty only after a successful response", async () => {
    const pending = deferred<ReturnType<typeof page>>();
    state.api.request.mockReturnValue(pending.promise);
    mount();
    expect(screen.getByRole("status")).toHaveTextContent("Загрузка");
    expect(screen.queryByText("Записей нет")).not.toBeInTheDocument();
    await act(async () => pending.resolve(page()));
    expect(
      await screen.findByRole("heading", { name: "Записей нет" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("explains a successful empty history in Kazakh", async () => {
    localStorage.setItem("qadam.locale", "kk");
    state.api.request.mockResolvedValue(page());
    mount();
    expect(
      await screen.findByRole("heading", { name: "Жазбалар жоқ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Расталған сатылымдар, төлемдер мен түзетулер осында көрсетіледі.",
      ),
    ).toBeInTheDocument();
  });
  it("keeps an initial failure separate from empty and retries the read", async () => {
    state.api.request
      .mockRejectedValueOnce(new ApiError(503, "UNAVAILABLE"))
      .mockResolvedValue(page());
    mount();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Записей нет")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(
      await screen.findByRole("heading", { name: "Записей нет" }),
    ).toBeInTheDocument();
    expect(state.api.request).toHaveBeenCalledTimes(2);
  });
  it("retains rows and disables the pagination action while the next page is pending", async () => {
    const pending = deferred<ReturnType<typeof page>>();
    state.api.request
      .mockResolvedValueOnce(page([operation()], "next-page"))
      .mockReturnValue(pending.promise);
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Загрузить ещё" }),
    );
    const next = await screen.findByRole("button", {
      name: "Загрузка следующей страницы…",
    });
    expect(next).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Загрузка следующей страницы",
    );
    expect(
      screen.getByText("Учебная операция operation-1"),
    ).toBeInTheDocument();
    fireEvent.click(next);
    expect(state.api.request).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(page([operation("operation-2")])));
    expect(
      await screen.findByText("Учебная операция operation-2"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("retries a failed next page with the same cursor without refetching or hiding the first", async () => {
    state.api.request
      .mockResolvedValueOnce(page([operation()], "next-page"))
      .mockRejectedValueOnce(new ApiError(503, "UNAVAILABLE"))
      .mockResolvedValueOnce(page([operation("operation-2")]));
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Загрузить ещё" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить следующую страницу",
    );
    expect(
      screen.getByText("Учебная операция operation-1"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Записей нет")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(
      await screen.findByText("Учебная операция operation-2"),
    ).toBeInTheDocument();
    const urls = state.api.request.mock.calls.map(([path]) => path);
    expect(urls).toHaveLength(3);
    expect(urls[1]).toBe(urls[2]);
    expect(urls[2]).toContain("cursor=next-page");
  });
  it("does not call a disabled demo query an empty API history", async () => {
    state.gateway.mode = "demo";
    mount();
    expect(screen.queryByText("Записей нет")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(state.api.request).not.toHaveBeenCalled();
  });
  it.each(["business", "user"])(
    "hides cached rows and names when the %s changes",
    async (change) => {
      state.gateway.customers.mockResolvedValue(page([customer(51)]));
      const view = mount();
      expect(await screen.findByText("Учебный клиент 51")).toBeInTheDocument();
      const pending = deferred<ReturnType<typeof page>>();
      state.api.request.mockReturnValue(pending.promise);
      state.gateway.customers.mockResolvedValue(page());
      if (change === "business") state.business = { id: "business-B" };
      else state.scope = "account-B";
      view.refresh();
      expect(screen.queryByText("Учебный клиент 51")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Учебная операция operation-1"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
      await act(async () => pending.resolve(page()));
      expect(
        await screen.findByRole("heading", { name: "Записей нет" }),
      ).toBeInTheDocument();
    },
  );
  it("keeps server amounts visible if customer names fail to load", async () => {
    state.gateway.customers.mockRejectedValue(new ApiError(503, "UNAVAILABLE"));
    mount();
    expect(
      await screen.findByText("Учебная операция operation-1"),
    ).toBeInTheDocument();
    expect(screen.getByText("4 500 ₸")).toBeInTheDocument();
    expect(screen.getByText("2 000 ₸")).toBeInTheDocument();
  });
  it("shows loading instead of a cached empty result during refetch", async () => {
    state.api.request.mockResolvedValue(page());
    const view = mount();
    expect(
      await screen.findByRole("heading", { name: "Записей нет" }),
    ).toBeInTheDocument();
    const pending = deferred<ReturnType<typeof page>>();
    state.api.request.mockReturnValue(pending.promise);
    act(() => {
      void view.client.invalidateQueries({
        queryKey: [state.scope, state.business.id, "ledger"],
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Загрузка");
    expect(screen.queryByText("Записей нет")).not.toBeInTheDocument();
    await act(async () => pending.resolve(page([operation()])));
    expect(
      await screen.findByText("Учебная операция operation-1"),
    ).toBeInTheDocument();
  });
  it.each(["business", "user"])(
    "ignores a late name response after the %s changes",
    async (change) => {
      const pending = deferred<ReturnType<typeof page>>();
      state.gateway.customers.mockReturnValue(pending.promise);
      const view = mount();
      expect(
        await screen.findByText("Учебная операция operation-1"),
      ).toBeInTheDocument();
      state.gateway.customers.mockResolvedValue(page());
      if (change === "business") state.business = { id: "business-B" };
      else state.scope = "account-B";
      state.api.request.mockResolvedValue(
        page([operation("operation-new", state.business.id)]),
      );
      view.refresh();
      expect(
        await screen.findByText("Учебная операция operation-new"),
      ).toBeInTheDocument();
      await act(async () => pending.resolve(page([customer(51)])));
      expect(screen.queryByText("Учебный клиент 51")).not.toBeInTheDocument();
    },
  );
});

describe("debt amounts while customer names are unavailable", () => {
  it.each(["/seller/debts", "/seller/debts?customer_id=customer-51"])(
    "keeps server debt rows and payment navigation on %s when names fail",
    async (path) => {
      state.gateway.customers.mockRejectedValue(
        new ApiError(503, "UNAVAILABLE"),
      );
      mount(path);
      const row = (await screen.findByText(/Учебный долг/)).closest("article")!;
      expect(row).toHaveTextContent("Остаток: 2 500 ₸");
      expect(row).toHaveTextContent("4 500 ₸");
      expect(
        screen.getByRole("link", { name: "Принять оплату" }),
      ).toHaveAttribute("href", "/seller/sale?sale=sale-1");
      expect(
        screen.queryByText("Сейчас никто не должен"),
      ).not.toBeInTheDocument();
      if (path.includes("customer_id")) {
        expect(
          state.api.request.mock.calls.some(([url]) =>
            url.includes("customer_id=customer-51"),
          ),
        ).toBe(true);
        expect(screen.queryByText("Всего мне должны")).not.toBeInTheDocument();
        expect(document.querySelector(".debt-total")).not.toBeInTheDocument();
      } else {
        expect(
          (await screen.findByText("Всего мне должны")).closest("p"),
        ).toHaveTextContent("8 300 ₸");
      }
    },
  );
});

// Reproduced RED on main 1a541ef (all three cases). The captain assigned the
// approved ids extension to backend; enable these when its exact contract lands.
describe.skip("customer outside the first directory page (waiting for backend ids contract)", () => {
  it.each([
    "/seller/debts",
    "/seller/debts?customer_id=customer-51",
    "/seller/history",
  ])(
    "resolves the name on direct opening %s with an empty cache",
    async (path) => {
      const view = mount(path);
      await waitFor(() => expect(state.gateway.customers).toHaveBeenCalled());
      expect(await screen.findByText("Учебный клиент 51")).toBeInTheDocument();
      view.unmount();
      mount(path);
      expect(await screen.findByText("Учебный клиент 51")).toBeInTheDocument();
    },
  );
});
