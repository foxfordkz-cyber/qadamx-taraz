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
export function Stats({ date = localDate() }: { date?: string }) {
  const { api, scope, gateway } = useRuntime(),
    { business } = useBusiness(),
    { l, locale } = useLedgerText();
  const q = useQuery({
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
