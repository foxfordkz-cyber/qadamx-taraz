import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import examples from "../../../../packages/contracts/examples.json";
import {
  readAssistantResponse,
  type AssistantRequest,
} from "../features/assistant/model";
import {
  makeDemoAnalyticsSnapshot,
  DEMO_ANALYTICS_BUSINESS,
} from "../features/seller/analytics/demo";
import {
  defaultFetch,
  deferred,
  errorBody,
  ids,
  json,
  renderQa,
  session,
} from "./qa-fixtures";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const sample = (
  businessId = ids.shopA,
  request: Partial<AssistantRequest> = {},
) => ({
  ...structuredClone(examples.AssistantResponse),
  business_id: businessId,
  days: request.days ?? 7,
  locale: request.locale ?? "ru",
});
function setup(
  handler: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response> = async (input, init) => {
    const request = JSON.parse(String(init?.body)) as AssistantRequest;
    return json(
      sample(new URL(String(input)).pathname.split("/").at(-2), request),
    );
  },
  enabled = true,
  demo = false,
) {
  vi.stubEnv("VITE_ASSISTANT_ENABLED", String(enabled));
  const ask = vi.fn(handler);
  const fetcher = vi.fn<typeof fetch>((input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/assistant")) return ask(input, init);
    if (url.pathname.endsWith("/analytics"))
      return Promise.resolve(
        json({
          ...makeDemoAnalyticsSnapshot(
            DEMO_ANALYTICS_BUSINESS,
            Number(url.searchParams.get("days")) as 7 | 30,
          ),
          business_id: url.pathname.split("/").at(-2),
        }),
      );
    return defaultFetch(input, init);
  });
  const view = renderQa({
    route: demo ? "/login" : "/seller/analytics",
    fetcher,
    initial: demo ? null : session(),
  });
  return { ...view, ask, fetcher };
}
async function ready() {
  return screen.findByRole("button", { name: "Объяснить мои цифры" });
}
async function explain() {
  await userEvent.click(await ready());
}

describe("assistant contract validation", () => {
  const expected = {
    businessId: ids.shopA,
    days: 7 as const,
    locale: "ru" as const,
  };
  it("accepts the published example and exact integer tiyn", () => {
    expect(readAssistantResponse(sample(), expected).facts[0].value_minor).toBe(
      300000,
    );
  });
  it.each([
    { business_id: ids.shopB },
    { days: 30 },
    { locale: "kk" },
    { source: "made-up" },
    { facts: [{ key: "sales", label: "Sales", value_minor: 1.5 }] },
    {
      facts: [
        {
          key: "sales",
          label: "Sales",
          value_minor: Number.MAX_SAFE_INTEGER + 1,
        },
      ],
    },
    {
      actions: [
        {
          kind: "reminder_draft",
          customer_id: ids.customer,
          text: "Unknown customer",
        },
      ],
    },
    { actions: [{ kind: "external_link", text: "https://example.com" }] },
  ])("rejects unsafe or mismatched envelope %j", (change) => {
    expect(() =>
      readAssistantResponse({ ...sample(), ...change }, expected),
    ).toThrow("INVALID_RESPONSE");
  });
});

