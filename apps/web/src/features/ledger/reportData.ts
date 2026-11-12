import { useQuery } from "@tanstack/react-query";
import { useBusiness, useRuntime } from "../../app/runtime";
import { ApiError } from "../../shared/api/client";
import { money, record, type Schemas } from "./data";
import { businessLabel } from "./businessText";

export type BusinessReport = Schemas["BusinessReport"];
export function readBusinessReport(
  raw: unknown,
  businessId: string,
  customerId: string | null,
  from: string | null,
  to: string | null,
): BusinessReport {
  const r = record(raw);
  const fail = () => {
    throw new ApiError(0, "INVALID_RESPONSE");
  };
  if (
    r.business_id !== businessId ||
    r.customer_id !== customerId ||
    r.date_from !== from ||
    r.date_to !== to ||
    r.currency !== "KZT" ||
    r.timezone !== "Asia/Almaty" ||
    typeof r.as_of !== "string" ||
    !Number.isFinite(Date.parse(r.as_of))
  )
    fail();
  for (const key of [
    "sales_minor",
    "receipts_minor",
    "outstanding_minor",
    "operation_count",
  ])
    money(r[key]);
  if (Number(r.outstanding_minor) < 0 || Number(r.operation_count) < 0) fail();
  if (from) {
    if (
      money(r.opening_balance_minor) < 0 ||
      money(r.closing_balance_minor) < 0 ||
      BigInt(money(r.opening_balance_minor)) +
        BigInt(money(r.sales_minor)) -
        BigInt(money(r.receipts_minor)) !==
        BigInt(money(r.closing_balance_minor))
    )
      fail();
  } else if (
    r.opening_balance_minor !== null ||
    r.closing_balance_minor !== null
  )
    fail();
  if (!Array.isArray(r.debt_aging) || r.debt_aging.length !== 3) fail();
  const ages = r.debt_aging as unknown[];
  const keys = new Set<string>();
  let balance = 0;
  for (const item of ages) {
    const row = record(item);
    if (
      !["0_7", "8_30", "31_plus"].includes(String(row.bucket)) ||
      keys.has(String(row.bucket)) ||
      money(row.balance_minor) < 0 ||
      money(row.sales_count) < 0
    )
      fail();
    keys.add(String(row.bucket));
    balance += Number(row.balance_minor);
  }
  if (!Number.isSafeInteger(balance) || balance !== r.outstanding_minor) fail();
  if (r.last_operation !== null) {
    const op = record(r.last_operation);
    if (
      op.business_id !== businessId ||
      (customerId && op.customer_id !== customerId) ||
      typeof op.id !== "string" ||
      typeof op.description !== "string" ||
      !["sale", "repayment", "reversal"].includes(String(op.kind)) ||
      typeof op.created_at !== "string" ||
      !Number.isFinite(Date.parse(op.created_at))
    )
      fail();
    money(op.sales_delta_minor);
    money(op.receipts_delta_minor);
  }
  return r as BusinessReport;
}
export function useBusinessReport(
  customerId: string | null = null,
  from: string | null = null,
  to: string | null = null,
) {
  const { api, scope, gateway } = useRuntime();
  const { business } = useBusiness();
  return useQuery({
    queryKey: [scope, business.id, "business-report", customerId, from, to],
    enabled: gateway.mode === "live",
    retry: false,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (customerId) params.set("customer_id", customerId);
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      return readBusinessReport(
        await api.request(`/businesses/${business.id}/report?${params}`, {
          signal,
          expectedApiVersion: "0.8.0",
        }),
        business.id,
        customerId,
        from,
        to,
      );
    },
  });
}
export function validDateRange(from: string, to: string) {
  if (
    !/^20\d\d-\d\d-\d\d$|^2100-\d\d-\d\d$/.test(from) ||
    !/^20\d\d-\d\d-\d\d$|^2100-\d\d-\d\d$/.test(to)
  )
    return false;
  const start = Date.parse(from),
    end = Date.parse(to);
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    new Date(start).toISOString().slice(0, 10) === from &&
    new Date(end).toISOString().slice(0, 10) === to &&
    end >= start &&
    end - start <= 365 * 86400000
  );
}
/** Spreadsheet formula protection for untrusted text; numeric cells are generated separately. */
export function csvText(value: string) {
  const safe =
    /^[\s\uFEFF]*[=+@-]/u.test(value) || /^[\t\r\n]/.test(value)
      ? "'" + value
      : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function decimalMinor(value: number) {
  money(value);
  const abs = Math.abs(value);
  return `${value < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
export function reportCsv(
  report: BusinessReport,
  shop: string,
  locale: "ru" | "kk",
) {
  const b = (key: Parameters<typeof businessLabel>[0]) =>
    businessLabel(key, locale);
  const header = [
    shop,
    report.date_from ?? "",
    report.date_to ?? "",
    report.timezone,
    report.as_of,
  ]
    .map(csvText)
    .join(",");
  const totals = (
    [
      ["sale", report.sales_minor],
      ["receipts", report.receipts_minor],
      ["debt", report.outstanding_minor],
      ["opening", report.opening_balance_minor],
      ["closing", report.closing_balance_minor],
    ] as const
  )
    .filter(([, value]) => value !== null)
    .map(
      ([key, value]) => `${csvText(b(key) + " (KZT)")},${decimalMinor(value!)}`,
    );
  const ages = report.debt_aging.map(
    (row) =>
      `${csvText(b(row.bucket) + " (KZT)")},${decimalMinor(row.balance_minor)}`,
  );
  return (
    "\uFEFF" +
    [
      header,
      ...totals,
      `${csvText(b("count"))},${report.operation_count}`,
      ...ages,
    ].join("\r\n") +
    "\r\n"
  );
}
