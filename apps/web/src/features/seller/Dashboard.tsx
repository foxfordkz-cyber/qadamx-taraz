import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness, useRuntime } from "../../app/runtime";
import { LanguageSwitch, useI18n } from "../../shared/i18n";
import { formatKZT } from "../../shared/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Spinner,
} from "../../shared/ui";
import { Icon } from "../../shared/ui/Icon";
import {
  AssistantCard,
  AssistantProvider,
  assistantEnabled,
} from "../assistant";
import { useAssistant } from "../assistant/state";
import { useLedgerList, type Sale } from "../ledger/data";
import { useLedgerCustomers } from "../ledger/customers";
import { saleDate, useLedgerText } from "../ledger/i18n";
import { useSummary } from "../summary/Summary";
import "./dashboard.css";

/** Keep the original assistant transport and scope/abort guarantees in one provider. */
function CabinetAssistant({
  onUnavailable,
}: {
  onUnavailable: (value: boolean) => void;
}) {
  const { available } = useAssistant();
  const { t } = useI18n();
  useEffect(() => {
    if (!available) onUnavailable(true);
  }, [available, onUnavailable]);
  return available ? (
    <AssistantCard />
  ) : (
    <Alert>{t("dashboardAssistantUnavailable")}</Alert>
  );
}

export function DashboardPage() {
  const { scope } = useRuntime();
  const { business } = useBusiness();
  return <Dashboard key={`${scope}:${business.id}`} />;
}

function Dashboard() {
  const { t, locale } = useI18n();
  const { l } = useLedgerText();
  const { business } = useBusiness();
  const { gateway } = useRuntime();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantUnavailable, setAssistantUnavailable] = useState(false);
  const voiceEntry = useRef<HTMLAnchorElement>(null);
  function closeAssistant() {
    setAssistantOpen(false);
    if (assistantUnavailable)
      requestAnimationFrame(() => voiceEntry.current?.focus());
  }
  const summary = useSummary();
  const debts = useLedgerList<Sale>("outstanding_only=true");
  // Preserve server order: this is a preview of open sales, not a ranking of customers.
  const rows = (debts.data?.pages.flatMap((page) => page.items) ?? []).slice(
    0,
    3,
  );
  const names = useLedgerCustomers(rows.map((row) => row.customer_id));
  const demo = gateway.mode === "demo";
  const enabled = assistantEnabled();
  return (
    <div className="cabinet-home">
      <header className="cabinet-home-heading">
        <div>
          <p className="eyebrow">QADAM BUSINESS</p>
          <h1>{t("dashboardTitle")}</h1>
          <p className="muted">{business.name}</p>
        </div>
        {business.is_demo && <Badge>{t("demo")}</Badge>}
      </header>

      <section className="cabinet-start" aria-label={t("quickActions")}>
        <Link
          ref={voiceEntry}
          className="cabinet-start-action cabinet-speak"
          to="/seller/sale?entry=voice"
        >
          <span className="cabinet-start-icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
            </svg>
          </span>
          <span>
            <strong>{t("dashboardSpeak")}</strong>
            <small>{t("dashboardSpeakHint")}</small>
          </span>
          <Icon name="arrow" />
        </Link>
        {enabled && !assistantUnavailable && (
          <button
            type="button"
            className="cabinet-start-action cabinet-ask"
            aria-haspopup="dialog"
            onClick={() => setAssistantOpen(true)}
          >
            <span className="cabinet-start-icon" aria-hidden="true">
              ✦
            </span>
            <span>
              <strong>{t("assistantTitle")}</strong>
              <small>{t("dashboardAskHint")}</small>
            </span>
            <Icon name="arrow" />
          </button>
        )}
      </section>

      <section
        className="cabinet-section"
        aria-labelledby="cabinet-today-title"
      >
        <div className="cabinet-section-heading">
          <h2 id="cabinet-today-title">{t("dashboardToday")}</h2>
          <Link to="/seller/summary">
            {t("summary")} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="muted cabinet-period">{t("dashboardPeriod")}</p>
        {demo ? (
          <Alert>{t("dashboardDemoStats")}</Alert>
        ) : summary.isError ? (
          <ErrorState
            error={summary.error}
            retry={() => void summary.refetch()}
          />
        ) : summary.isPending ? (
          <Spinner />
        ) : null}
        {(demo || (summary.data && !summary.isError)) && (
          <dl className="cabinet-metrics">
            {(["sales", "receipts", "balance"] as const).map((key) => (
              <div key={key}>
                <dt>
                  {t(
                    key === "sales"
                      ? "dashboardSales"
                      : key === "receipts"
                        ? "dashboardReceipts"
                        : "dashboardBalance",
                  )}
                </dt>
                <dd>{demo ? "—" : formatKZT(summary.data![key], locale)}</dd>
                <small>
                  {t(
                    key === "balance"
                      ? "dashboardAllDates"
                      : "dashboardForToday",
                  )}
                </small>
              </div>
            ))}
          </dl>
        )}
      </section>

      <Card className="cabinet-debts" aria-labelledby="cabinet-debts-title">
        <div className="cabinet-section-heading">
          <h2 id="cabinet-debts-title">{t("debts")}</h2>
          <Link to="/seller/debts">
            {t("dashboardAllDebts")} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="muted cabinet-period">{t("dashboardDebtsHint")}</p>
        {demo ? (
          <p className="muted">{t("dashboardDemoDebts")}</p>
        ) : debts.isError ? (
          <ErrorState error={debts.error} retry={() => void debts.refetch()} />
        ) : debts.isPending ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title={l("noDebts")} description={l("noDebtsHint")} />
        ) : (
          <ul className="cabinet-debt-preview">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to={
                    row.customer_id
                      ? `/seller/debts?customer_id=${encodeURIComponent(row.customer_id)}`
                      : "/seller/debts"
                  }
                >
                  <span className="cabinet-debt-person">
                    <strong>
                      {row.customer_id
                        ? (names.get(row.customer_id.toLowerCase())
                            ?.display_name ?? l("customerUnavailable"))
                        : l("noCustomer")}
                    </strong>
                    <small>
                      {row.description} · {saleDate(row.created_at)}
                    </small>
                  </span>
                  <span className="cabinet-debt-amount">
                    <small>{t("remaining")}</small>
                    <strong>{formatKZT(row.balance_minor, locale)}</strong>
                  </span>
                  <Icon name="arrow" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {enabled && (
        <Dialog
          title={t("assistantTitle")}
          className="cabinet-assistant-panel"
          open={assistantOpen}
          onClose={closeAssistant}
        >
          <div className="cabinet-assistant-context">
            <span>{business.name}</span>
            <LanguageSwitch />
          </div>
          {assistantUnavailable ? (
            <Alert>{t("dashboardAssistantUnavailable")}</Alert>
          ) : (
            <AssistantProvider days={7}>
              <CabinetAssistant onUnavailable={setAssistantUnavailable} />
            </AssistantProvider>
          )}
          <p className="cabinet-assistant-note">
            {t("dashboardAssistantNote")}
          </p>
          <Button variant="secondary" onClick={closeAssistant}>
            {t("close")}
          </Button>
        </Dialog>
      )}
    </div>
  );
}
