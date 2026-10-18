import type { components } from "../../../shared/api/generated";
import { ApiError } from "../../../shared/api/client";

/** Temporary UI types from the approved 0.7.2 contract, until generated.ts lands. */
export type AnalyticsCollection = {
  sales_minor: number;
  paid_at_sale_minor: number;
  paid_later_minor: number;
  outstanding_minor: number;
};
export type AnalyticsDebtAge = {
  key: "0_7" | "8_30" | "31_plus";
  amount_minor: number;
  sales_count: number;
};
export type AnalyticsSnapshot = components["schemas"]["AnalyticsResponse"] & {
  collection?: AnalyticsCollection | null;
  debt_aging?: AnalyticsDebtAge[] | null;
};
export type AnalyticsDays = AnalyticsSnapshot["days"];
export type DemoScenario = "activity" | "empty" | "error" | "reversal";
export type AnalyticsCards = components["schemas"]["AnalyticsCards"];
export type AnalyticsDaily = components["schemas"]["AnalyticsDay"];
export type AnalyticsHourly = components["schemas"]["AnalyticsHour"];

export class AnalyticsResponseError extends ApiError {
  constructor() {
    super(0, "INVALID_RESPONSE");
    this.name = "AnalyticsResponseError";
  }
}

function invalid(): never {
  throw new AnalyticsResponseError();
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function integer(value: unknown, signed = false): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    (!signed && value < 0)
  )
    invalid();
  return value;
}
function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    invalid();
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  )
    invalid();
  return value;
}
function nextDate(value: string, offset: number): string {
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

function readCollection(value: unknown, sales: number): AnalyticsCollection {
  const row = object(value);
  const result = {
    sales_minor: integer(row.sales_minor),
    paid_at_sale_minor: integer(row.paid_at_sale_minor),
    paid_later_minor: integer(row.paid_later_minor),
    outstanding_minor: integer(row.outstanding_minor),
  };
  if (
    result.sales_minor !== sales ||
    BigInt(result.paid_at_sale_minor) +
      BigInt(result.paid_later_minor) +
      BigInt(result.outstanding_minor) !==
      BigInt(sales)
  )
    invalid();
  return result;
}

function readDebtAging(
  value: unknown,
  outstanding: number,
): AnalyticsDebtAge[] {
  if (!Array.isArray(value) || value.length !== 3) invalid();
  const keys = ["0_7", "8_30", "31_plus"] as const;
  const rows = value.map((item) => {
    const row = object(item);
    if (!keys.includes(row.key as AnalyticsDebtAge["key"])) invalid();
    return {
      key: row.key as AnalyticsDebtAge["key"],
      amount_minor: integer(row.amount_minor),
      sales_count: integer(row.sales_count),
    };
  });
  if (
    new Set(rows.map((row) => row.key)).size !== 3 ||
    rows.reduce((sum, row) => sum + BigInt(row.amount_minor), 0n) !==
      BigInt(outstanding)
  )
    invalid();
  return rows;
}

/** Reject mismatched scopes and malformed snapshots instead of rendering partial money.
 * Aggregate sums are checked for consistency with the supplied cards, never substituted
 * for server totals. BigInt checks cannot overflow while validating safe JSON integers.
 */
export function readAnalyticsSnapshot(
  value: unknown,
  expected: { businessId: string; days: AnalyticsDays },
): AnalyticsSnapshot {
  const source = object(value);
  if (
    source.business_id !== expected.businessId ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      expected.businessId,
    ) ||
    source.days !== expected.days ||
    ![7, 30].includes(expected.days) ||
    source.timezone !== "Asia/Almaty" ||
    source.currency !== "KZT" ||
    source.today_incomplete !== true ||
    typeof source.as_of !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(
      source.as_of,
    ) ||
    !Number.isFinite(Date.parse(source.as_of))
  )
    invalid();
  date(source.as_of.slice(0, 10));
  const periodFrom = date(source.period_from);
  const periodTo = date(source.period_to);
  if (nextDate(periodFrom, expected.days - 1) !== periodTo) invalid();
  // Server as_of, never the browser's current date, defines the local final day.
  const localParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(source.as_of));
  const part = (type: string) =>
    localParts.find((item) => item.type === type)?.value;
  const localDate = `${part("year")}-${part("month")}-${part("day")}`;
  if (localDate !== periodTo) invalid();
  const rawCards = object(source.cards);
  const cards: AnalyticsCards = {
    sales_minor: integer(rawCards.sales_minor),
    receipts_minor: integer(rawCards.receipts_minor, true),
    sales_count: integer(rawCards.sales_count),
    average_ticket_minor:
      rawCards.average_ticket_minor === null
        ? null
        : integer(rawCards.average_ticket_minor),
    outstanding_minor: integer(rawCards.outstanding_minor),
    debtors_count: integer(rawCards.debtors_count),
  };
  if (
    (cards.sales_count === 0 &&
      (cards.average_ticket_minor !== null || cards.sales_minor !== 0)) ||
    (cards.sales_count > 0 &&
      (cards.average_ticket_minor === null || cards.sales_minor === 0))
  )
    invalid();
  if (!Array.isArray(source.daily) || source.daily.length !== expected.days)
    invalid();
  const daily: AnalyticsDaily[] = source.daily.map((item, index) => {
    const row = object(item);
    if (
      date(row.date) !== nextDate(periodFrom, index) ||
      row.is_partial !== (index === expected.days - 1)
    )
      invalid();
    return {
      date: row.date as string,
      sales_minor: integer(row.sales_minor),
      receipts_minor: integer(row.receipts_minor, true),
      sales_count: integer(row.sales_count),
      is_partial: row.is_partial,
    };
  });
  if (!Array.isArray(source.hourly) || source.hourly.length !== 24) invalid();
  const hourly: AnalyticsHourly[] = source.hourly.map((item, hour) => {
    const row = object(item);
    if (row.hour !== hour) invalid();
    return { hour, sales_count: integer(row.sales_count) };
  });
  for (const field of [
    "sales_minor",
    "receipts_minor",
    "sales_count",
  ] as const) {
    if (
      daily.reduce((sum, row) => sum + BigInt(row[field]), 0n) !==
      BigInt(cards[field])
    )
      invalid();
  }
  if (
    hourly.reduce((sum, row) => sum + BigInt(row.sales_count), 0n) !==
    BigInt(cards.sales_count)
  )
    invalid();
  return {
    business_id: expected.businessId,
    days: expected.days,
    timezone: "Asia/Almaty",
    currency: "KZT",
    as_of: source.as_of,
    period_from: periodFrom,
    period_to: periodTo,
    today_incomplete: true,
    cards,
    daily,
    hourly,
    ...(source.collection !== undefined && {
      collection:
        source.collection === null
          ? null
          : readCollection(source.collection, cards.sales_minor),
    }),
    ...(source.debt_aging !== undefined && {
      debt_aging:
        source.debt_aging === null
          ? null
          : readDebtAging(source.debt_aging, cards.outstanding_minor),
    }),
  };
}
