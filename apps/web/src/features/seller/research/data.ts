import { queryOptions } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "../../../shared/api/client";
import type { components } from "../../../shared/api/generated";
import examples from "../../../../../../packages/contracts/research-examples.json";

export type Forecast = components["schemas"]["ForecastResponse"];
export type Risk = components["schemas"]["DebtRiskResponse"];
export type FeedbackPage = components["schemas"]["FeedbackPage"];
function check(value: unknown): asserts value {
  if (!value) throw new ApiError(0, "INVALID_RESPONSE");
}
function object(value: unknown): Record<string, unknown> {
  check(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function list(value: unknown, max = 730): Record<string, unknown>[] {
  check(Array.isArray(value) && value.length <= max);
  return value.map(object);
}
function amount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function day(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function stamp(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function metric(value: unknown) {
  const v = object(value);
  for (const key of ["mae_minor", "rmse_minor"])
    check(typeof v[key] === "number" && Number.isFinite(v[key]) && v[key] >= 0);
}
export function readForecast(
  value: unknown,
  businessId: string,
  horizon: 7 | 30,
  demo = false,
): Forecast {
  const v = object(value);
  check(
    v.business_id === businessId && v.horizon === horizon && stamp(v.as_of),
  );
  check(
    v.currency === "KZT" &&
      v.timezone === "Asia/Almaty" &&
      v.model_version === "ridge-lags-v1",
  );
  check(
    [
      "business_ledger",
      "demo_business_ledger",
      ...(demo ? ["synthetic_example"] : []),
    ].includes(String(v.provenance)),
  );
  check(
    typeof v.dataset_sha256 === "string" &&
      /^[0-9a-f]{64}$/.test(v.dataset_sha256),
  );
  const history = list(v.history),
    forecast = list(v.forecast, 30);
  check(
    v.observed_days === history.length && v.required_days === 84 + 2 * horizon,
  );
  history.forEach((row, i) => {
    check(day(row.date) && amount(row.sales_minor));
    if (i)
      check(
        Date.parse(row.date) - Date.parse(String(history[i - 1].date)) ===
          86400000,
      );
  });
  check(
    Array.isArray(v.warnings) && v.warnings.every((w) => typeof w === "string"),
  );
  if (v.status === "insufficient_data")
    check(
      v.evaluation === null &&
        !forecast.length &&
        v.selected_method === null &&
        history.length < Number(v.required_days),
    );
  else {
    check(
      v.status === "experimental" &&
        history.length >= Number(v.required_days) &&
        forecast.length === horizon,
    );
    const e = object(v.evaluation);
    for (const key of [
      "train_from",
      "train_to",
      "validation_from",
      "validation_to",
      "test_from",
      "test_to",
    ])
      check(day(e[key]));
    check(
      String(e.train_to) < String(e.validation_from) &&
        String(e.validation_to) < String(e.test_from),
    );
    check(
      e.test_to === history.at(-1)?.date && e.test_observations === horizon,
    );
    check(
      ["rolling_mean_7", "seasonal_naive_7"].includes(
        String(e.baseline_method),
      ) && [0.1, 1, 10].includes(Number(e.ridge_alpha)),
    );
    check(["ml", "baseline", "tie"].includes(String(e.test_winner)));
    check(
      v.selected_method === e.baseline_method ||
        v.selected_method === "ridge-lags-v1",
    );
    for (const key of [
      "validation_baseline",
      "validation_ml",
      "baseline",
      "ml",
    ])
      metric(e[key]);
    forecast.forEach((row, i) => {
      check(day(row.date));
      check(
        Date.parse(row.date) - Date.parse(String(history.at(-1)?.date)) ===
          (i + 1) * 86400000,
      );
      for (const key of ["baseline_minor", "ml_minor", "selected_minor"])
        check(amount(row[key]));
      check(
        row.selected_minor ===
          row[
            v.selected_method === "ridge-lags-v1"
              ? "ml_minor"
              : "baseline_minor"
          ],
      );
    });
  }
  return value as Forecast;
}
export function readRisk(value: unknown, businessId: string): Risk {
  const v = object(value);
  check(
    v.business_id === businessId &&
      stamp(v.as_of) &&
      v.method === "rules-v1" &&
      v.currency === "KZT",
  );
  check(
    v.supervised_status === "insufficient_data" &&
      v.overdue_status === "unknown_no_due_dates" &&
      v.outcome_metrics === null,
  );
  check(v.next_cursor === null || typeof v.next_cursor === "string");
  const items = list(v.items, 100);
  for (const row of items) {
    check(
      typeof row.customer_id === "string" &&
        typeof row.display_name === "string",
    );
    for (const key of [
      "balance_minor",
      "initial_debt_minor",
      "later_paid_minor",
      "oldest_open_sale_days",
      "open_sales",
      "score",
    ])
      check(amount(row[key]));
    check(
      Number(row.balance_minor) + Number(row.later_paid_minor) ===
        row.initial_debt_minor,
    );
    check(
      Number(row.balance_minor) > 0 &&
        Number(row.open_sales) > 0 &&
        Number(row.score) <= 100,
    );
    check(
      ["low", "medium", "high"].includes(String(row.category)) &&
        Array.isArray(row.factors) &&
        row.factors.every((f) => typeof f === "string"),
    );
  }
  check(new Set(items.map((i) => i.customer_id)).size === items.length);
  return value as Risk;
}
export function readFeedbackPage(
  value: unknown,
  businessId: string,
): FeedbackPage {
  const v = object(value);
  check(
    v.business_id === businessId &&
      (v.next_cursor === null || typeof v.next_cursor === "string"),
  );
  for (const row of list(v.items, 100)) {
    check(
      typeof row.id === "string" &&
        stamp(row.created_at) &&
        row.consent === true &&
        row.consent_version === "v1",
    );
    check(
      typeof row.client_request_id === "string" &&
        ["ru", "kk"].includes(String(row.language)),
    );
    check(
      Array.isArray(row.features_used) &&
        row.features_used.every((f) =>
          [
            "sales",
            "debts",
            "voice",
            "analytics",
            "forecast",
            "risk",
            "catalog",
            "inquiries",
          ].includes(String(f)),
        ),
    );
    for (const key of [
      "sales_debt_clarity",
      "forecast_usefulness",
      "risk_clarity",
    ])
      check(
        row[key] === null ||
          (Number.isInteger(row[key]) &&
            Number(row[key]) >= 1 &&
            Number(row[key]) <= 5),
      );
    for (const key of ["improve_first", "unresolved_problem", "suggestion"])
      check(typeof row[key] === "string");
    check(typeof row.follow_up === "boolean");
  }
  return value as FeedbackPage;
}
export function demoForecast(businessId: string, horizon: 7 | 30) {
  return readForecast(
    {
      ...structuredClone(
        horizon === 7
          ? examples.ForecastSynthetic7
          : examples.ForecastSynthetic30,
      ),
      business_id: businessId,
    },
    businessId,
    horizon,
    true,
  );
}
export function demoRisk(businessId: string): Risk {
  return readRisk(
    {
      ...examples.DebtRiskEmpty,
      business_id: businessId,
      items: [
        {
          customer_id: "20000000-0000-4000-8000-000000000099",
          display_name: "Demo · Оқу клиенті",
          balance_minor: 200000,
          initial_debt_minor: 250000,
          later_paid_minor: 50000,
          oldest_open_sale_days: 31,
          open_sales: 1,
          score: 70,
          category: "high",
          factors: [
            "open_sale_age_31_plus",
            "at_least_half_initial_debt_unpaid",
            "net_later_payment_observed",
          ],
        },
      ],
    },
    businessId,
  );
}
export function researchQuery<T>(options: {
  scope: string;
  businessId: string;
  resource: string;
  params?: Record<string, string>;
  api: ApiClient;
  enabled: boolean;
  demo: boolean;
  sample: () => T;
  read: (value: unknown) => T;
}) {
  return queryOptions({
    queryKey: [
      options.scope,
      options.businessId,
      "research",
      options.resource,
      options.params ?? {},
      options.demo,
    ],
    enabled: options.enabled,
    retry: false,
    staleTime: 0,
    placeholderData: undefined,
    queryFn: async ({ signal }) => {
      if (!options.enabled) throw new ApiError(0, "API_UNCONFIGURED");
      if (options.demo) return options.sample();
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal.aborted) controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, 30000);
      try {
        const value = await options.api.request(
          `/businesses/${options.businessId}/research/${options.resource}?${new URLSearchParams(options.params)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) throw new ApiError(0, "TIMEOUT");
        return options.read(value);
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    },
  });
}
export function downloadResearch(value: unknown, file: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = file;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
