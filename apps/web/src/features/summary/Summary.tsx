// Stats/date flow adapted from PR #7, using the shared identity-scoped client.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBusiness, useRuntime } from "../../app/runtime";
import { formatKZT } from "../../shared/format";
import { Card, ErrorState, Input, PageHeader } from "../../shared/ui";
import { money, record } from "../ledger/data";
import { useLedgerText } from "../ledger/i18n";
export const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
/** Server day summary; outstanding is the all-time debt, never a client-side sum. */
export function useSummary(date = localDate()) {
  const { api, scope, gateway } = useRuntime(),
    { business } = useBusiness();
  return useQuery({
    queryKey: [scope, business.id, "summary", date],
    enabled: gateway.mode === "live" && !!date,
    queryFn: async ({ signal }) => {
      const r = record(
        await api.request(`/businesses/${business.id}/summary?date=${date}`, {
          signal,
        }),
      );
      return {
        sales: money(r.sales_minor),
        receipts: money(r.receipts_minor),
        balance: money(r.outstanding_minor),
        inquiries: money(r.new_inquiries_count),
      };
    },
  });
}
export function Stats({ date = localDate() }: { date?: string }) {
  const { l, locale } = useLedgerText(),
    q = useSummary(date);
  return (
    <>
      {q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      <div className="ledger-stats">
        {q.data &&
          (["sales", "receipts", "balance", "inquiries"] as const).map((k) => (
            <Card key={k}>
              <p>{l(k)}</p>
              <strong>
                {k === "inquiries" ? q.data[k] : formatKZT(q.data[k], locale)}
              </strong>
            </Card>
          ))}
      </div>
    </>
  );
}
export function Summary() {
  const [date, setDate] = useState(localDate()),
    { l } = useLedgerText();
  return (
    <>
      <PageHeader title={l("summary")} />
      <Input
        type="date"
        label={l("day")}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Stats date={date} />
      <p>{l("note")}</p>
    </>
  );
}
