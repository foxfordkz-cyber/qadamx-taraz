import examples from "../../../../../packages/contracts/examples.json";
import type { SummaryValues } from "./share";

// Approved teaching example, pinned to its original date; never replaces live errors.
const example = examples.SummaryResponse;
export const demoSummaryDate = example.date;
export const demoSummary: SummaryValues = {
  sales: example.sales_minor,
  receipts: example.receipts_minor,
  balance: example.outstanding_minor,
  inquiries: example.new_inquiries_count,
};
