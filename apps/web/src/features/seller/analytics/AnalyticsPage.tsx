import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../../../app/runtime";
import { ApiError } from "../../../shared/api/client";
import { formatKZT } from "../../../shared/format";
import { useI18n } from "../../../shared/i18n";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Select,
  Spinner,
} from "../../../shared/ui";
import { DailyChart, DailyTable, HourlyChart, analyticsDate } from "./Charts";
import { AssistantProvider, AssistantPanel } from "../../assistant";
import { useAssistant } from "../../assistant/state";
import type { AnalyticsDays, AnalyticsSnapshot, DemoScenario } from "./model";
import { useAnalytics } from "./queries";
import "./analytics.css";

function Metric({
  title,
  value,
  detail,
  hint,
}: {
  title: string;
  value: string;
  detail?: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <Card className="analytics-kpi" aria-labelledby={id} title={hint}>
      <h3 id={id}>{title}</h3>
      <strong className="analytics-kpi-value">{value}</strong>
      {detail && <div className="analytics-kpi-detail">{detail}</div>}
    </Card>
  );
}

function AnalyticsReport({
  snapshot,
  demo,
}: {
  snapshot: AnalyticsSnapshot;
  demo: boolean;
}) {
  const state = useAssistant();
  const { t, locale } = useI18n();
  const [panel, setPanel] = useState<{ question?: string } | null>(null);
  const summaryId = useId(),
    debtorsId = useId();
  const result = state.available ? state.response : undefined;
  const change = result?.facts.find(
    (fact) => fact.key === "sales_change",
  )?.value_minor;
  const debtors =
    result?.facts.filter((fact) => fact.key === "debtor").slice(0, 5) ?? [];
  const limited = state.error instanceof ApiError && state.error.status === 429;
  return (
    <>
      <div className="analytics-kpis analytics-main-kpis">
        <Metric
          title={t("analyticsSalesShort")}
          value={formatKZT(snapshot.cards.sales_minor, locale)}
          detail={
            change != null && (
              <span
                className={
                  change > 0
                    ? "analytics-change-positive"
                    : "analytics-change-neutral"
                }
              >
                {t("analyticsSalesChange")
                  .replace(
                    "{amount}",
                    `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatKZT(Math.abs(change), locale)}`,
                  )
                  .replace("{days}", String(snapshot.days))}
              </span>
            )
          }
        />
        <Metric
          title={t("analyticsReceipts")}
          value={formatKZT(snapshot.cards.receipts_minor, locale)}
          hint={t("analyticsReceiptsHint")}
        />
        <Metric
          title={t("analyticsCurrentDebt")}
          value={formatKZT(snapshot.cards.outstanding_minor, locale)}
          hint={t("analyticsDebtHint")}
        />
      </div>
      {state.available && (
        <div className="analytics-insights">
          <Card
            className="analytics-period-summary"
            aria-labelledby={summaryId}
          >
            <h2 id={summaryId}>{t("analyticsPeriodSummary")}</h2>
            {result && (
              <>
                <p className="analytics-period-answer" aria-live="polite">
                  {result.answer}
                </p>
                <p className="assistant-source">
                  {t(
                    demo
                      ? "assistantDemo"
                      : result.source === "ai"
                        ? "analyticsSourceAI"
                        : result.source === "facts"
                          ? "assistantSourceFacts"
                          : "assistantSourceFallback",
                  )}
                </p>
              </>
            )}
            {state.pending && (
              <p role="status" className="muted">
                {t("loading")}
              </p>
            )}
            {limited ? (
              <Alert tone="error">{t("assistantLimit")}</Alert>
            ) : state.error ? (
              <ErrorState
                error={state.error}
                retry={() => void state.retry()}
              />
            ) : null}
            <div className="analytics-summary-actions">
              <Button
                variant="secondary"
                disabled={state.pending || limited}
                onClick={() =>
                  void state.ask(t("assistantSummaryQuestion"), true)
                }
              >
                {t("analyticsExplainAI")}
              </Button>
              <Button variant="ghost" onClick={() => setPanel({})}>
                {t("analyticsAskQadam")}
              </Button>
            </div>
          </Card>
          <Card className="analytics-reminders" aria-labelledby={debtorsId}>
            <h2 id={debtorsId}>{t("assistantWhoToRemind")}</h2>
            {result ? (
              debtors.length ? (
                <ul>
                  {debtors.map((fact) => (
                    <li key={fact.customer_id}>
                      <div>
                        <span>{fact.label}</span>
                        <strong>{formatKZT(fact.value_minor!, locale)}</strong>
                      </div>
                      <Button
                        variant="ghost"
                        aria-label={`${t("analyticsReminder")}: ${fact.label}`}
                        onClick={() =>
                          setPanel({
                            question: `${t("assistantSuggestReminder")} ${fact.label}`,
                          })
                        }
                      >
                        {t("analyticsReminder")}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t("assistantNoDebtors")}</p>
              )
            ) : (
              <p className="muted">
                {t(state.pending ? "loading" : "assistantDebtorsOpen")}
              </p>
            )}
            <Link className="analytics-all-debts" to="/seller/debts">
              {t("analyticsAllDebts")} →
            </Link>
          </Card>
        </div>
      )}
      {snapshot.cards.sales_count === 0 &&
        snapshot.cards.receipts_minor === 0 && (
          <Card className="analytics-empty">
            <EmptyState
              title={t("analyticsNoActivity")}
              description={t("analyticsNoActivityHint")}
              action={
                <Link className="button button-secondary" to="/seller/sale">
                  {t("analyticsNewSale")}
                </Link>
              }
            />
          </Card>
        )}
      <DailyChart snapshot={snapshot} />
      <details className="analytics-details">
        <summary>{t("analyticsDetails")}</summary>
        <div className="analytics-details-content">
          <HourlyChart snapshot={snapshot} />
          <div className="analytics-kpis">
            <Metric
              title={t("analyticsAverage")}
              value={
                snapshot.cards.average_ticket_minor === null
                  ? t("analyticsNoSales")
                  : formatKZT(snapshot.cards.average_ticket_minor, locale)
              }
            />
            <Metric
              title={t("analyticsCount")}
              value={String(snapshot.cards.sales_count)}
            />
            <Metric
              title={t("analyticsDebtorsCount")}
              value={String(snapshot.cards.debtors_count)}
            />
          </div>
          <DailyTable snapshot={snapshot} />
        </div>
      </details>
      {panel && state.available && (
        <AssistantPanel
          days={snapshot.days}
          demoSnapshot={demo ? snapshot : undefined}
          initialQuestion={panel.question}
          onClose={() => setPanel(null)}
          onUnavailable={state.disable}
        />
      )}
    </>
  );
}

export function AnalyticsPage() {
  const { business } = useBusiness();
  const { t, locale } = useI18n();
  const [days, setDays] = useState<AnalyticsDays>(7);
  const [scenario, setScenario] = useState<DemoScenario>("activity");
  const query = useAnalytics(days, scenario);
  const snapshot = query.mode === "waiting" ? undefined : query.data;
  const from = snapshot?.period_from,
    to = snapshot?.period_to;
  const period =
    snapshot && from && to
      ? `${from.slice(0, 7) === to.slice(0, 7) ? Number(from.slice(8)) : analyticsDate(from, locale, snapshot.timezone)}–${analyticsDate(to, locale, snapshot.timezone)}`
      : "";
  return (
    <section className="analytics-page" aria-label={t("analytics")}>
      <header className="analytics-heading">
        <div>
          <h1>{t("analytics")}</h1>
          {period && <p className="analytics-period-label">{period}</p>}
        </div>
        <div
          className="analytics-period-switch"
          role="group"
          aria-label={t("analyticsPeriod")}
        >
          <Button
            variant="ghost"
            aria-pressed={days === 7}
            onClick={() => setDays(7)}
          >
            {t("analytics7Days")}
          </Button>
          <Button
            variant="ghost"
            aria-pressed={days === 30}
            onClick={() => setDays(30)}
          >
            {t("analytics30Days")}
          </Button>
        </div>
      </header>
      {query.mode === "demo" && <Badge>{t("analyticsDemoData")}</Badge>}
      {query.mode === "waiting" ? (
        <Card>
          <EmptyState
            title={t("analyticsWaitingTitle")}
            description={
              query.unavailableReason === "auth-required"
                ? t("unauthorized")
                : t("analyticsWaitingHint")
            }
          />
        </Card>
      ) : query.isPending ? (
        <div className="analytics-loading">
          <Spinner />
        </div>
      ) : query.isError ? (
        <Card className="analytics-error">
          {query.mode === "demo" ? (
            <>
              <Alert tone="error">
                <h2>{t("errorTitle")}</h2>
                <p>{t("analyticsDemoErrorHint")}</p>
              </Alert>
              <Button variant="secondary" onClick={() => void query.refetch()}>
                {t("retry")}
              </Button>
            </>
          ) : (
            <ErrorState
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
        </Card>
      ) : (
        snapshot && (
          <AssistantProvider
            days={days}
            autoSummary
            demoSnapshot={query.mode === "demo" ? snapshot : undefined}
            key={`${business.id}:${days}:${scenario}`}
          >
            <AnalyticsReport snapshot={snapshot} demo={query.mode === "demo"} />
          </AssistantProvider>
        )
      )}
      {query.mode === "demo" && (
        <details className="analytics-demo-controls">
          <summary>{t("analyticsScenario")}</summary>
          <Select
            label={t("analyticsScenario")}
            value={scenario}
            onChange={(event) =>
              setScenario(event.target.value as DemoScenario)
            }
          >
            <option value="activity">{t("analyticsActivity")}</option>
            <option value="empty">{t("analyticsEmptyScenario")}</option>
            <option value="error">{t("analyticsErrorScenario")}</option>
            <option value="reversal">{t("analyticsReversalScenario")}</option>
          </Select>
        </details>
      )}
    </section>
  );
}
