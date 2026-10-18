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
  source: request.ai === false ? "facts" : "ai",
});
type Handler = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
const defaultHandler: Handler = async (input, init) =>
  json(
    sample(
      new URL(String(input)).pathname.split("/").at(-2),
      JSON.parse(String(init?.body)),
    ),
  );
function setup(
  handler: Handler = defaultHandler,
  enabled = true,
  demo = false,
  factsHandler: Handler = defaultHandler,
) {
  vi.stubEnv("VITE_ASSISTANT_ENABLED", String(enabled));
  const ask = vi.fn(handler);
  const facts = vi.fn(factsHandler);
  const fetcher = vi.fn<typeof fetch>((input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/assistant"))
      return (JSON.parse(String(init?.body)).ai ? ask : facts)(input, init);
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
  return {
    ...renderQa({
      route: demo ? "/login" : "/seller/analytics",
      fetcher,
      initial: demo ? null : session(),
    }),
    ask,
    facts,
    fetcher,
  };
}
async function ready() {
  return screen.findByRole("button", { name: "Спросить Qadam" });
}
async function panel() {
  await userEvent.click(await ready());
  return screen.findByRole("dialog");
}
async function ask() {
  const dialog = await panel();
  await userEvent.click(
    within(dialog).getByRole("button", {
      name: "Кто мне должен больше всего?",
    }),
  );
}
async function result() {
  return screen.findByRole("region", { name: "Ответ Qadam" });
}

describe("assistant contract validation", () => {
  const expected = {
    businessId: ids.shopA,
    days: 7 as const,
    locale: "ru" as const,
  };
  it.each(["ai", "fallback", "facts"] as const)(
    "accepts published %s responses and exact integer tiyn",
    (source) => {
      expect(
        readAssistantResponse({ ...sample(), source }, expected).facts[0]
          .value_minor,
      ).toBe(300000);
    },
  );
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

describe("assistant panel through real Auth/runtime/API providers", () => {
  it("loads only facts and opens the panel without a paid request", async () => {
    const view = setup();
    await screen.findByText("По данным сервера");
    expect(view.facts).toHaveBeenCalledOnce();
    expect(view.ask).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Ваш вопрос")).not.toBeInTheDocument();
    await panel();
    expect(screen.getByLabelText("Ваш вопрос")).toBeInTheDocument();
    expect(view.ask).not.toHaveBeenCalled();
  });
  it("submits one authenticated question and copies the reminder without writing money", async () => {
    const user = userEvent.setup();
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const view = setup();
    await ask();
    const answer = await result();
    expect(answer).toHaveTextContent("3 000 ₸");
    expect(answer).toHaveTextContent("Ответ AI по вашим данным");
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
      within(answer).getByRole("button", { name: "Скопировать" }),
    );
    expect(copy).toHaveBeenCalledWith(
      examples.AssistantResponse.actions[0].text,
    );
    expect(within(answer).getByText("Скопировано")).toBeInTheDocument();
    expect(
      view.fetcher.mock.calls.filter(
        ([url, init]) =>
          init?.method === "POST" && !String(url).endsWith("/assistant"),
      ),
    ).toEqual([]);
  });
  it("opens a debtor reminder with that name and ai=true only on click", async () => {
    const view = setup();
    await screen.findByText("По данным сервера");
    const reminder = screen.getAllByRole("button", {
      name: /^Напоминание:/,
    })[0];
    const name = reminder
      .getAttribute("aria-label")!
      .replace("Напоминание: ", "");
    expect(view.ask).not.toHaveBeenCalled();
    await userEvent.click(reminder);
    await result();
    expect(view.ask).toHaveBeenCalledOnce();
    expect(JSON.parse(String(view.ask.mock.calls[0][1]?.body))).toMatchObject({
      question: `Напиши напоминание о долге ${name}`,
      ai: true,
    });
    expect(
      document.querySelector(".analytics-period-summary .assistant-reminder"),
    ).toBeNull();
  });
  it("prevents repeat submissions and retains typed input while pending", async () => {
    const pending = deferred<Response>();
    const view = setup(() => pending.promise);
    await panel();
    const input = screen.getByLabelText("Ваш вопрос");
    expect(screen.getByRole("button", { name: "Спросить" })).toBeDisabled();
    await userEvent.type(input, "Мои продажи?");
    await userEvent.dblClick(screen.getByRole("button", { name: "Спросить" }));
    expect(view.ask).toHaveBeenCalledOnce();
    expect(input).toHaveValue("Мои продажи?");
    await act(async () => pending.resolve(json(sample())));
    await result();
  });
  it("times out without retry and ignores a late answer", async () => {
    const pending = deferred<Response>();
    const view = setup(() => pending.promise);
    await panel();
    vi.useFakeTimers();
    act(() =>
      screen
        .getByRole("button", { name: "Кто мне должен больше всего?" })
        .click(),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(65_000);
    });
    vi.useRealTimers();
    expect(
      within(screen.getByRole("dialog")).getByRole("alert"),
    ).toHaveTextContent("Нет связи с сервером");
    expect(view.ask).toHaveBeenCalledOnce();
    expect(view.ask.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => pending.resolve(json(sample())));
    expect(
      screen.queryByRole("region", { name: "Ответ Qadam" }),
    ).not.toBeInTheDocument();
  });
  it("expires the session on a paid request's 401 and hides private data", async () => {
    setup(async () => json(errorBody(401), 401));
    await ask();
    await screen.findByText("Сессия истекла. Войдите снова.");
    expect(screen.queryByLabelText("Ваш вопрос")).not.toBeInTheDocument();
    expect(document.querySelector(".analytics-period-answer")).toBeNull();
  });
  it("renders allowed navigation kinds only as local links", async () => {
    setup(async () =>
      json({
        ...sample(),
        actions: [
          { kind: "new_sale" },
          { kind: "open_history" },
          { kind: "open_analytics" },
        ],
      }),
    );
    await ask();
    const answer = await result();
    expect(
      within(answer).getByRole("link", { name: "Новая продажа" }),
    ).toHaveAttribute("href", "/seller/sale");
    expect(
      within(answer).getByRole("link", { name: "Открыть историю" }),
    ).toHaveAttribute("href", "/seller/history");
    expect(
      within(answer).getByRole("link", { name: "Аналитика моей точки" }),
    ).toHaveAttribute("href", "/seller/analytics");
  });
  it("labels fallback, zero and empty facts without pretending that AI succeeded", async () => {
    setup(async () =>
      json({
        ...sample(),
        source: "fallback",
        facts: [],
        actions: [],
        answer: "Нет записей.",
      }),
    );
    await ask();
    const answer = await result();
    expect(answer).toHaveTextContent("AI недоступен, показаны данные сервера");
    expect(answer).toHaveTextContent("Пока нет данных для ответа");
  });
  it("shows the paid daily limit but retains the free period summary", async () => {
    const view = setup(async () => json(errorBody(429), 429));
    await ask();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Лимит вопросов на сегодня",
    );
    expect(document.querySelector(".analytics-period-answer")).not.toBeNull();
    expect(view.ask).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Повторить" }),
    ).not.toBeInTheDocument();
  });
  it("hides all assistant affordances after the panel reports ASSISTANT_DISABLED", async () => {
    setup(async () => json({ error: { code: "ASSISTANT_DISABLED" } }, 404));
    await ask();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Объяснить с AI" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Продажи" }),
    ).toBeInTheDocument();
  });
  it("retries a failed paid question explicitly with the same body", async () => {
    let fail = true;
    const view = setup(async () =>
      fail ? json(errorBody(503), 503) : json(sample()),
    );
    await ask();
    await screen.findByRole("alert");
    expect(view.ask).toHaveBeenCalledOnce();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await result();
    expect(view.ask).toHaveBeenCalledTimes(2);
    expect(view.ask.mock.calls[0][1]?.body).toBe(
      view.ask.mock.calls[1][1]?.body,
    );
  });
  it("uses the chosen 30-day period and Kazakh in the panel", async () => {
    const view = setup();
    await ready();
    await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await screen.findByText("По данным сервера");
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Qadam-нан сұрау" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Маған кімнің қарызы ең көп?" }),
    );
    await screen.findByRole("region", { name: "Qadam жауабы" });
    expect(JSON.parse(String(view.ask.mock.calls[0][1]?.body))).toMatchObject({
      days: 30,
      locale: "kk",
      ai: true,
    });
  });
  it("aborts and ignores a pending paid response after an identity change", async () => {
    const pending = deferred<Response>();
    const view = setup(() => pending.promise);
    await ask();
    const signal = view.ask.mock.calls[0][1]?.signal;
    act(() => view.mock.emit(session(ids.b)));
    await waitFor(() =>
      expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopB),
    );
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.resolve(json(sample())));
    expect(
      screen.queryByRole("region", { name: "Ответ Qadam" }),
    ).not.toBeInTheDocument();
  });
  it("rejects a foreign successful response", async () => {
    setup(async () => json(sample(ids.shopB)));
    await ask();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Сервер вернул неожиданный ответ",
    );
    expect(
      screen.queryByRole("region", { name: "Ответ Qadam" }),
    ).not.toBeInTheDocument();
  });
  it("supports manual copying if clipboard access fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    setup();
    await ask();
    await user.click(
      within(await result()).getByRole("button", { name: "Скопировать" }),
    );
    expect(
      screen.getByText(/Выделите текст и скопируйте его вручную/),
    ).toBeInTheDocument();
  });
  it("stays off when the build flag is false", async () => {
    const view = setup(undefined, false);
    await screen.findByRole("heading", { name: "Продажи" });
    expect(view.facts).not.toHaveBeenCalled();
    expect(view.ask).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Спросить Qadam" }),
    ).not.toBeInTheDocument();
  });
  it("uses demo facts and four distinct answers without any assistant POST", async () => {
    const view = setup(undefined, true, true);
    await userEvent.click(
      await screen.findByRole("button", { name: /Посмотреть демо/ }),
    );
    await userEvent.click(
      (await screen.findAllByRole("link", { name: "Аналитика" }))[0],
    );
    await panel();
    for (const name of [
      "Кто мне должен больше всего?",
      "Как прошла неделя?",
      "Напиши напоминание о долге",
      "Что сделать сегодня?",
    ]) {
      await userEvent.click(screen.getByRole("button", { name }));
      expect(await result()).toHaveTextContent("Пример ответа в демо, без AI");
    }
    expect(view.ask).not.toHaveBeenCalled();
    expect(view.facts).not.toHaveBeenCalled();
  });
});
