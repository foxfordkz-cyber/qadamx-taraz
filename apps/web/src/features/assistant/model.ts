import type { components } from "../../shared/api/generated";
import { ApiError } from "../../shared/api/client";
import { readUuid } from "../../shared/api/bindings";

export type AssistantRequest = components["schemas"]["AssistantRequest"];
export type AssistantResponse = components["schemas"]["AssistantResponse"];
export type AssistantFact = components["schemas"]["AssistantFact"];
export type AssistantAction = components["schemas"]["AssistantAction"];

const factKeys: AssistantFact["key"][] = [
  "sales",
  "sales_previous",
  "sales_change",
  "receipts",
  "outstanding",
  "debtors",
  "sales_count",
  "average_ticket",
  "today_sales",
  "today_receipts",
  "debtor",
];
const actionKinds: AssistantAction["kind"][] = [
  "open_debts",
  "new_sale",
  "open_history",
  "open_analytics",
  "reminder_draft",
];
function invalid(): never {
  throw new ApiError(0, "INVALID_RESPONSE");
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return invalid();
  return value;
}
function integer(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    return invalid();
  return value;
}
/** Check the published envelope before displaying private data or money. */
export function readAssistantResponse(
  raw: unknown,
  expected: {
    businessId: string;
    days: AssistantRequest["days"];
    locale: AssistantRequest["locale"];
  },
): AssistantResponse {
  const data = object(raw);
  if (
    readUuid(data.business_id) !== expected.businessId ||
    data.days !== expected.days ||
    data.locale !== expected.locale ||
    data.timezone !== "Asia/Almaty" ||
    data.currency !== "KZT" ||
    !["ai", "fallback"].includes(String(data.source)) ||
    typeof data.as_of !== "string" ||
    !Number.isFinite(Date.parse(data.as_of)) ||
    !Array.isArray(data.facts) ||
    !Array.isArray(data.actions) ||
    data.actions.length > 3
  )
    return invalid();
  const facts: AssistantFact[] = data.facts.map((rawFact) => {
    const fact = object(rawFact);
    if (!factKeys.includes(fact.key as AssistantFact["key"])) return invalid();
    const value_minor = integer(fact.value_minor),
      count = integer(fact.count);
    if (
      (value_minor === null) === (count === null) ||
      (count !== null && count < 0)
    )
      return invalid();
    const customer_id =
      fact.customer_id == null ? null : readUuid(fact.customer_id);
    if (
      fact.key === "debtor" &&
      (!customer_id || value_minor === null || value_minor < 0)
    )
      return invalid();
    return {
      key: fact.key as AssistantFact["key"],
      label: text(fact.label),
      value_minor,
      count,
      customer_id,
    };
  });
  const actions: AssistantAction[] = data.actions.map((rawAction) => {
    const action = object(rawAction);
    if (!actionKinds.includes(action.kind as AssistantAction["kind"]))
      return invalid();
    const customer_id =
      action.customer_id == null ? null : readUuid(action.customer_id);
    if (customer_id && !facts.some((fact) => fact.customer_id === customer_id))
      return invalid();
    const actionText = action.text == null ? null : text(action.text);
    if (action.kind === "reminder_draft" && (!customer_id || !actionText))
      return invalid();
    return {
      kind: action.kind as AssistantAction["kind"],
      customer_id,
      text: actionText,
    };
  });
  return {
    business_id: expected.businessId,
    days: expected.days,
    locale: expected.locale,
    timezone: "Asia/Almaty",
    currency: "KZT",
    as_of: data.as_of,
    answer: text(data.answer),
    facts,
    actions,
    source: data.source as AssistantResponse["source"],
  };
}

export function debtLink(customerId?: string | null) {
  return customerId
    ? `/seller/debts?customer_id=${encodeURIComponent(customerId)}`
    : "/seller/debts";
}
