import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, LanguageSwitch } from "../shared/i18n";
import { ApiError } from "../shared/api/client";
import {
  summaryShareText,
  summaryWhatsAppUrl,
  type SummaryValues,
} from "../features/summary/share";
import { demoSummary, demoSummaryDate } from "../features/summary/demo";

const state = vi.hoisted(() => ({
  scope: "account-A",
  business: { id: "business-A", name: "Демо Кайкармет food" },
  gateway: { mode: "live" },
  api: { request: vi.fn() },
}));
vi.mock("../app/runtime", () => ({
  useRuntime: () => state,
  useBusiness: () => ({ business: state.business }),
}));
import { localDate, Summary } from "../features/summary/Summary";

const values: SummaryValues = {
  sales: 123456,
  receipts: 23450,
  balance: 98765,
  inquiries: 7,
};
const response = {
  date: "2026-10-18",
  timezone: "Asia/Almaty",
  currency: "KZT",
  sales_minor: values.sales,
  receipts_minor: values.receipts,
  outstanding_minor: values.balance,
  new_inquiries_count: values.inquiries,
};
const ru =
  "Итог дня 18.10 — Демо Кайкармет food\nПродажи: 1 234,56 ₸\nПолучено: 234,50 ₸\nМне должны (всего): 987,65 ₸\nНовые заявки: 7\n— Qadam";
const kk =
  "18.10 күн қорытындысы — Демо Кайкармет food\nСатылым: 1 234,56 ₸\nТүсім: 234,50 ₸\nМаған қарыздар (барлығы): 987,65 ₸\nЖаңа өтінімдер: 7\n— Qadam";
function expected(locale: "ru" | "kk" = "ru", date = localDate()) {
  return summaryShareText({
    date,
    businessName: state.business.name,
    locale,
    summary: values,
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function nativeShare(mock = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: mock,
  });
  return mock;
}
function mount() {
  const user = userEvent.setup();
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const tree = () => (
    <QueryClientProvider client={cache}>
      <I18nProvider>
        <MemoryRouter>
          <LanguageSwitch />
          <Summary />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
  const view = render(tree());
  return { user, cache, ...view, refresh: () => view.rerender(tree()) };
}
async function ready() {
  return screen.findByRole("link", { name: "Отправить итог в WhatsApp" });
}
beforeEach(() => {
  state.scope = "account-A";
  state.business = { id: "business-A", name: "Демо Кайкармет food" };
  state.gateway.mode = "live";
  state.api.request.mockReset().mockResolvedValue(response);
  Reflect.deleteProperty(navigator, "share");
});
afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
  vi.useRealTimers();
});

describe("summary message and URL", () => {
  it.each([
    ["ru", ru],
    ["kk", kk],
  ] as const)(
    "formats exact %s copy, date, name, count and fractional tenge",
    (locale, text) => {
      expect(
        summaryShareText({
          date: "2026-10-18",
          businessName: state.business.name,
          locale,
          summary: values,
        }),
      ).toBe(text);
      expect(text.split("\n")).toHaveLength(6);
      expect(text).not.toContain("\n\n");
    },
  );
  it("keeps integer, zero and negative server amounts without recalculating debt", () => {
    const text = summaryShareText({
      date: "2026-10-18",
      businessName: "Точка",
      locale: "ru",
      summary: { sales: 300000, receipts: -50000, balance: 0, inquiries: 0 },
    });
    expect(text).toContain(
      "Продажи: 3 000 ₸\nПолучено: -500 ₸\nМне должны (всего): 0 ₸\nНовые заявки: 0",
    );
  });
  it("uses the encoded text as the only WhatsApp query, without recipient or raw currency", () => {
    const href = summaryWhatsAppUrl(ru);
    expect(href).toBe(`https://wa.me/?text=${encodeURIComponent(ru)}`);
    const url = new URL(href);
    expect(url.pathname).toBe("/");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(ru);
    expect(href).toContain("%E2%82%B8");
    expect(href).toContain("%D0");
    expect(href).toContain("%0A");
    expect(href).not.toContain("₸");
  });
  it("uses Taraz day at the UTC midnight boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T20:30:00Z"));
    expect(localDate()).toBe("2026-10-18");
    expect(expected()).toBe(ru);
  });
});

