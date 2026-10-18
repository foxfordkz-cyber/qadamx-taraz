import { demoDebtors } from "../../shared/demo/debts";
import type { Sale } from "./data";

/** Read-only teaching rows; never a substitute for an API error or a live point. */
export function demoOpenSales(businessId: string): Sale[] {
  if (businessId !== "11111111-1111-4111-8111-111111111111") return [];
  return demoDebtors.map((debtor, index) => ({
    id: `demo-reminder-sale-${index + 1}`,
    customer_id: debtor.customer_id,
    description: `Демо · ${index + 1}`,
    total_minor: debtor.value_minor,
    received_minor: 0,
    balance_minor: debtor.value_minor,
    created_at: "2026-10-16T09:00:00Z",
  }));
}
