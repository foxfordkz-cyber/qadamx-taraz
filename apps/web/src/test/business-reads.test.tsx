import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider, LanguageSwitch } from "../shared/i18n";
import { ApiError } from "../shared/api/client";

const state = vi.hoisted(() => ({
  scope: "A:epoch1",
  business: { id: "shop-A", name: "Synthetic shop" },
  gateway: { mode: "live" },
  api: { request: vi.fn() },
}));
vi.mock("../app/runtime", () => ({
  useRuntime: () => state,
  useBusiness: () => ({ business: state.business }),
}));
import {
  readBusinessReport,
  reportCsv,
  decimalMinor,
  validDateRange,
  type BusinessReport,
} from "../features/ledger/reportData";
import { CopyReminder, PeriodReport } from "../features/ledger/BusinessReport";
import { localDate } from "../features/summary/Summary";
import { BusinessFilters } from "../features/ledger/BusinessFilters";

function FilterLocation() {
  return <output aria-label="query">{useLocation().search}</output>;
}
it("filters preserve a legacy day and convert amount bounds to exact minor units", async () => {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={["/?date=2026-11-12"]}>
        <BusinessFilters />
        <FilterLocation />
      </MemoryRouter>
    </I18nProvider>,
  );
  const details = document.querySelector("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  const from = await screen.findByLabelText("С даты");
  expect(from).toHaveValue("2026-11-12");
  expect(screen.getByLabelText("По дату")).toHaveValue("2026-11-12");
  fireEvent.change(screen.getByLabelText("Сумма от, ₸"), {
    target: { value: "1,25" },
  });
  fireEvent.change(screen.getByLabelText("Тип операции"), {
    target: { value: "repayment" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Применить" }));
  await waitFor(() =>
    expect(screen.getByLabelText("query")).toHaveTextContent(
      "min_amount_minor=125",
    ),
  );
  expect(screen.getByLabelText("query")).toHaveTextContent("kind=repayment");
  expect(screen.getByLabelText("query")).toHaveTextContent(
    "date_from=2026-11-12",
  );
});
it("invalid amount range never changes the applied filter", async () => {
  render(
    <I18nProvider>
      <MemoryRouter>
        <BusinessFilters />
        <FilterLocation />
      </MemoryRouter>
    </I18nProvider>,
  );
  const details = document.querySelector("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  fireEvent.change(await screen.findByLabelText("Сумма от, ₸"), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText("Сумма до, ₸"), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Применить" }));
  expect(screen.getByRole("alert")).toBeVisible();
  expect(screen.getByLabelText("query")).toBeEmptyDOMElement();
});

const raw = (business = "shop-A"): BusinessReport => ({
  business_id: business,
  customer_id: null,
  date_from: null,
  date_to: null,
  timezone: "Asia/Almaty",
  currency: "KZT",
  as_of: "2026-11-12T09:00:00Z",
  sales_minor: 420000,
  receipts_minor: 220000,
  outstanding_minor: 200000,
  opening_balance_minor: null,
  closing_balance_minor: null,
  operation_count: 4,
  last_operation: null,
  debt_aging: [
    { bucket: "0_7", balance_minor: 200000, sales_count: 1 },
    { bucket: "8_30", balance_minor: 0, sales_count: 0 },
    { bucket: "31_plus", balance_minor: 0, sales_count: 0 },
  ],
});
const parse = (data: unknown) =>
  readBusinessReport(data, "shop-A", null, null, null);
beforeEach(() => {
  localStorage.clear();
  state.scope = "A:epoch1";
  state.business = { id: "shop-A", name: "Synthetic shop" };
  state.gateway.mode = "live";
  state.api.request.mockReset();
});
it("accepts server totals with signed corrections, rejects foreign scopes and unsafe amounts", () => {
  expect(parse(raw()).outstanding_minor).toBe(200000);
  for (const changes of [
    { business_id: "shop-B" },
    { customer_id: "foreign" },
    { sales_minor: "420000" },
    { receipts_minor: NaN },
    { outstanding_minor: -1 },
    { operation_count: 1.5 },
    { as_of: "not a date" },
    { timezone: "UTC" },
  ]) {
    expect(() => parse({ ...raw(), ...changes })).toThrow();
  }
  expect(
    parse({ ...raw(), sales_minor: -120000, receipts_minor: -120000 })
      .sales_minor,
  ).toBe(-120000);
});
it("rejects inconsistent age buckets, foreign last operation and period reconciliation", () => {
  expect(() =>
    parse({
      ...raw(),
      debt_aging: [...raw().debt_aging.slice(0, 2), raw().debt_aging[0]],
    }),
  ).toThrow();
  expect(() => parse({ ...raw(), outstanding_minor: 200001 })).toThrow();
  expect(() =>
    parse({ ...raw(), last_operation: { business_id: "other" } }),
  ).toThrow();
  const period = {
    ...raw(),
    date_from: "2026-11-01",
    date_to: "2026-11-12",
    opening_balance_minor: 0,
    closing_balance_minor: 200001,
  };
  expect(() =>
    readBusinessReport(
      period,
      "shop-A",
      null,
      period.date_from,
      period.date_to,
    ),
  ).toThrow();
});
it.each([
  ["2026-02-30", "2026-03-01", false],
  ["2026-11-12", "2026-11-01", false],
  ["2024-01-01", "2026-01-01", false],
  ["2024-02-29", "2024-02-29", true],
  ["2026-01-01", "2027-01-01", true],
  ["2026-01-01", "2027-01-02", false],
])("validates inclusive date range %s — %s", (from, to, valid) => {
  expect(validDateRange(from, to)).toBe(valid);
});
it("exports exact decimal money and formula-safe quoted text with RU/KZ labels", () => {
  expect(decimalMinor(-1)).toBe("-0.01");
  const csv = reportCsv(
    { ...raw(), receipts_minor: -501 },
    '=HYPERLINK("x")',
    "ru",
  );
  expect(csv).toContain('"' + "'=HYPERLINK(");
  expect(csv).toContain("-5.01");
  expect(reportCsv(raw(), "Synthetic", "kk")).toContain("Түсімдер");
});
function mount() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={cache}>
      <I18nProvider>
        <MemoryRouter>
          <LanguageSwitch />
          <PeriodReport />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
  const view = render(tree());
  return { ...view, refresh: () => view.rerender(tree()) };
}
function responseFor(path: string) {
  const params = new URL(path, "http://test").searchParams;
  return {
    ...raw(state.business.id),
    date_from: params.get("date_from"),
    date_to: params.get("date_to"),
    opening_balance_minor: 0,
    closing_balance_minor: 200000,
  };
}
it("reports loading/error/retry, then hides stale report and disables export on date change", async () => {
  state.api.request
    .mockRejectedValueOnce(new ApiError(503, "DATABASE_UNAVAILABLE"))
    .mockImplementation(async (path: string) => responseFor(path));
  mount();
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Скачать CSV" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /Повторить/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Скачать CSV" })).toBeEnabled(),
  );
  fireEvent.change(screen.getByLabelText("С даты"), {
    target: { value: "2026-01-01" },
  });
  expect(screen.getByRole("button", { name: "Скачать CSV" })).toBeDisabled();
  expect(
    screen.queryByText("Снимок данных:", { exact: false }),
  ).not.toBeInTheDocument();
});
it("business/session change rejects a late prior response instead of showing/exporting it", async () => {
  let resolve!: (value: unknown) => void;
  const previous = new Promise((done) => {
    resolve = done;
  });
  state.api.request
    .mockReturnValueOnce(previous)
    .mockImplementation(() => new Promise(() => {}));
  const view = mount();
  await waitFor(() => expect(state.api.request).toHaveBeenCalledTimes(1));
  const firstPath = state.api.request.mock.calls[0][0];
  const original = responseFor(firstPath);
  state.scope = "B:epoch2";
  state.business = { id: "shop-B", name: "Second shop" };
  view.refresh();
  await act(async () => {
    resolve(original);
  });
  expect(screen.getByRole("button", { name: "Скачать CSV" })).toBeDisabled();
  expect(screen.queryByText("4 200 ₸")).not.toBeInTheDocument();
});
it("empty report is zero from backend; demo does not invent totals or call API", async () => {
  state.api.request.mockImplementation(async (path: string) => ({
    ...responseFor(path),
    sales_minor: 0,
    receipts_minor: 0,
    outstanding_minor: 0,
    closing_balance_minor: 0,
    operation_count: 0,
    debt_aging: raw().debt_aging.map((x) => ({
      ...x,
      balance_minor: 0,
      sales_count: 0,
    })),
  }));
  const view = mount();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Скачать CSV" })).toBeEnabled(),
  );
  expect(screen.getAllByText("0 ₸").length).toBeGreaterThanOrEqual(3);
  view.unmount();
  state.api.request.mockClear();
  state.gateway.mode = "demo";
  mount();
  expect(state.api.request).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Скачать CSV" }),
  ).not.toBeInTheDocument();
});
it("copies reminder explicitly, reports clipboard failure with selectable manual fallback", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  render(
    <I18nProvider>
      <CopyReminder text="Сәлем! Қарыз: 2000 ₸." />
    </I18nProvider>,
  );
  expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Скопировать напоминание" }),
  );
  await screen.findByRole("textbox");
  expect(screen.getByRole("textbox")).toHaveValue("Сәлем! Қарыз: 2000 ₸.");
});
it("uses business calendar date instead of browser timezone", () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2026-11-11T19:00:00Z"));
    expect(localDate()).toBe("2026-11-12");
  } finally {
    vi.useRealTimers();
  }
});

it("reconciles safe server integers exactly even if an intermediate sum exceeds MAX_SAFE_INTEGER", () => {
  const period = {
    ...raw(),
    date_from: "2026-11-01",
    date_to: "2026-11-12",
    opening_balance_minor: Number.MAX_SAFE_INTEGER,
    closing_balance_minor: Number.MAX_SAFE_INTEGER,
    sales_minor: 2,
    receipts_minor: 2,
  };
  expect(
    readBusinessReport(period, "shop-A", null, period.date_from, period.date_to)
      .closing_balance_minor,
  ).toBe(Number.MAX_SAFE_INTEGER);
  expect(() =>
    readBusinessReport(
      { ...period, receipts_minor: 1 },
      "shop-A",
      null,
      period.date_from,
      period.date_to,
    ),
  ).toThrow();
});
