/** Read-only teaching balances for the three existing demo customers. */
export const demoDebtors = [
  {
    customer_id: "33333333-3333-4333-8333-333333333333",
    name: "Асқар · павильон 12",
    nameKk: "Асқар · 12-павильон",
    value_minor: 1_800_000,
  },
  {
    customer_id: "44444444-4444-4444-8444-444444444444",
    name: "Асқар · доставка",
    nameKk: "Асқар · жеткізу",
    value_minor: 1_000_000,
  },
  {
    customer_id: "55555555-5555-4555-8555-555555555555",
    name: "Әсел",
    nameKk: "Әсел",
    value_minor: 700_000,
  },
] as const;

export const demoOutstanding = demoDebtors.reduce(
  (sum, debtor) => sum + debtor.value_minor,
  0,
);
