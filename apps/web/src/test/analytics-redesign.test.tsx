import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assistantDemo } from "../features/assistant/demo";
import {
  readAssistantResponse,
  type AssistantRequest,
} from "../features/assistant/model";
import {
  makeDemoAnalyticsSnapshot,
  DEMO_ANALYTICS_BUSINESS,
  DEMO_ANALYTICS_EMPTY_BUSINESS,
} from "../features/seller/analytics/demo";
import { ru } from "../shared/i18n/ru";
import { kk } from "../shared/i18n/kk";
import {
  defaultFetch,
  deferred,
  ids,
  json,
  renderQa,
  session,
} from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function setup(
  handler?: (request: AssistantRequest, business: string) => Promise<Response>,
) {
  vi.stubEnv("VITE_ASSISTANT_ENABLED", "true");
  const calls: Array<AssistantRequest & { business: string }> = [];
  const fetcher = vi.fn<typeof fetch>((input, init) => {
    const url = new URL(String(input));
    const business = url.pathname.split("/").at(-2)!;
    if (url.pathname.endsWith("/analytics"))
      return Promise.resolve(
        json({
          ...makeDemoAnalyticsSnapshot(
            DEMO_ANALYTICS_BUSINESS,
            Number(url.searchParams.get("days")) as 7 | 30,
          ),
          business_id: business,
        }),
      );
    if (url.pathname.endsWith("/assistant")) {
      const request = JSON.parse(String(init?.body)) as AssistantRequest;
      calls.push({ ...request, business });
      return handler
        ? handler(request, business)
        : Promise.resolve(
            json({
              ...assistantDemo(DEMO_ANALYTICS_BUSINESS, request),
              business_id: business,
              source: request.ai ? "ai" : "facts",
            }),
          );
    }
    return defaultFetch(input, init);
  });
  return {
    ...renderQa({ route: "/seller/analytics", fetcher, initial: session() }),
    calls,
  };
}

describe("Analytics 0.7.1 summary", () => {
  it("loads server facts on entry, period, language and business change; AI requires the button", async () => {
    const view = setup();
    await screen.findByText("По данным сервера");
    expect(view.calls).toEqual([
      {
        question: ru.assistantSummaryQuestion,
        days: 7,
        locale: "ru",
        ai: false,
        business: ids.shopA,
      },
    ]);
    expect(
      screen.queryByLabelText(ru.assistantQuestion),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".assistant-reminder")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(view.calls).toHaveLength(2));
    expect(view.calls[1]).toMatchObject({ days: 30, ai: false });
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    await waitFor(() => expect(view.calls).toHaveLength(3));
    expect(view.calls[2]).toMatchObject({
      days: 30,
      locale: "kk",
      question: kk.assistantSummaryQuestion,
      ai: false,
    });
    await userEvent.click(screen.getByRole("button", { name: "RU" }));
    await screen.findByText("По данным сервера");
    await userEvent.selectOptions(
      screen.getByLabelText("Торговая точка", { exact: true }),
      ids.shopA2,
    );
    await waitFor(() =>
      expect(view.calls.at(-1)).toMatchObject({
        business: ids.shopA2,
        ai: false,
      }),
    );
    expect(view.calls.every((call) => call.ai === false)).toBe(true);
    await userEvent.click(
      screen.getByRole("button", { name: "Объяснить с AI" }),
    );
    await screen.findByText("Ответ AI по вашим данным");
    expect(view.calls.at(-1)).toMatchObject({
      ai: true,
      question: ru.assistantSummaryQuestion,
      business: ids.shopA2,
    });
    expect(view.calls.filter((call) => call.ai)).toHaveLength(1);
  });

  it("hides assistant summary and reminder actions for ASSISTANT_DISABLED", async () => {
    const view = setup(async () =>
      json({ error: { code: "ASSISTANT_DISABLED" } }, 404),
    );
    await waitFor(() => expect(view.calls).toHaveLength(1));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Объяснить с AI" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Спросить Qadam" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".analytics-main-kpis")).toHaveTextContent(
      "74 000 ₸",
    );
    expect(view.calls[0].ai).toBe(false);
  });

  it("ignores a late summary from the old period", async () => {
    const old = deferred<Response>();
    const view = setup(async (request, business) =>
      request.days === 7
        ? old.promise
        : json({
            ...assistantDemo(DEMO_ANALYTICS_BUSINESS, request),
            business_id: business,
          }),
    );
    await waitFor(() => expect(view.calls).toHaveLength(1));
    await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await screen.findByText("По данным сервера");
    await act(async () =>
      old.resolve(
        json({
          ...assistantDemo(DEMO_ANALYTICS_BUSINESS, {
            question: "old",
            days: 7,
            locale: "ru",
            ai: false,
          }),
          business_id: ids.shopA,
          answer: "OLD SUMMARY",
        }),
      ),
    );
    expect(screen.queryByText("OLD SUMMARY")).not.toBeInTheDocument();
    expect(
      document.querySelector(".analytics-period-answer"),
    ).toHaveTextContent("300 000 ₸");
  });
});

