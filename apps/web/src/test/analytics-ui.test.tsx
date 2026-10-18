import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { App } from "../app/App";
import { AuthProvider, useAuth } from "../app/auth";
import { makeQueryClient } from "../app/query";
import type { SellerGateway } from "../shared/api/gateway";
import { demoGateway } from "../shared/demo/gateway";
import { I18nProvider } from "../shared/i18n";
import {
  createDemoAnalyticsAdapter,
  DEMO_ANALYTICS_BUSINESS,
  DEMO_ANALYTICS_EMPTY_BUSINESS,
  makeDemoAnalyticsSnapshot,
  type DemoAnalyticsAdapter,
} from "../features/seller/analytics/demo";
import { AnalyticsDemoAdapterProvider } from "../features/seller/analytics/queries";
import { analyticsDate } from "../features/seller/analytics/Charts";
import {
  defaultFetch,
  deferred,
  errorBody,
  ids,
  json,
  mockAuth,
  session,
} from "./qa-fixtures";
import type { AnalyticsDays } from "../features/seller/analytics/model";

// JSDOM has no layout/scroll implementation; keyboard focus is still real DOM focus.
const originalScroll = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: vi.fn(),
    configurable: true,
  });
});
afterAll(() => {
  if (originalScroll)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      originalScroll,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderAnalytics({
  adapter = createDemoAnalyticsAdapter({ delayMs: 0 }),
  live = false,
  route = live ? "/seller/analytics" : "/login",
  liveTransport,
}: {
  adapter?: DemoAnalyticsAdapter;
  live?: boolean;
  route?: string;
  liveTransport?: typeof fetch;
} = {}) {
  if (liveTransport) {
    vi.stubEnv("VITE_API_BASE_URL", "https://analytics.invalid/api/v1");
    vi.stubGlobal("fetch", liveTransport);
  }
  const mock = live ? mockAuth() : null;
  const client = mock?.client ?? null;
  const gateway: SellerGateway | undefined = live
    ? liveTransport
      ? undefined
      : { ...demoGateway, mode: "live" }
    : demoGateway;
  const cache = makeQueryClient();
  let auth!: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return null;
  }
  const view = render(
    <QueryClientProvider client={cache}>
      <I18nProvider>
        <AuthProvider client={client}>
          <Probe />
          <AnalyticsDemoAdapterProvider value={adapter}>
            <MemoryRouter initialEntries={[route]}>
              <App gateway={gateway} />
            </MemoryRouter>
          </AnalyticsDemoAdapterProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { ...view, adapter, cache, mock, auth: () => auth };
}

// Contract-shaped synthetic responses through the real API client. No live DB/Auth.
function liveSnapshot(businessId: string, days: AnalyticsDays, empty = false) {
  return {
    ...makeDemoAnalyticsSnapshot(
      DEMO_ANALYTICS_BUSINESS,
      days,
      empty ? "empty" : "activity",
    ),
    business_id: businessId,
  };
}

function analyticsUrl(input: RequestInfo | URL) {
  const url = new URL(String(input));
  return url.pathname.endsWith("/analytics") ? url : null;
}

function snapshotFromUrl(url: URL) {
  return liveSnapshot(
    url.pathname.split("/").at(-2)!,
    Number(url.searchParams.get("days")) as AnalyticsDays,
  );
}

async function openDemo(adapter?: DemoAnalyticsAdapter) {
  const view = renderAnalytics({ adapter });
  await userEvent.click(
    screen.getByRole("button", { name: /Посмотреть демо/ }),
  );
  await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
  await userEvent.click(screen.getAllByRole("link", { name: "Аналитика" })[0]);
  await screen.findByRole("heading", { name: "Аналитика" });
  return view;
}

function metric(name: string) {
  const article = screen.getByRole("heading", { name }).closest("article");
  expect(article).not.toBeNull();
  return within(article!);
}

async function reportReady() {
  await screen.findByRole("heading", { name: "Продажи" });
}

async function openTables() {
  const details =
    document.querySelector<HTMLDetailsElement>(".analytics-details")!;
  if (!details.open)
    await userEvent.click(screen.getByText("Подробнее", { exact: true }));
  await userEvent.click(screen.getByText("Таблица по часам", { exact: true }));
  return {
    daily: screen.getByRole("table", {
      name: "Действующие продажи и поступления по дням",
    }),
    hourly: screen.getByRole("table", {
      name: "Зарегистрированные действующие продажи по часам",
    }),
  };
}

describe("Analytics through the existing App, Auth, business and RU/KZ providers", () => {
  it("uses readable Kazakh calendar dates independently of Chromium's incomplete ICU month names", () => {
    expect(analyticsDate("2026-10-16", "kk", "Asia/Almaty")).toBe("16 қазан");
    expect(analyticsDate("2026-10-16", "kk", "Asia/Almaty", true)).toBe(
      "16 қаз.",
    );
    expect(analyticsDate("2026-01-01", "kk", "Asia/Almaty")).toBe("1 қаңтар");
    expect(analyticsDate("2026-12-31", "kk", "Asia/Almaty")).toBe(
      "31 желтоқсан",
    );
    expect(analyticsDate("2026-10-16", "ru", "Asia/Almaty")).toBe("16 октября");
  });
  it("protects its direct route before any Analytics adapter request", async () => {
    const read = vi.fn<DemoAnalyticsAdapter["read"]>();
    renderAnalytics({
      route: "/seller/analytics",
      adapter: { mode: "demo", read },
    });
    expect(
      await screen.findByRole("button", { name: "Войти" }),
    ).toBeInTheDocument();
    expect(read).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Аналитика" }),
    ).not.toBeInTheDocument();
  });

  it("labels Demo, formats integer tiyn as ₸ and exposes every day/hour with the incomplete current day", async () => {
    const read = vi.fn(createDemoAnalyticsAdapter({ delayMs: 0 }).read);
    const view = await openDemo({ mode: "demo", read });
    await reportReady();
    expect(view.auth().demo).toBe(true);
    expect(view.container.querySelector(".analytics-page > .badge")).toHaveTextContent("Демо-данные");
    expect(metric("Продажи").getByText("74 000 ₸")).toBeInTheDocument();
    expect(metric("Поступления").getByText("51 000 ₸")).toBeInTheDocument();
    expect(metric("Средний чек").getByText("2 960 ₸")).toBeInTheDocument();
    expect(
      metric("Мне должны сейчас").getByText("35 000 ₸"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Сегодня — неполный день").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Не отражает посещаемость/)).toBeInTheDocument();
    const tables = await openTables();
    expect(within(tables.daily).getAllByRole("row")).toHaveLength(8);
    expect(within(tables.daily).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(tables.hourly).getAllByRole("row")).toHaveLength(25);
    expect(
      within(tables.hourly).getByRole("rowheader", { name: "23:00" }),
    ).toBeInTheDocument();
    expect(read).toHaveBeenCalledOnce();
    expect(read.mock.calls[0][0]).toMatchObject({
      businessId: DEMO_ANALYTICS_BUSINESS,
      days: 7,
      scenario: "activity",
    });
  });

  it("switches 7/30 days, preserves the selected period across RU/KZ and keeps server scope unchanged", async () => {
    const read = vi.fn(createDemoAnalyticsAdapter({ delayMs: 0 }).read);
    await openDemo({ mode: "demo", read });
    await reportReady();
    const period = screen.getByRole("group", { name: "Период отчёта" });
    await userEvent.click(
      within(period).getByRole("button", { name: "30 дней" }),
    );
    await waitFor(() =>
      expect(metric("Продажи").getByText("300 000 ₸")).toBeInTheDocument(),
    );
    expect(
      within(period).getByRole("button", { name: "30 дней" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(
      screen.getByRole("heading", {
        name: "Аналитика",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 күн" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Оқу сценарийі")).toHaveValue("activity");
    expect(metric("Сатылымдар").getByText("300 000 ₸")).toBeInTheDocument();
    expect(read.mock.calls.map(([request]) => request.days)).toEqual([7, 30]);
    expect(
      new Set(read.mock.calls.map(([request]) => request.scope)).size,
    ).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "RU" }));
    await userEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await waitFor(() =>
      expect(metric("Продажи").getByText("74 000 ₸")).toBeInTheDocument(),
    );
  });

  it("keeps three main metrics, details and unfiltered debt links in both languages", async () => {
    vi.stubEnv("VITE_ASSISTANT_ENABLED", "true");
    await openDemo();
    await reportReady();
    const cards = [
      ["Продажи", "74 000 ₸"],
      ["Поступления", "51 000 ₸"],
      ["Количество продаж", "25"],
      ["Средний чек", "2 960 ₸"],
      ["Мне должны сейчас", "35 000 ₸"],
      ["Количество должников", "3"],
    ];
    cards.forEach(([title, value]) =>
      expect(metric(title).getByText(value)).toBeInTheDocument(),
    );
    expect(
      document.querySelectorAll(".analytics-main-kpis .analytics-kpi"),
    ).toHaveLength(3);
    expect(document.querySelector(".analytics-details")).not.toHaveAttribute(
      "open",
    );
    expect(
      await screen.findByText(/За период продажи составили 74 000/),
    ).toHaveTextContent("35 000 ₸");
    expect(screen.getByRole("link", { name: "Все долги →" })).toHaveAttribute(
      "href",
      "/seller/debts",
    );
    await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() =>
      expect(metric("Продажи").getByText("300 000 ₸")).toBeInTheDocument(),
    );
    expect(metric("Количество должников").getByText("3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(metric("Сатылымдар саны").getByText("100")).toBeInTheDocument();
    expect(metric("Борышкерлер саны").getByText("3")).toBeInTheDocument();
    expect(
      await screen.findByText(/Кезеңдегі сатылымдар — 300 000/),
    ).toHaveTextContent("35 000 ₸");
  });

  it("keeps zero days/hours and presents null average as no sales rather than zero or NaN", async () => {
    await openDemo();
    await reportReady();
    await userEvent.selectOptions(
      screen.getByLabelText("Учебный сценарий"),
      "empty",
    );
    await screen.findByRole("heading", {
      name: "Нет действующих продаж и чистых поступлений",
    });
    expect(metric("Средний чек").getByText("Нет продаж")).toBeInTheDocument();
    expect(metric("Средний чек").queryByText("0 ₸")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Новая продажа" })).toHaveAttribute(
      "href",
      "/seller/sale",
    );
    expect(screen.getByText("Подробнее").parentElement).not.toHaveAttribute(
      "open",
    );
    await userEvent.click(screen.getByText("Подробнее"));
    const tables = await openTables();
    expect(within(tables.daily).getAllByRole("row")).toHaveLength(8);
    expect(within(tables.hourly).getAllByRole("row")).toHaveLength(25);
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it("keeps a pre-existing debt visible when the selected period has no sales or net receipts", async () => {
    const snapshot = makeDemoAnalyticsSnapshot(
      DEMO_ANALYTICS_BUSINESS,
      7,
      "empty",
    );
    snapshot.cards.outstanding_minor = 3_500_000;
    snapshot.debt_aging = null;
    snapshot.cards.debtors_count = 8;
    await openDemo(
      createDemoAnalyticsAdapter({ delayMs: 0, resolve: () => snapshot }),
    );
    await reportReady();
    expect(
      screen.getByRole("heading", {
        name: "Нет действующих продаж и чистых поступлений",
      }),
    ).toBeInTheDocument();
    expect(
      metric("Мне должны сейчас").getByText("35 000 ₸"),
    ).toBeInTheDocument();
    expect(metric("Количество должников").getByText("8")).toBeInTheDocument();
    expect(metric("Продажи").getByText("0 ₸")).toBeInTheDocument();
    expect(metric("Средний чек").getByText("Нет продаж")).toBeInTheDocument();
    expect(
      screen.getByText(/Текущий долг показан отдельно/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Все значения равны нулю/),
    ).not.toBeInTheDocument();
  });

  it("shows an old reversal as signed receipts while sales stay zero, including in the table and chart", async () => {
    await openDemo();
    await reportReady();
    await userEvent.selectOptions(
      screen.getByLabelText("Учебный сценарий"),
      "reversal",
    );
    await waitFor(() =>
      expect(metric("Поступления").getByText("-1 000 ₸")).toBeInTheDocument(),
    );
    expect(
      document.querySelector(".analytics-chart-explanation"),
    ).toHaveAttribute("title", expect.stringContaining("отмен"));
    expect(metric("Поступления").getByText("-1 000 ₸")).toBeInTheDocument();
    expect(metric("Продажи").getByText("0 ₸")).toBeInTheDocument();
    expect(metric("Средний чек").getByText("Нет продаж")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Поступления" }));
    const chart = screen.getByRole("region", {
      name: "Дневной график; горизонтальная прокрутка",
    });
    expect(
      within(chart).getByRole("button", { name: /Поступления: -1 000 ₸/ }),
    ).toHaveAccessibleName(/Сегодня — неполный день/);
    expect(screen.getByText("Минимум за день: -1 000 ₸")).toBeInTheDocument();
    const tables = await openTables();
    expect(
      within(tables.daily).getByRole("cell", { name: "-1 000 ₸" }),
    ).toBeInTheDocument();
  });

  it("keeps offsetting receipts visible even when the period net is zero", async () => {
    const snapshot = makeDemoAnalyticsSnapshot(
      DEMO_ANALYTICS_BUSINESS,
      7,
      "empty",
    );
    snapshot.daily[0].receipts_minor = 100_000;
    snapshot.daily[1].receipts_minor = -100_000;
    await openDemo(
      createDemoAnalyticsAdapter({ delayMs: 0, resolve: () => snapshot }),
    );
    await reportReady();
    expect(
      screen.queryByText("Показать по дням и часам"),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Поступления" }));
    const chart = screen.getByRole("region", {
      name: "Дневной график; горизонтальная прокрутка",
    });
    expect(
      within(chart).getByRole("button", { name: /Поступления: -1 000 ₸/ }),
    ).toBeInTheDocument();
    expect(
      within(chart).getByRole("button", { name: /Поступления: 1 000 ₸/ }),
    ).toBeInTheDocument();
  });

  it("provides exact chart values and roving keyboard focus without requiring a pointer", async () => {
    await openDemo();
    await reportReady();
    const daily = screen.getByRole("region", {
      name: "Дневной график; горизонтальная прокрутка",
    });
    const dailyBars = within(daily).getAllByRole("button");
    expect(dailyBars).toHaveLength(7);
    expect(dailyBars.filter((bar) => bar.tabIndex === 0)).toHaveLength(1);
    act(() => dailyBars[6].focus());
    await userEvent.keyboard("{Home}");
    expect(dailyBars[0]).toHaveFocus();
    expect(dailyBars[0]).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{ArrowRight}");
    expect(dailyBars[1]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(dailyBars[6]).toHaveFocus();
    const hourly = screen.getByRole("region", {
      name: "Почасовой график; горизонтальная прокрутка",
    });
    const hourlyBars = within(hourly).getAllByRole("button");
    expect(hourlyBars).toHaveLength(24);
    act(() => hourlyBars[0].focus());
    await userEvent.keyboard("{End}");
    expect(hourlyBars[23]).toHaveFocus();
    expect(hourlyBars[23]).toHaveAccessibleName("23:00. Количество продаж: 0");
  });

  it("replaces a report with loading state and keeps failure retry explicit", async () => {
    const pending = deferred<unknown>();
    const base = createDemoAnalyticsAdapter({
      delayMs: 0,
      resolve: () => pending.promise,
    });
    const read = vi.fn(base.read);
    await openDemo({ mode: "demo", read });
    expect(screen.getByText("Загрузка…")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Продажи" }),
    ).not.toBeInTheDocument();
    await act(async () =>
      pending.resolve(makeDemoAnalyticsSnapshot(DEMO_ANALYTICS_BUSINESS, 7)),
    );
    await reportReady();
    await userEvent.selectOptions(
      screen.getByLabelText("Учебный сценарий"),
      "error",
    );
    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent(
      "Учебный сбой загрузки, а не ответ сервера.",
    );
    expect(
      screen.getByRole("button", { name: "Повторить" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Продажи" }),
    ).not.toBeInTheDocument();
    expect(
      read.mock.calls.filter(([request]) => request.scenario === "error"),
    ).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await reportReady();
    expect(
      read.mock.calls.filter(([request]) => request.scenario === "error"),
    ).toHaveLength(2);
  });

  it("switches only permitted businesses and drops the previous report while the next loads", async () => {
    const pending = deferred<unknown>();
    const adapter = createDemoAnalyticsAdapter({
      delayMs: 0,
      resolve: (request) =>
        request.businessId === DEMO_ANALYTICS_EMPTY_BUSINESS
          ? pending.promise
          : makeDemoAnalyticsSnapshot(request.businessId, request.days),
    });
    await openDemo(adapter);
    await reportReady();
    const selector = screen.getByLabelText("Торговая точка");
    expect(within(selector).getAllByRole("option")).toHaveLength(2);
    await userEvent.selectOptions(selector, DEMO_ANALYTICS_EMPTY_BUSINESS);
    expect(screen.queryByText("74 000 ₸")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Продажи" }),
    ).not.toBeInTheDocument();
    await act(async () =>
      pending.resolve(
        makeDemoAnalyticsSnapshot(DEMO_ANALYTICS_EMPTY_BUSINESS, 7),
      ),
    );
    await screen.findByRole("heading", {
      name: "Нет действующих продаж и чистых поступлений",
    });
    expect(metric("Продажи").getByText("0 ₸")).toBeInTheDocument();
    expect(selector).toHaveValue(DEMO_ANALYTICS_EMPTY_BUSINESS);
  });

  it("leaves a signed-in seller waiting when its API URL is unconfigured and never implicitly enters Demo", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const read = vi.fn<DemoAnalyticsAdapter["read"]>();
    const view = renderAnalytics({
      live: true,
      adapter: { mode: "demo", read },
    });
    await screen.findByRole("heading", {
      name: "Аналитика ожидает подключения",
    });
    expect(view.auth().demo).toBe(false);
    expect(view.auth().session).not.toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Учебный сценарий")).not.toBeInTheDocument();
    expect(screen.queryByText("Демо-данные")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Продажи" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(read).not.toHaveBeenCalled();
    expect(view.auth().demo).toBe(false);
  });
});

describe("Analytics UI using the published 0.6 contract and the real authenticated API client", () => {
  it("loads 7/30-day snapshots with Bearer and ignores a foreign business URL parameter", async () => {
    const demoRead = vi.fn<DemoAnalyticsAdapter["read"]>();
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = analyticsUrl(input);
      return url
        ? Promise.resolve(json(snapshotFromUrl(url)))
        : defaultFetch(input, init);
    });
    const view = renderAnalytics({
      live: true,
      route: `/seller/analytics?business_id=${ids.shopB}`,
      liveTransport: fetcher,
      adapter: { mode: "demo", read: demoRead },
    });
    await reportReady();
    expect(metric("Продажи").getByText("74 000 ₸")).toBeInTheDocument();
    expect(view.auth().demo).toBe(false);
    expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopA);
    expect(screen.queryByLabelText("Учебный сценарий")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() =>
      expect(metric("Продажи").getByText("300 000 ₸")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByRole("button", { name: "30 күн" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(metric("Сатылымдар").getByText("300 000 ₸")).toBeInTheDocument();
    const requests = fetcher.mock.calls.filter(([input]) =>
      analyticsUrl(input),
    );
    expect(requests.map(([input]) => String(input))).toEqual([
      `https://analytics.invalid/api/v1/businesses/${ids.shopA}/analytics?days=7`,
      `https://analytics.invalid/api/v1/businesses/${ids.shopA}/analytics?days=30`,
    ]);
    for (const [, init] of requests) {
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        `Bearer qa-only-${ids.a}`,
      );
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.method ?? "GET").toBe("GET");
    }
    expect(demoRead).not.toHaveBeenCalled();
    expect(view.mock!.auth.getSession).toHaveBeenCalled();
  });

  it.each([
    [404, "Данные не найдены."],
    [503, "Сервер временно недоступен. Попробуйте позже."],
  ])(
    "renders live HTTP %i as an error, retries only on request and never reads Demo",
    async (status, message) => {
      let fail = true;
      const demoRead = vi.fn<DemoAnalyticsAdapter["read"]>();
      const fetcher = vi.fn<typeof fetch>((input, init) => {
        const url = analyticsUrl(input);
        return url
          ? Promise.resolve(
              fail
                ? json(errorBody(status), status)
                : json(snapshotFromUrl(url)),
            )
          : defaultFetch(input, init);
      });
      const view = renderAnalytics({
        live: true,
        liveTransport: fetcher,
        adapter: { mode: "demo", read: demoRead },
      });
      const error = await screen.findByRole("alert");
      expect(error).toHaveTextContent(message);
      expect(
        screen.queryByText("PRIVATE_SERVER_TRACE_MUST_NOT_RENDER"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Продажи" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("article", { name: "Краткая сводка" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Новая продажа" }),
      ).not.toBeInTheDocument();
      expect(
        fetcher.mock.calls.filter(([input]) => analyticsUrl(input)),
      ).toHaveLength(1);
      expect(view.auth().demo).toBe(false);
      fail = false;
      await userEvent.click(
        within(error).getByRole("button", { name: "Повторить" }),
      );
      await reportReady();
      expect(
        fetcher.mock.calls.filter(([input]) => analyticsUrl(input)),
      ).toHaveLength(2);
      expect(metric("Продажи").getByText("74 000 ₸")).toBeInTheDocument();
      expect(demoRead).not.toHaveBeenCalled();
      expect(view.auth().demo).toBe(false);
    },
  );

  it("expires the current session on an actual Analytics HTTP 401 without displaying private cards or Demo", async () => {
    const demoRead = vi.fn<DemoAnalyticsAdapter["read"]>();
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      analyticsUrl(input)
        ? Promise.resolve(json(errorBody(401), 401))
        : defaultFetch(input, init),
    );
    const view = renderAnalytics({
      live: true,
      liveTransport: fetcher,
      adapter: { mode: "demo", read: demoRead },
    });
    expect(
      await screen.findByText("Сессия истекла. Войдите снова."),
    ).toBeInTheDocument();
    expect(view.auth().expired).toBe(true);
    expect(view.auth().demo).toBe(false);
    expect(
      screen.queryByRole("heading", { name: "Продажи" }),
    ).not.toBeInTheDocument();
    expect(demoRead).not.toHaveBeenCalled();
    expect(
      fetcher.mock.calls.filter(([input]) => analyticsUrl(input)),
    ).toHaveLength(1);
  });

  it("rejects a successful Analytics response from another business without showing any of its money", async () => {
    const demoRead = vi.fn<DemoAnalyticsAdapter["read"]>();
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      analyticsUrl(input)
        ? Promise.resolve(json(liveSnapshot(ids.shopB, 7)))
        : defaultFetch(input, init),
    );
    const view = renderAnalytics({
      live: true,
      liveTransport: fetcher,
      adapter: { mode: "demo", read: demoRead },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Сервер вернул неожиданный ответ. Сообщите команде.",
    );
    expect(screen.queryByText("74 000 ₸")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Продажи" }),
    ).not.toBeInTheDocument();
    expect(view.auth().demo).toBe(false);
    expect(demoRead).not.toHaveBeenCalled();
  });

  it("requests only the selected membership and clears old live cards while the next business is pending", async () => {
    const pending = deferred<Response>();
    let pendingSignal: AbortSignal | null | undefined;
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = analyticsUrl(input);
      if (!url) return defaultFetch(input, init);
      if (url.pathname.includes(ids.shopA2)) {
        pendingSignal = init?.signal;
        return pending.promise;
      }
      return Promise.resolve(json(snapshotFromUrl(url)));
    });
    const view = renderAnalytics({ live: true, liveTransport: fetcher });
    await reportReady();
    const selector = screen.getByLabelText("Торговая точка");
    await userEvent.selectOptions(selector, ids.shopA2);
    await waitFor(() => expect(pendingSignal).toBeDefined());
    expect(screen.queryByText("74 000 ₸")).not.toBeInTheDocument();
    expect(screen.getByText("Загрузка…")).toBeInTheDocument();
    await act(async () =>
      pending.resolve(json(liveSnapshot(ids.shopA2, 7, true))),
    );
    await reportReady();
    expect(metric("Продажи").getByText("0 ₸")).toBeInTheDocument();
    expect(selector).toHaveValue(ids.shopA2);
    expect(
      fetcher.mock.calls.some(([input]) => String(input).includes(ids.shopB)),
    ).toBe(false);
    expect(view.auth().demo).toBe(false);
  });

  it("does not let a late Analytics 401 from the first A session expire a fresh A session after A/B/A", async () => {
    const late = deferred<Response>();
    let firstA = true;
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = analyticsUrl(input);
      if (!url) return defaultFetch(input, init);
      const businessId = url.pathname.split("/").at(-2)!;
      if (businessId === ids.shopA && firstA) {
        firstA = false;
        return late.promise;
      }
      return Promise.resolve(
        json(liveSnapshot(businessId, 7, businessId === ids.shopB)),
      );
    });
    const view = renderAnalytics({ live: true, liveTransport: fetcher });
    await waitFor(() => expect(firstA).toBe(false));
    const oldScope = view.auth().scope;
    act(() => view.mock!.emit(session(ids.b)));
    await waitFor(() =>
      expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopB),
    );
    await reportReady();
    expect(metric("Продажи").getByText("0 ₸")).toBeInTheDocument();
    act(() => view.mock!.emit(session(ids.a, "qa-fresh-A-session")));
    await waitFor(() =>
      expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopA),
    );
    await waitFor(() =>
      expect(metric("Продажи").getByText("74 000 ₸")).toBeInTheDocument(),
    );
    const freshScope = view.auth().scope;
    expect(freshScope).not.toBe(oldScope);
    await act(async () => late.resolve(json(errorBody(401), 401)));
    expect(view.auth().expired).toBe(false);
    expect(view.auth().session?.user.id).toBe(ids.a);
    expect(view.auth().scope).toBe(freshScope);
    expect(metric("Продажи").getByText("74 000 ₸")).toBeInTheDocument();
    expect(
      view.cache
        .getQueryCache()
        .getAll()
        .every((query) => query.queryKey[0] !== oldScope),
    ).toBe(true);
  });
});
