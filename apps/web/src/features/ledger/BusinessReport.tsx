import { useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness, useRuntime } from "../../app/runtime";
import {
  Button,
  Card,
  ErrorState,
  Input,
  Select,
  Spinner,
} from "../../shared/ui";
import type { Customer } from "../../shared/api/models";
import { formatKZT } from "../../shared/format";
import { localDate } from "../summary/Summary";
import { operationTime } from "./i18n";
import { useLedgerList, type Operation } from "./data";
import {
  reportCsv,
  useBusinessReport,
  validDateRange,
  type BusinessReport as Report,
} from "./reportData";
import { useBusinessText } from "./businessText";
import "./business.css";

function ReportValues({ data }: { data: Report }) {
  const { b, locale } = useBusinessText();
  return (
    <div className="ledger-stats business-values">
      {(
        [
          ["sale", data.sales_minor],
          ["receipts", data.receipts_minor],
          ["debt", data.outstanding_minor],
          ["opening", data.opening_balance_minor],
          ["closing", data.closing_balance_minor],
        ] as const
      )
        .filter(([, value]) => value !== null)
        .map(([key, value]) => (
          <Card key={key}>
            <p>{b(key)}</p>
            <strong>{formatKZT(value!, locale)}</strong>
          </Card>
        ))}
    </div>
  );
}

export function PeriodReport() {
  const { b, locale } = useBusinessText();
  const { gateway } = useRuntime();
  const { business } = useBusiness();
  const today = localDate();
  const [from, setFrom] = useState(
    new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(today);
  const [range, setRange] = useState({ from, to });
  const [invalid, setInvalid] = useState(false);
  const q = useBusinessReport(null, range.from, range.to);
  const ready =
    q.isSuccess && !q.isFetching && from === range.from && to === range.to;
  if (gateway.mode !== "live") return <p>{b("demo")}</p>;
  return (
    <section className="business-report" aria-label={b("report")}>
      <form
        className="business-filter-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const valid = validDateRange(from, to);
          setInvalid(!valid);
          if (valid) setRange({ from, to });
        }}
      >
        <Input
          type="date"
          label={b("from")}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          label={b("to")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button type="submit">{b("apply")}</Button>
      </form>
      {invalid && <p role="alert">{b("badFilters")}</p>}
      {q.isFetching && <Spinner />}
      {q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      {ready && (
        <div className="business-print-sheet">
          <h2>
            {b("report")} · {business.name}
          </h2>
          <p>
            {range.from} — {range.to} · Asia/Almaty · KZT
          </p>
          <p>
            {b("asOf")}: {operationTime(q.data.as_of)}
          </p>
          <ReportValues data={q.data} />
          <p>
            {b("count")}: {q.data.operation_count}
          </p>
          <p>{b("reportHint")}</p>
          <h3>{b("age")}</h3>
          <ul>
            {q.data.debt_aging.map((row) => (
              <li key={row.bucket}>
                {b(row.bucket)}: {formatKZT(row.balance_minor, locale)} (
                {row.sales_count})
              </li>
            ))}
          </ul>
          <p>{b("ageHint")}</p>
        </div>
      )}
      <div className="actions">
        <Button
          disabled={!ready}
          onClick={() => {
            if (!ready) return;
            const url = URL.createObjectURL(
              new Blob([reportCsv(q.data, business.name, locale)], {
                type: "text/csv;charset=utf-8",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `qadam-report-${range.from}-${range.to}.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          {b("export")}
        </Button>
        <Button
          variant="secondary"
          disabled={!ready}
          onClick={() => {
            if (!ready) return;
            document.body.classList.add("qadam-print-report");
            try {
              window.print();
            } finally {
              document.body.classList.remove("qadam-print-report");
            }
          }}
        >
          {b("print")}
        </Button>
      </div>
    </section>
  );
}

export function CustomerProfile({ customer }: { customer: Customer }) {
  const { b, locale } = useBusinessText();
  const { gateway } = useRuntime();
  const [kind, setKind] = useState("");
  const q = useBusinessReport(customer.id);
  const history = useLedgerList<Operation>(
    new URLSearchParams({
      customer_id: customer.id,
      ...(kind ? { kind } : {}),
    }).toString(),
  );
  if (gateway.mode !== "live") return <p>{b("demo")}</p>;
  return (
    <section aria-label={b("profile")} className="business-profile">
      <h2>{customer.display_name}</h2>
      <p>{b("lifetime")}</p>
      {q.isFetching && <Spinner />}
      {q.isError && (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      )}
      {q.isSuccess && !q.isFetching && (
        <>
          <ReportValues data={q.data} />
          <p>
            {b("last")}:{" "}
            {q.data.last_operation
              ? `${operationTime(q.data.last_operation.created_at)} · ${b(q.data.last_operation.kind)} · ${q.data.last_operation.description}`
              : b("empty")}
          </p>
        </>
      )}
      <h3>{b("history")}</h3>
      <Select
        label={b("kind")}
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        <option value="">{b("all")}</option>
        {(["sale", "repayment", "reversal"] as const).map((key) => (
          <option key={key} value={key}>
            {b(key)}
          </option>
        ))}
      </Select>
      {history.isFetching && !history.isFetchingNextPage && <Spinner />}
      {history.isError && (
        <ErrorState
          error={history.error}
          retry={() => void history.refetch()}
        />
      )}
      {!history.isError &&
        history.data?.pages.map((page, i) => (
          <ul key={i}>
            {page.items.map((op) => (
              <li key={op.id}>
                <strong>{b(op.kind)}</strong> · {operationTime(op.created_at)} ·{" "}
                {op.description}
                <p>
                  {b("sale")}: {formatKZT(op.sales_delta_minor, locale)} ·{" "}
                  {b("receipts")}: {formatKZT(op.receipts_delta_minor, locale)}
                </p>
              </li>
            ))}
          </ul>
        ))}
      {history.isSuccess &&
        history.data.pages.every((page) => page.items.length === 0) && (
          <p>{b("empty")}</p>
        )}
      {history.hasNextPage && (
        <Button
          disabled={history.isFetching}
          onClick={() => void history.fetchNextPage()}
        >
          {b("more")}
        </Button>
      )}
      <Link
        className="button button-secondary"
        to={`/seller/debts?customer_id=${customer.id}`}
      >
        {b("debt")}
      </Link>
    </section>
  );
}

export function CopyReminder({ text }: { text: string }) {
  const { b } = useBusinessText();
  const [status, setStatus] = useState<"idle" | "copied" | "copyFailed">(
    "idle",
  );
  return (
    <div className="business-copy">
      <Button
        variant="secondary"
        onClick={() => {
          void (async () => {
            try {
              await navigator.clipboard.writeText(text);
              setStatus("copied");
            } catch {
              setStatus("copyFailed");
            }
          })();
        }}
      >
        {b("copy")}
      </Button>
      {status !== "idle" && <p role="status">{b(status)}</p>}
      {status === "copyFailed" && (
        <label className="field">
          {b("reminder")}
          <textarea readOnly value={text} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </div>
  );
}
