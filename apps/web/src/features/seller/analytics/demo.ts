import { demoDebtors, demoOutstanding } from "../../../shared/demo/debts";
import type {
  AnalyticsCards,
  AnalyticsDaily,
  AnalyticsDays,
  AnalyticsSnapshot,
  DemoScenario,
} from "./model";

export const DEMO_ANALYTICS_AS_OF = "2026-10-16T10:00:00Z";
export const DEMO_ANALYTICS_BUSINESS = "11111111-1111-4111-8111-111111111111";
export const DEMO_ANALYTICS_EMPTY_BUSINESS =
  "22222222-2222-4222-8222-222222222222";
export interface DemoAnalyticsRequest {
  businessId: string;
  days: AnalyticsDays;
  scenario: DemoScenario;
  scope: string;
  signal: AbortSignal;
}
export interface DemoAnalyticsAdapter {
  readonly mode: "demo";
  read: (request: DemoAnalyticsRequest) => Promise<unknown>;
}

const zeroCards: AnalyticsCards = {
  sales_minor: 0,
  receipts_minor: 0,
  sales_count: 0,
  average_ticket_minor: null,
  outstanding_minor: 0,
  debtors_count: 0,
};
// Explicit fixture amounts/counts only. No journal, summary or financial formula.
const weeklyRows = [
  [750_000, 600_000, 3],
  [0, 100_000, 0],
  [1_250_000, 1_000_000, 4],
  [900_000, -200_000, 3],
  [1_500_000, 1_200_000, 5],
  [1_800_000, 1_500_000, 6],
  [1_200_000, 900_000, 4],
] as const;
const weeklyHours = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 2, 3, 4, 3, 2, 0, 0, 0, 0, 0, 0,
];
const monthlyHours = [
  0, 0, 0, 0, 0, 0, 0, 0, 4, 8, 12, 12, 8, 8, 12, 16, 12, 8, 0, 0, 0, 0, 0, 0,
];

/** Read-only synthetic snapshot. The second permitted Demo business stays empty. */
export function makeDemoAnalyticsSnapshot(
  businessId: string,
  days: AnalyticsDays,
  scenario: Exclude<DemoScenario, "error"> = "activity",
): AnalyticsSnapshot {
  if (
    ![DEMO_ANALYTICS_BUSINESS, DEMO_ANALYTICS_EMPTY_BUSINESS].includes(
      businessId,
    )
  )
    throw new Error("DEMO_ANALYTICS_BUSINESS_NOT_ALLOWED");
  const empty =
    scenario === "empty" || businessId === DEMO_ANALYTICS_EMPTY_BUSINESS;
  const reversal = !empty && scenario === "reversal";
  const daily: AnalyticsDaily[] = Array.from({ length: days }, (_, index) => {
    const date = new Date("2026-10-16T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const weekIndex = index - (days - 7);
    const amounts =
      weekIndex >= 0
        ? weeklyRows[weekIndex]
        : index === 22
          ? [600_000, 2_400_000, 9]
          : [1_000_000, 800_000, 3];
    return {
      date: date.toISOString().slice(0, 10),
      sales_minor: empty || reversal ? 0 : amounts[0],
      receipts_minor: empty
        ? 0
        : reversal
          ? index === days - 1
            ? -100_000
            : 0
          : amounts[1],
      sales_count: empty || reversal ? 0 : amounts[2],
      is_partial: index === days - 1,
    };
  });
  const cards: AnalyticsCards =
    empty || reversal
      ? { ...zeroCards, receipts_minor: reversal ? -100_000 : 0 }
      : days === 7
        ? {
            sales_minor: 7_400_000,
            receipts_minor: 5_100_000,
            sales_count: 25,
            average_ticket_minor: 296_000,
            outstanding_minor: demoOutstanding,
            debtors_count: demoDebtors.length,
          }
        : {
            sales_minor: 30_000_000,
            receipts_minor: 25_100_000,
            sales_count: 100,
            average_ticket_minor: 300_000,
            outstanding_minor: demoOutstanding,
            debtors_count: demoDebtors.length,
          };
  return {
    business_id: businessId,
    days,
    timezone: "Asia/Almaty",
    currency: "KZT",
    as_of: DEMO_ANALYTICS_AS_OF,
    period_from: daily[0].date,
    period_to: daily[days - 1].date,
    today_incomplete: true,
    cards,
    daily,
    hourly: (days === 7 ? weeklyHours : monthlyHours).map((count, hour) => ({
      hour,
      sales_count: empty || reversal ? 0 : count,
    })),
  };
}

function aborted(): DOMException {
  return new DOMException("Analytics request cancelled", "AbortError");
}

/** Abort even a test resolver that ignores its signal; it cannot publish late data. */
function cancellable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => reject(aborted());
    if (signal.aborted) {
      reject(aborted());
      // A deliberately ignoring resolver may still reject later.
      void work.catch(() => {});
      return;
    }
    signal.addEventListener("abort", cancel, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        if (signal.aborted) reject(aborted());
        else resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", cancel);
        reject(signal.aborted ? aborted() : error);
      },
    );
  });
}

export function createDemoAnalyticsAdapter(
  options: {
    delayMs?: number;
    resolve?: (request: DemoAnalyticsRequest) => unknown | Promise<unknown>;
  } = {},
): DemoAnalyticsAdapter {
  const failed = new Set<string>();
  return {
    mode: "demo",
    async read(request) {
      const { signal } = request;
      if (signal.aborted) throw aborted();
      const delayMs = options.delayMs ?? 250;
      if (delayMs > 0)
        await new Promise<void>((resolve, reject) => {
          const cancel = () => {
            clearTimeout(timer);
            reject(aborted());
          };
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", cancel);
            resolve();
          }, delayMs);
          signal.addEventListener("abort", cancel, { once: true });
        });
      if (signal.aborted) throw aborted();
      const key = `${request.scope}:${request.businessId}:${request.days}`;
      if (request.scenario === "error" && !failed.has(key)) {
        failed.add(key);
        throw new Error("DEMO_ANALYTICS_FAILURE");
      }
      const work = Promise.resolve().then(() =>
        options.resolve
          ? options.resolve(request)
          : makeDemoAnalyticsSnapshot(
              request.businessId,
              request.days,
              request.scenario === "error" ? "activity" : request.scenario,
            ),
      );
      return cancellable(work, signal);
    },
  };
}

export const demoAnalyticsAdapter = createDemoAnalyticsAdapter();

/** Previous-period totals belong to this same explicit teaching dataset. */
export function demoPreviousSales(snapshot: AnalyticsSnapshot) {
  return snapshot.cards.sales_minor === 0
    ? 0
    : snapshot.days === 7
      ? 7_100_000
      : 28_000_000;
}