describe("summary sharing states and isolation", () => {
  it("disables all actions while loading and does not build a WhatsApp link", async () => {
    nativeShare();
    const pending = deferred<typeof response>();
    state.api.request.mockReturnValue(pending.promise);
    mount();
    for (const name of [
      "Отправить итог в WhatsApp",
      "Скопировать итог",
      "Поделиться",
    ])
      expect(screen.getByRole("button", { name })).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: /WhatsApp/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("0 ₸")).not.toBeInTheDocument();
    await act(async () => pending.resolve(response));
    expect(await ready()).toHaveAttribute("target", "_blank");
  });
  it("keeps errors unavailable, without zero or Demo fallback", async () => {
    state.api.request.mockRejectedValue(new ApiError(503, "UNAVAILABLE"));
    mount();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Отправить итог/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Скопировать итог" }),
    ).toBeDisabled();
    expect(screen.queryByText("0 ₸")).not.toBeInTheDocument();
    expect(screen.queryByText(/Учебный пример/)).not.toBeInTheDocument();
  });
  it("rejects a missing server field rather than sharing an invented count", async () => {
    state.api.request.mockResolvedValue({
      ...response,
      new_inquiries_count: undefined,
    });
    mount();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Скопировать итог" }),
    ).toBeDisabled();
  });
  it("enables the loaded message without extra requests or financial POST", async () => {
    const { user } = mount();
    const link = await ready();
    expect(link).toHaveAttribute("href", summaryWhatsAppUrl(expected()));
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(screen.getByRole("button", { name: "Скопировать итог" }));
    expect(copy).toHaveBeenCalledWith(expected());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Итог скопирован",
    );
    expect(state.api.request).toHaveBeenCalledTimes(1);
    expect(state.api.request.mock.calls[0][0]).toBe(
      `/businesses/business-A/summary?date=${localDate()}`,
    );
    expect(state.api.request.mock.calls[0][1]).not.toHaveProperty(
      "method",
      "POST",
    );
    expect(link.getAttribute("href")).not.toContain("business-A");
    expect(link.getAttribute("href")).not.toContain("account-A");
  });
  it("reports Clipboard rejection honestly and retains amounts", async () => {
    const { user } = mount();
    await ready();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    await user.click(screen.getByRole("button", { name: "Скопировать итог" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось скопировать",
    );
    expect(screen.queryByText("Итог скопирован")).not.toBeInTheDocument();
    expect(screen.getByText("1 234,56 ₸")).toBeInTheDocument();
  });
  it("handles an unavailable Clipboard API without a false success", async () => {
    const { user } = mount();
    await ready();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    await user.click(screen.getByRole("button", { name: "Скопировать итог" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось скопировать",
    );
  });
  it("hides native share without capability", async () => {
    mount();
    await ready();
    expect(
      screen.queryByRole("button", { name: "Поделиться" }),
    ).not.toBeInTheDocument();
  });
  it("opens native sharing only on a click with the current text", async () => {
    const share = nativeShare();
    const { user } = mount();
    await ready();
    expect(share).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Поделиться" }));
    expect(share).toHaveBeenCalledExactlyOnceWith({ text: expected() });
    expect(state.api.request).toHaveBeenCalledTimes(1);
  });
  it("does not show an error for native cancellation", async () => {
    nativeShare(
      vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError")),
    );
    const { user } = mount();
    await ready();
    await user.click(screen.getByRole("button", { name: "Поделиться" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Скопировать итог" }),
      ).toBeEnabled(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("shows a native failure and leaves WhatsApp and copy available", async () => {
    nativeShare(vi.fn().mockRejectedValue(new Error("denied")));
    const { user } = mount();
    await ready();
    await user.click(screen.getByRole("button", { name: "Поделиться" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось открыть меню",
    );
    expect(await ready()).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Скопировать итог" }),
    ).toBeEnabled();
  });
  it("updates RU/KZ text, labels and copy feedback without a fetch", async () => {
    const { user } = mount();
    await ready();
    await user.click(screen.getByRole("button", { name: "Скопировать итог" }));
    await user.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.queryByText("Итог скопирован")).not.toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: "Қорытындыны WhatsApp-қа жіберу",
    });
    expect(link).toHaveAttribute("href", summaryWhatsAppUrl(expected("kk")));
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(
      screen.getByRole("button", { name: "Қорытындыны көшіру" }),
    );
    expect(copy).toHaveBeenCalledWith(expected("kk"));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Қорытынды көшірілді",
    );
    expect(state.api.request).toHaveBeenCalledTimes(1);
  });
  it("uses only the selected date and disables sharing during date changes", async () => {
    mount();
    await ready();
    const pending = deferred<typeof response>();
    state.api.request.mockReturnValue(pending.promise);
    fireEvent.change(screen.getByLabelText("Дата (Asia/Almaty)"), {
      target: { value: "2026-09-01" },
    });
    expect(
      screen.getByRole("button", { name: "Скопировать итог" }),
    ).toBeDisabled();
    await act(async () => pending.resolve({ ...response, date: "2026-09-01" }));
    expect(await ready()).toHaveAttribute(
      "href",
      summaryWhatsAppUrl(expected("ru", "2026-09-01")),
    );
    fireEvent.change(screen.getByLabelText("Дата (Asia/Almaty)"), {
      target: { value: "" },
    });
    expect(
      screen.getByRole("button", { name: "Скопировать итог" }),
    ).toBeDisabled();
  });
  it("disables stale cached data after a failed refresh", async () => {
    const view = mount();
    await ready();
    state.api.request.mockRejectedValue(new ApiError(503, "UNAVAILABLE"));
    await act(async () => {
      await view.cache.invalidateQueries();
    });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Скопировать итог" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: /WhatsApp/ }),
    ).not.toBeInTheDocument();
  });
  it.each(["business", "account"])(
    "does not expose an old message after %s switch",
    async (change) => {
      const view = mount();
      await ready();
      const pending = deferred<typeof response>();
      state.api.request.mockReturnValue(pending.promise);
      if (change === "business")
        state.business = { id: "business-B", name: "Екінші нүкте" };
      else state.scope = "account-B";
      view.refresh();
      expect(
        screen.getByRole("button", { name: "Скопировать итог" }),
      ).toBeDisabled();
      expect(screen.queryByText("1 234,56 ₸")).not.toBeInTheDocument();
      await act(async () => pending.resolve(response));
      expect(await ready()).toHaveAttribute(
        "href",
        summaryWhatsAppUrl(expected()),
      );
    },
  );
  it("does not display late Clipboard feedback for a different business", async () => {
    const view = mount();
    await ready();
    const pending = deferred<void>();
    vi.spyOn(navigator.clipboard, "writeText").mockReturnValue(pending.promise);
    await view.user.click(
      screen.getByRole("button", { name: "Скопировать итог" }),
    );
    state.business = { id: "business-B", name: "Екінші нүкте" };
    view.refresh();
    await ready();
    await act(async () => pending.resolve());
    expect(screen.queryByText("Итог скопирован")).not.toBeInTheDocument();
  });
  it("shares the approved, fixed-date Demo example without any API request", async () => {
    state.gateway.mode = "demo";
    const { user } = mount();
    const text = summaryShareText({
      date: demoSummaryDate,
      businessName: state.business.name,
      locale: "ru",
      summary: demoSummary,
    });
    expect(await ready()).toHaveAttribute("href", summaryWhatsAppUrl(text));
    expect(screen.getByLabelText("Дата (Asia/Almaty)")).toBeDisabled();
    expect(screen.getByLabelText("Дата (Asia/Almaty)")).toHaveValue(
      "2026-10-15",
    );
    expect(screen.getByText(/Учебный пример/)).toBeInTheDocument();
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(screen.getByRole("button", { name: "Скопировать итог" }));
    expect(copy).toHaveBeenCalledWith(text);
    expect(state.api.request).not.toHaveBeenCalled();
  });
});