describe("assistant through the real Auth/runtime/API providers", () => {
  it("times out a stalled request without retrying or accepting its late result", async () => {
    const pending = deferred<Response>();
    const view = setup(() => pending.promise);
    await ready();
    vi.useFakeTimers();
    act(() =>
      screen.getByRole("button", { name: "Объяснить мои цифры" }).click(),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(65_000);
    });
    vi.useRealTimers();
    expect(screen.getByRole("alert")).toHaveTextContent("Нет связи с сервером");
    expect(view.ask).toHaveBeenCalledOnce();
    expect(view.ask.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => pending.resolve(json(sample())));
    expect(
      screen.queryByRole("region", { name: "Ответ Qadam" }),
    ).not.toBeInTheDocument();
  });
  it("expires the session on 401 and hides private assistant data", async () => {
    const view = setup(async () => json(errorBody(401), 401));
    await explain();
    expect(
      await screen.findByText("Сессия истекла. Войдите снова."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ваш вопрос")).not.toBeInTheDocument();
    expect(view.ask).toHaveBeenCalledOnce();
  });
  it("renders all navigation kinds as local links without posting operations", async () => {
    const view = setup(async () =>
      json({
        ...sample(),
        actions: [
          { kind: "new_sale" },
          { kind: "open_history" },
          { kind: "open_analytics" },
        ],
      }),
    );
    await explain();
    const result = await screen.findByRole("region", { name: "Ответ Qadam" });
    expect(
      within(result).getByRole("link", { name: "Новая продажа" }),
    ).toHaveAttribute("href", "/seller/sale");
    expect(
      within(result).getByRole("link", { name: "Открыть историю" }),
    ).toHaveAttribute("href", "/seller/history");
    expect(
      within(result).getByRole("link", { name: "Аналитика моей точки" }),
    ).toHaveAttribute("href", "/seller/analytics");
    expect(
      view.fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });
  it("explains an actual zero-valued server snapshot", async () => {
    setup(async () =>
      json({
        ...sample(),
        facts: [{ key: "sales", label: "Продажи", value_minor: 0 }],
        actions: [],
        answer: "Нет продаж.",
      }),
    );
    await explain();
    const result = await screen.findByRole("region", { name: "Ответ Qadam" });
    expect(result).toHaveTextContent("Пока нет данных для ответа");
    expect(result).toHaveTextContent("0 ₸");
  });
  it("is off by default and does not request or show assistant UI", async () => {
    const view = setup(undefined, false);
    await screen.findByRole("heading", { name: "Продажи за период" });
    expect(
      screen.queryByRole("button", { name: "Объяснить мои цифры" }),
    ).not.toBeInTheDocument();
    expect(view.ask).not.toHaveBeenCalled();
    expect(
      document.querySelectorAll(".analytics-main-kpis .analytics-kpi"),
    ).toHaveLength(3);
    expect(document.querySelector(".analytics-details")).not.toHaveAttribute(
      "open",
    );
  });
  it("submits one explicit authenticated request, formats facts and only copies a reminder", async () => {
    const user = userEvent.setup();
    const clipboard = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    const view = setup();
    await ready();
    expect(view.ask).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Кто мне должен больше всего?" }),
    );
    const result = await screen.findByRole("region", { name: "Ответ Qadam" });
    expect(result).toHaveTextContent("3 000 ₸");
    expect(result).toHaveTextContent(
      "Ответ AI по вашим данным. Цифры посчитал сервер",
    );
    expect(view.ask).toHaveBeenCalledOnce();
    const [url, init] = view.ask.mock.calls[0];
    expect(String(url)).toContain(`/businesses/${ids.shopA}/assistant`);
    expect(JSON.parse(String(init?.body))).toEqual({
      question: "Кто мне должен больше всего?",
      days: 7,
      locale: "ru",
      ai: true,
    });
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Bearer qa-only-${ids.a}`,
    );
    await user.click(
      within(result).getByRole("button", { name: "Скопировать" }),
    );
    expect(clipboard).toHaveBeenCalledWith(
      examples.AssistantResponse.actions[0].text,
    );
    expect(within(result).getByText("Скопировано")).toBeInTheDocument();
    expect(view.ask).toHaveBeenCalledOnce();
    expect(
      within(result).getByRole("link", { name: "Открыть долги" }),
    ).toHaveAttribute("href", "/seller/debts");
    const debtors = screen.getByRole("article", { name: "Кому напомнить" });
    expect(
      within(debtors).getByRole("link", { name: /Демо Асқар/ }),
    ).toHaveAttribute("href", expect.stringContaining("customer_id="));
  });
  it("shows pending, prevents repeat clicks and retains the entered question", async () => {
    const pending = deferred<Response>();
    const view = setup(() => pending.promise);
    await ready();
    const input = screen.getByLabelText("Ваш вопрос");
    expect(screen.getByRole("button", { name: "Спросить" })).toBeDisabled();
    await userEvent.type(input, "Мои продажи?");
    await userEvent.dblClick(screen.getByRole("button", { name: "Спросить" }));
    expect(view.ask).toHaveBeenCalledOnce();
    expect(screen.getAllByText("Загрузка…").length).toBeGreaterThan(0);
    expect(input).toHaveValue("Мои продажи?");
    await act(async () => pending.resolve(json(sample())));
    expect(
      await screen.findByRole("region", { name: "Ответ Qadam" }),
    ).toBeInTheDocument();
  });
  it("labels server fallback and handles an empty facts list", async () => {
    setup(async () =>
      json({
        ...sample(),
        source: "fallback",
        facts: [],
        actions: [],
        answer: "Нет записей.",
      }),
    );
    await explain();
    const result = await screen.findByRole("region", { name: "Ответ Qadam" });
    expect(result).toHaveTextContent("AI недоступен, показаны данные сервера");
    expect(result).toHaveTextContent("Пока нет данных для ответа");
  });
  it("shows the daily limit with no automatic retry", async () => {
    const view = setup(async () => json(errorBody(429), 429));
    await explain();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Лимит вопросов на сегодня",
    );
    expect(
      screen.getByRole("button", { name: "Объяснить мои цифры" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Повторить" }),
    ).not.toBeInTheDocument();
    expect(view.ask).toHaveBeenCalledOnce();
  });
  it("hides the assistant when the server disables it", async () => {
    const view = setup(async () =>
      json({ error: { code: "ASSISTANT_DISABLED" } }, 404),
    );
    await explain();
    await waitFor(() =>
      expect(screen.queryByLabelText("Ваш вопрос")).not.toBeInTheDocument(),
    );
    expect(view.ask).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("heading", { name: "Продажи за период" }),
    ).toBeInTheDocument();
  });
  it("retries a failed request only when asked and keeps its question", async () => {
    let fail = true;
    const view = setup(async () =>
      fail ? json(errorBody(503), 503) : json(sample()),
    );
    await explain();
    await screen.findByRole("alert");
    expect(view.ask).toHaveBeenCalledOnce();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByRole("region", { name: "Ответ Qadam" });
    expect(view.ask).toHaveBeenCalledTimes(2);
    expect(view.ask.mock.calls[0][1]?.body).toBe(
      view.ask.mock.calls[1][1]?.body,
    );
  });
  it("uses 30 days and Kazakh and drops the previous answer on context changes", async () => {
    const view = setup();
    await explain();
    await screen.findByRole("region", { name: "Ответ Qadam" });
    await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(
      screen.queryByRole("region", { name: "Ответ Qadam" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Көрсеткіштерімді түсіндіру" }),
    );
    await screen.findByRole("region", { name: "Qadam жауабы" });
    expect(JSON.parse(String(view.ask.mock.calls[1][1]?.body))).toEqual({
      days: 30,
      locale: "kk",
      question: "Кезеңнің қысқаша қорытындысын жаса",
      ai: true,
    });
  });
  it("aborts a pending response on business change and ignores its late result", async () => {
    const pending = deferred<Response>();
    const view = setup(() => pending.promise);
    await explain();
    const signal = view.ask.mock.calls[0][1]?.signal;
    await userEvent.selectOptions(
      screen.getByLabelText("Торговая точка"),
      ids.shopA2,
    );
    await ready();
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.resolve(json(sample())));
    expect(
      screen.queryByText(examples.AssistantResponse.answer),
    ).not.toBeInTheDocument();
  });
  it("discards a late response after an identity change", async () => {
    const pending = deferred<Response>();
    const view = setup(() => pending.promise);
    await explain();
    act(() => view.mock.emit(session(ids.b)));
    await waitFor(() =>
      expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopB),
    );
    await act(async () => pending.resolve(json(sample())));
    expect(
      screen.queryByText(examples.AssistantResponse.answer),
    ).not.toBeInTheDocument();
  });
  it("treats a foreign successful response as an error", async () => {
    setup(async () => json(sample(ids.shopB)));
    await explain();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Сервер вернул неожиданный ответ",
    );
    expect(
      screen.queryByText(examples.AssistantResponse.answer),
    ).not.toBeInTheDocument();
  });
  it("shows a labelled demo example without any assistant POST", async () => {
    const view = setup(undefined, true, true);
    await userEvent.click(
      await screen.findByRole("button", { name: /Посмотреть демо/ }),
    );
    await userEvent.click(
      (await screen.findAllByRole("link", { name: "Аналитика" }))[0],
    );
    await explain();
    const result = await screen.findByRole("region", { name: "Ответ Qadam" });
    expect(result).toHaveTextContent("Пример ответа в демо, без AI");
    expect(result).not.toHaveTextContent("AI недоступен");
    expect(view.ask).not.toHaveBeenCalled();
  });
  it("provides manual copying when clipboard access is rejected", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    setup();
    await explain();
    await user.click(
      await screen.findByRole("button", { name: "Скопировать" }),
    );
    expect(
      screen.getByText(/Выделите текст и скопируйте его вручную/),
    ).toBeInTheDocument();
  });
});
