// Debt/history/reversal flow adapted from PR #7. Balances are exclusively server values.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRuntime } from "../../app/runtime";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  ErrorMessage,
  PageHeader,
  Spinner,
} from "../../shared/ui";
import { useCustomers } from "../seller/queries";
import { useSummary } from "../summary/Summary";
import { formatKZT } from "../../shared/format";
import { useLedgerList, useWrite, type Operation, type Sale } from "./data";
import { operationTime, saleDate, useLedgerText } from "./i18n";
import "./ledger.css";
export function Debts() {
  const [sp] = useSearchParams(),
    { l, locale } = useLedgerText(),
    { gateway } = useRuntime();
  const customerId = sp.get("customer_id");
  const params = new URLSearchParams({ outstanding_only: "true" });
  if (customerId) params.set("customer_id", customerId);
  const q = useLedgerList<Sale>(params.toString());
  // Names only decorate rows; the debt list never waits for or depends on them.
  const customers = useCustomers("");
  const known = new Map(
    customers.data?.pages.flatMap((p) => p.items).map((c) => [c.id, c]) ?? [],
  );
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  // Totals come from the server: the day summary, or the customer's own balance.
  const summary = useSummary();
  const filtered = customerId ? known.get(customerId) : undefined;
  const total = customerId ? filtered?.balance_minor : summary.data?.balance;
  return (
    <>
      <PageHeader
        title={l("debts")}
        subtitle={customerId ? l("customerDebts") : l("debtsHint")}
        action={
          customerId && (
            <Link className="button button-ghost" to="/seller/debts">
              {l("allDebts")}
            </Link>
          )
        }
      />
      {gateway.mode === "demo" && <p>{l("demo")}</p>}
      {total !== undefined && (
        <p className="debt-total">
          <span>
            {customerId
              ? `${l("customerTotal")} · ${filtered?.display_name ?? ""}`
              : l("debtsTotal")}
          </span>
          <strong>{formatKZT(total, locale)}</strong>
        </p>
      )}
      {q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      {q.isLoading && <Spinner />}
      {q.isSuccess && rows.length === 0 && (
        <EmptyState title={l("noDebts")} description={l("noDebtsHint")} />
      )}
      <ul className="debt-list">
        {rows.map((s) => (
          <li key={s.id}>
            <Card className="debt-row">
              <div className="debt-main">
                <h2>
                  {s.customer_id
                    ? (known.get(s.customer_id)?.display_name ?? l("customer"))
                    : l("noCustomer")}
                </h2>
                <p>
                  {s.description} · {saleDate(s.created_at)} · {l("soldFor")}{" "}
                  <span className="money">
                    {formatKZT(s.total_minor, locale)}
                  </span>
                </p>
              </div>
              <div className="debt-side">
                <p className="debt-balance">
                  <span>{l("left")}:</span>{" "}
                  <strong>{formatKZT(s.balance_minor, locale)}</strong>
                </p>
                <Link
                  className="button button-secondary"
                  to={`/seller/sale?sale=${s.id}`}
                >
                  {l("payDebt")}
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {q.hasNextPage && (
        <Button
          variant="secondary"
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
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  // Names only decorate rows, as on "Мне должны".
  const customers = useCustomers("");
  const names = new Map(
    customers.data?.pages
      .flatMap((p) => p.items)
      .map((c) => [c.id, c.display_name]) ?? [],
  );
  const kindLabel = {
    sale: l("sell"),
    repayment: l("repay"),
    reversal: l("reversalKind"),
  } as const;
  const kindTone = {
    sale: "neutral",
    repayment: "green",
    reversal: "red",
  } as const;
  return (
    <>
      <PageHeader title={l("history")} />
      {q.isError && !q.isFetchNextPageError && (
        <ErrorState
          error={q.error}
          retry={() => void q.refetch({ cancelRefetch: false })}
        />
      )}
      {q.isFetching && !q.isFetchingNextPage && rows.length === 0 && (
        <Spinner />
      )}
      {q.isSuccess && !q.isFetching && rows.length === 0 && (
        <EmptyState title={l("empty")} description={l("historyEmptyHint")} />
      )}
      <div className="history-list">
        {rows.map((o) => (
          <Card key={o.id} className="history-row">
            <div className="history-main">
              <h2>{o.description}</h2>
              <p>
                <Badge tone={kindTone[o.kind]}>{kindLabel[o.kind]}</Badge>
                <span>{operationTime(o.created_at)}</span>
                {o.customer_id && names.get(o.customer_id) && (
                  <span>{names.get(o.customer_id)}</span>
                )}
              </p>
            </div>
            <p className="history-amounts">
              <span>
                {l("sales")}{" "}
                <strong>{formatKZT(o.sales_delta_minor, locale)}</strong>
              </span>
              <span>
                {l("receipts")}{" "}
                <strong>{formatKZT(o.receipts_delta_minor, locale)}</strong>
              </span>
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
      {q.isFetchNextPageError && (
        <div role="alert" className="error-state">
          <h2>{l("historyNextError")}</h2>
          <p>
            <ErrorMessage error={q.error} />
          </p>
          <Button
            variant="secondary"
            disabled={q.isFetching}
            onClick={() => void q.fetchNextPage({ cancelRefetch: false })}
          >
            {l("loadRetry")}
          </Button>
        </div>
      )}
      {q.isFetchingNextPage && <p role="status">{l("loadingMore")}</p>}
      {q.hasNextPage && !q.isFetchNextPageError && (
        <Button
          variant="secondary"
          disabled={q.isFetching}
          onClick={() => void q.fetchNextPage({ cancelRefetch: false })}
        >
          {l(q.isFetchingNextPage ? "loadingMore" : "more")}
        </Button>
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
