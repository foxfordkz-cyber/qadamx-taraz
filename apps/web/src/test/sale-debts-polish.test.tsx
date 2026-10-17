/** Sale/Debts presentation: no internal ids, one error message. Synthetic API only. */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { Sale } from "../features/voice/Sale";
import { Debts } from "../features/ledger/Ledger";

const saleId = "30000000-0000-4000-8000-000000000001";
const requestId = "70000000-0000-4000-8000-000000000001";
const openSale = {
  id: saleId,
  customer_id: "customer-A",
  description: "Платье синее",
  total_minor: 450000,
  received_minor: 200000,
  balance_minor: 250000,
  created_at: "2026-10-16T08:10:00Z",
};
let openSales: (typeof openSale)[] = [];
beforeEach(() => {
  openSales = [openSale];
  state.gateway.customers.mockReset().mockResolvedValue({
    items: [
      {
        id: "customer-A",
        business_id: "business-A",
        display_name: "Учебный клиент",
        note: "",
        contact: null,
        balance_minor: 250000,
      },
    ],
    next_cursor: null,
  });
  state.api.request.mockReset().mockImplementation(async (path: string) => {
    if (path.includes("/summary"))
      return {
        sales_minor: 0,
        receipts_minor: 0,
        outstanding_minor: 420000,
        new_inquiries_count: 0,
      };
    if (path.includes("outstanding_only=true"))
      return { items: openSales, next_cursor: null };
    if (path.endsWith("/drafts"))
      throw new ApiError(503, "AI_UNAVAILABLE", { requestId });
    return { items: [], next_cursor: null };
  });
});
afterEach(cleanup);

function renderAt(path: string, page: ReactNode) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const shortId = saleId.slice(0, 8);

describe("Мне должны", () => {
  it("shows who owes and the server balance without internal ids", async () => {
    renderAt("/seller/debts", <Debts />);
    const row = (await screen.findByText(/Платье синее/)).closest("article")!;
    expect(
      await within(row).findByRole("heading", { name: "Учебный клиент" }),
    ).toBeInTheDocument();
    expect(row.querySelector(".debt-balance")).toHaveTextContent(
      "Остаток: 2 500 ₸",
    );
    expect(
      within(row).getByRole("link", { name: "Принять оплату" }),
    ).toHaveAttribute("href", `/seller/sale?sale=${saleId}`);
    expect(row.textContent).not.toMatch(uuid);
    expect(row.textContent).not.toContain(shortId);
  });
  it("takes the total from the server summary, not from the loaded page", async () => {
    renderAt("/seller/debts", <Debts />);
    const total = (await screen.findByText("Всего мне должны")).closest("p")!;
    expect(total).toHaveTextContent("4 200 ₸");
    expect(total).not.toHaveTextContent("2 500 ₸");
  });
  it("shows the filtered customer's own server balance", async () => {
    renderAt("/seller/debts?customer_id=customer-A", <Debts />);
    const total = (
      await screen.findByText("Долг клиента · Учебный клиент")
    ).closest("p")!;
    expect(total).toHaveTextContent("2 500 ₸");
    expect(screen.queryByText("Всего мне должны")).not.toBeInTheDocument();
  });
  it("says so when nobody owes", async () => {
    openSales = [];
    renderAt("/seller/debts", <Debts />);
    expect(
      await screen.findByRole("heading", { name: "Сейчас никто не должен" }),
    ).toBeInTheDocument();
  });
});

describe("Новая запись", () => {
  it("opens a repayment from the debt list without ids in the sale choice", async () => {
    renderAt(`/seller/sale?sale=${saleId}`, <Sale />);
    const select = screen.getByLabelText("Неоплаченная продажа");
    await screen.findByRole("option", { name: /Платье синее/ });
    expect(select).toHaveValue(saleId);
    const option = within(select).getByRole("option", {
      name: /Платье синее/,
    });
    expect(option.textContent).toContain("2 500 ₸");
    expect(option.textContent).not.toContain(shortId);
    expect(screen.getByText("Остаток: 2 500 ₸")).toBeInTheDocument();
  });
  it("shows one AI error with retry and manual actions, then clears it for manual input", async () => {
    renderAt("/seller/sale", <Sale />);
    fireEvent.change(screen.getByLabelText("Текст для AI"), {
      target: { value: "Продал на 3000, получил 1000" },
    });
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Подготовить черновик" }),
      ),
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("не смог обработать");
    expect(alert).not.toHaveTextContent("AI временно недоступен");
    expect(alert.querySelectorAll("p")).toHaveLength(1);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    const details = within(alert)
      .getByText("Технические подробности")
      .closest("details")!;
    expect(details.open).toBe(false);
    expect(details).toHaveTextContent(requestId);
    expect(
      within(alert).getByRole("button", { name: "Повторить" }),
    ).toBeEnabled();
    fireEvent.click(
      within(alert).getByRole("button", { name: "Заполнить вручную" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Текст для AI")).toHaveValue(
      "Продал на 3000, получил 1000",
    );
    expect(
      screen.getByRole("button", { name: "Подтвердить запись" }),
    ).toBeEnabled();
  });
  it("moves through input, review and confirmation with one primary action", async () => {
    renderAt("/seller/sale", <Sale />);
    const current = () =>
      screen
        .getByRole("list", { name: "Шаги записи" })
        .querySelector('[aria-current="step"]');
    const prepare = screen.getByRole("button", {
      name: "Подготовить черновик",
    });
    const confirm = screen.getByRole("button", { name: "Подтвердить запись" });
    expect(current()).toHaveTextContent("Ввод");
    expect(prepare).toHaveClass("button-primary");
    expect(confirm).toHaveClass("button-secondary");
    fireEvent.change(screen.getByLabelText("Сумма продажи, ₸"), {
      target: { value: "3000" },
    });
    expect(current()).toHaveTextContent("Проверка");
    expect(confirm).toHaveClass("button-primary");
    expect(prepare).toHaveClass("button-secondary");
    fireEvent.change(screen.getByLabelText("Получено, ₸"), {
      target: { value: "3000" },
    });
    expect(current()).toHaveTextContent("Подтверждение");
    expect(
      document.querySelectorAll(".ledger-columns .button-primary"),
    ).toHaveLength(1);
  });
  it("falls back to the general AI message for unknown server failures", async () => {
    state.api.request.mockImplementation(async (path: string) => {
      if (path.endsWith("/drafts")) throw new ApiError(500, "HTTP_500");
      if (path.includes("/summary"))
        return {
          sales_minor: 0,
          receipts_minor: 0,
          outstanding_minor: 0,
          new_inquiries_count: 0,
        };
      return { items: [], next_cursor: null };
    });
    renderAt("/seller/sale", <Sale />);
    fireEvent.change(screen.getByLabelText("Текст для AI"), {
      target: { value: "Продал на 3000" },
    });
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Подготовить черновик" }),
      ),
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("AI временно недоступен");
    expect(alert.querySelectorAll("p")).toHaveLength(1);
  });
});
