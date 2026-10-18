// Stats/date flow adapted from PR #7, using the shared identity-scoped client.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBusiness, useRuntime } from "../../app/runtime";
import { formatKZT } from "../../shared/format";
import {
  Alert,
  Card,
  ErrorState,
  Input,
  PageHeader,
  Spinner,
} from "../../shared/ui";
import { money, record } from "../ledger/data";
import { useLedgerText } from "../ledger/i18n";
import { ShareSummary } from "./ShareSummary";
import { shareLabels, summaryShareText, type SummaryValues } from "./share";
import { demoSummary, demoSummaryDate } from "./demo";
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
  const q = useSummary(date);
  return (
    <>
      {q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      <SummaryStats data={q.data} />
    </>
  );
}
function SummaryStats({ data }: { data?: SummaryValues }) {
  const { l, locale } = useLedgerText();
  return (
    <div className="ledger-stats">
      {data &&
        (["sales", "receipts", "balance", "inquiries"] as const).map((k) => (
          <Card key={k}>
            <p>{l(k)}</p>
            <strong>
              {k === "inquiries" ? data[k] : formatKZT(data[k], locale)}
            </strong>
          </Card>
        ))}
    </div>
  );
}
export function Summary() {
  const { scope, gateway } = useRuntime();
  const { business } = useBusiness();
  return <SummaryPage key={`${scope}:${business.id}:${gateway.mode}`} />;
}
function SummaryPage() {
  const { gateway } = useRuntime();
  const demo = gateway.mode === "demo";
  const [date, setDate] = useState(demo ? demoSummaryDate : localDate()),
    { l, locale } = useLedgerText();
  const { business } = useBusiness();
  const q = useSummary(date);
  const data = demo ? demoSummary : q.data;
  const ready = !!date && (demo || (q.isSuccess && !q.isFetching));
  const text =
    ready && data
      ? summaryShareText({
          date,
          businessName: business.name,
          locale,
          summary: data,
        })
      : null;
  return (
    <>
      <PageHeader title={l("summary")} />
      {demo && <Alert>{shareLabels[locale].demo}</Alert>}
      <Input
        type="date"
        label={l("day")}
        value={date}
        disabled={demo}
        onChange={(e) => setDate(e.target.value)}
      />
      {gateway.mode === "live" && !!date && q.isPending && <Spinner />}
      {!demo && q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      <SummaryStats data={data} />
      <p>{l("note")}</p>
      <ShareSummary
        key={`${date}:${locale}:${text}`}
        text={text}
        locale={locale}
      />
    </>
  );
}
