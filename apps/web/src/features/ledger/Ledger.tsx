// Debt/history/reversal flow adapted from PR #7. Balances are exclusively server values.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  ErrorMessage,
  PageHeader,
} from "../../shared/ui";
import { formatKZT } from "../../shared/format";
import { useLedgerList, useWrite, type Operation, type Sale } from "./data";
import { useLedgerText } from "./i18n";
export function Debts() {
  const [sp] = useSearchParams(),
    { l, locale } = useLedgerText();
  const params = new URLSearchParams({ outstanding_only: "true" });
  if (sp.get("customer_id")) params.set("customer_id", sp.get("customer_id")!);
  const q = useLedgerList<Sale>(params.toString());
  return (
    <>
      <PageHeader title={l("debts")} />
      {q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      <div className="form-stack">
        {q.data?.pages
          .flatMap((p) => p.items)
          .map((s) => (
            <Card key={s.id}>
              <h2>{s.description}</h2>
              <p>
                {l("balance")}: {formatKZT(s.balance_minor, locale)}
              </p>
              <small>{s.id}</small>
              <p>
                <Link to={`/seller/sale?sale=${s.id}`}>{l("repay")} →</Link>
              </p>
            </Card>
          ))}
      </div>
      {q.hasNextPage && (
        <Button
          disabled={q.isFetchingNextPage}
          onClick={() => void q.fetchNextPage()}
        >
          {l("more")}
        </Button>
      )}
    </>
  );
}
export function History() {
  const q = useLedgerList<Operation>(""),
    { l, locale } = useLedgerText(),
    [selected, setSelected] = useState<string | null>(null),
    write = useWrite();
  return (
    <>
      <PageHeader title={l("history")} />
      {q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      <div className="form-stack">
        {q.data?.pages
          .flatMap((p) => p.items)
          .map((o) => (
            <Card key={o.id}>
              <h2>{o.description}</h2>
              <small>
                {new Date(o.created_at).toLocaleString(locale, {
                  timeZone: "Asia/Almaty",
                })}{" "}
                · {o.kind} · {o.id}
              </small>
              <p>
                {l("sales")}: {formatKZT(o.sales_delta_minor, locale)} ·{" "}
                {l("receipts")}: {formatKZT(o.receipts_delta_minor, locale)}
              </p>
              {o.kind !== "reversal" && (
                <Button
                  variant="secondary"
                  disabled={!!write.pending || write.busy}
                  onClick={() => setSelected(o.id)}
                >
                  {l("reverse")}
                </Button>
              )}
            </Card>
          ))}
      </div>
      {q.hasNextPage && (
        <Button onClick={() => void q.fetchNextPage()}>{l("more")}</Button>
      )}
      <Dialog
        title={l("reverse")}
        open={!!selected || !!write.pending}
        onClose={() => {
          if (!write.pending && !write.busy) setSelected(null);
        }}
      >
        <p>{write.pending ? l("unknown") : l("reverseConfirm")}</p>
        {!!write.error && <ErrorMessage error={write.error} />}
        <Button
          disabled={write.busy}
          onClick={() =>
            void write.write(undefined, selected ?? undefined).then((ok) => {
              if (ok) setSelected(null);
            })
          }
        >
          {l(write.pending ? "retry" : "confirm")}
        </Button>
      </Dialog>
    </>
  );
}