describe("one coherent demo dataset", () => {
  for (const locale of ["ru", "kk"] as const)
    for (const days of [7, 30] as const) {
      it(`${locale} ${days}: cards, daily totals, facts, debtors and four answers agree`, () => {
        const snapshot = makeDemoAnalyticsSnapshot(
          DEMO_ANALYTICS_BUSINESS,
          days,
        );
        const text = locale === "ru" ? ru : kk;
        const requests = [
          text.assistantSuggestDebts,
          text.assistantSuggestWeek,
          text.assistantSuggestReminder,
          text.assistantSuggestToday,
        ];
        const responses = requests.map((question) =>
          assistantDemo(
            DEMO_ANALYTICS_BUSINESS,
            { question, days, locale, ai: true },
            snapshot,
          ),
        );
        expect(new Set(responses.map((response) => response.answer)).size).toBe(
          4,
        );
        for (const response of responses) {
          expect(() =>
            readAssistantResponse(response, {
              businessId: DEMO_ANALYTICS_BUSINESS,
              days,
              locale,
            }),
          ).not.toThrow();
          const fact = (key: string) =>
            response.facts.find((item) => item.key === key)?.value_minor;
          expect(fact("sales")).toBe(snapshot.cards.sales_minor);
          expect(fact("receipts")).toBe(snapshot.cards.receipts_minor);
          expect(fact("outstanding")).toBe(snapshot.cards.outstanding_minor);
          const debtors = response.facts.filter(
            (item) => item.key === "debtor",
          );
          expect(debtors.length).toBeLessThanOrEqual(5);
          expect(debtors.length).toBe(snapshot.cards.debtors_count);
          expect(
            debtors.reduce((sum, item) => sum + item.value_minor!, 0),
          ).toBe(snapshot.cards.outstanding_minor);
        }
        expect(
          snapshot.daily.reduce((sum, row) => sum + row.sales_minor, 0),
        ).toBe(snapshot.cards.sales_minor);
        expect(
          snapshot.daily.reduce((sum, row) => sum + row.receipts_minor, 0),
        ).toBe(snapshot.cards.receipts_minor);
        expect(responses[2].actions[0].kind).toBe("reminder_draft");
        expect(responses[1].answer).toContain(
          days === 7 ? "74 000" : "300 000",
        );
        expect(responses[1].answer).toContain("35 000");
      });
    }
  it("empty business and reversal scenario do not reuse active demo debts", () => {
    for (const snapshot of [
      makeDemoAnalyticsSnapshot(DEMO_ANALYTICS_EMPTY_BUSINESS, 7),
      makeDemoAnalyticsSnapshot(DEMO_ANALYTICS_BUSINESS, 7, "reversal"),
    ]) {
      const response = assistantDemo(
        snapshot.business_id,
        {
          question: ru.assistantSummaryQuestion,
          days: 7,
          locale: "ru",
          ai: false,
        },
        snapshot,
      );
      expect(response.facts.filter((fact) => fact.key === "debtor")).toEqual(
        [],
      );
      expect(
        response.facts.find((fact) => fact.key === "outstanding")?.value_minor,
      ).toBe(0);
    }
  });
});
