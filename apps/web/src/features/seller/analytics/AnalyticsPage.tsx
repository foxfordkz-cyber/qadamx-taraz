import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "../../../app/runtime";
import { formatKZT } from "../../../shared/format";
import { useI18n } from "../../../shared/i18n";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
} from "../../../shared/ui";
import { Icon, type IconName } from "../../../shared/ui/Icon";
import { DailyChart, HourlyChart, analyticsDate } from "./Charts";
import type { AnalyticsDays, DemoScenario } from "./model";
import { useAnalytics } from "./queries";
import "./analytics.css";

function Metric({
  title,
  value,
  scope,
  hint,
  icon,
  primary = false,
  textValue = false,
}: {
  title: string;
  value: string;
  scope: string;
  hint: string;
  icon: IconName;
  primary?: boolean;
  textValue?: boolean;
}) {
  const headingId = useId();
  return (
    <Card
      className={`analytics-kpi ${primary ? "analytics-kpi-primary" : ""}`}
      aria-labelledby={headingId}
    >
      <div className="analytics-kpi-top">
        <span className="analytics-kpi-icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
        <span className="analytics-kpi-scope">{scope}</span>
      </div>
      <h2 id={headingId}>{title}</h2>
      <strong
        className={`analytics-kpi-value ${textValue ? "analytics-kpi-text" : ""}`}
      >
        {value}
      </strong>
      <p>{hint}</p>
    </Card>
  );
}

export function AnalyticsPage() {
  const { business } = useBusiness();
  const { t, locale } = useI18n();
  const [days, setDays] = useState<AnalyticsDays>(7);
  const [scenario, setScenario] = useState<DemoScenario>("activity");
  const query = useAnalytics(days, scenario);
  const snapshot = query.mode === "waiting" ? undefined : query.data;
  const periodScope = t("analyticsPeriodScope");
  const currentScope = t("analyticsCurrentScope");
  const summaryId = useId();
  const asOf = snapshot
    ? new Intl.DateTimeFormat("ru-KZ", {
        timeZone: snapshot.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(snapshot.as_of))
    : null;
  return (
    <section className="analytics-page" aria-label={t("analyticsTitle")}>
      <PageHeader
        title={t("analyticsTitle")}
        subtitle={t("analyticsSubtitle")}
      />
      <div className="analytics-report-toolbar">
        <div className="analytics-business">
          <span className="analytics-business-icon">
            <Icon name="shop" />
          </span>
          <div>
            <span className="analytics-eyebrow">{t("business")}</span>
            <strong>{business.name}</strong>
          </div>
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
      </div>
      {query.mode === "demo" && (
        <div className="analytics-demo-panel">
          <Alert>
            <strong>{t("analyticsDemoTitle")}</strong>
            <p>{t("analyticsDemoHint")}</p>
            <p>{t("analyticsDemoClock")}</p>
          </Alert>
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
        </div>
      )}
      {query.mode === "waiting" ? (
        <Card className="analytics-waiting">
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
              <div className="actions">
                <Button
                  variant="secondary"
                  onClick={() => void query.refetch()}
                >
                  {t("retry")}
                </Button>
              </div>
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
          <>
            <div className="analytics-snapshot-meta">
              <div>
                <strong>
                  <time dateTime={snapshot.period_from}>
                    {analyticsDate(
                      snapshot.period_from,
                      locale,
                      snapshot.timezone,
                    )}
                  </time>{" "}
                  —{" "}
                  <time dateTime={snapshot.period_to}>
                    {analyticsDate(
                      snapshot.period_to,
                      locale,
                      snapshot.timezone,
                    )}
                  </time>
                </strong>
                <span>
                  {t("analyticsAsOf")}:{" "}
                  <time dateTime={snapshot.as_of}>{asOf}</time> ·{" "}
                  {snapshot.timezone}
                </span>
              </div>
              <Badge>{t("analyticsPartial")}</Badge>
            </div>
            {query.mode === "demo" && scenario === "reversal" && (
              <Alert>
                <strong>{t("analyticsReversalTitle")}</strong>
                <p>{t("analyticsReversalHint")}</p>
              </Alert>
            )}
            <div className="analytics-kpis">
              <Metric
                title={t("analyticsPeriodSales")}
                value={formatKZT(snapshot.cards.sales_minor, locale)}
                scope={periodScope}
                hint={t("analyticsSales")}
                icon="summary"
                primary
              />
              <Metric
                title={t("analyticsPeriodReceipts")}
                value={formatKZT(snapshot.cards.receipts_minor, locale)}
                scope={periodScope}
                hint={t("analyticsReceiptsHint")}
                icon="history"
              />
              <Metric
                title={t("analyticsCount")}
                value={String(snapshot.cards.sales_count)}
                scope={periodScope}
                hint={t("analyticsActiveCountHint")}
                icon="sale"
              />
              <Metric
                title={t("analyticsAverage")}
                textValue={snapshot.cards.average_ticket_minor === null}
                value={
                  snapshot.cards.average_ticket_minor === null
                    ? t("analyticsNoSales")
                    : formatKZT(snapshot.cards.average_ticket_minor, locale)
                }
                scope={periodScope}
                hint={t("analyticsAverageHint")}
                icon="catalog"
              />
              <Metric
                title={t("analyticsCurrentDebt")}
                value={formatKZT(snapshot.cards.outstanding_minor, locale)}
                scope={currentScope}
                hint={t("analyticsDebtHint")}
                icon="debts"
              />
              <Metric
                title={t("analyticsDebtorsCount")}
                value={String(snapshot.cards.debtors_count)}
                scope={currentScope}
                hint={t("analyticsDebtorsHint")}
                icon="customers"
              />
            </div>
            <Card className="analytics-summary" aria-labelledby={summaryId}>
              <h2 id={summaryId}>{t("analyticsSummaryTitle")}</h2>
              <p>
                <strong>{periodScope}. </strong>
                {t("analyticsSummaryPeriod")
                  .replace("{count}", String(snapshot.cards.sales_count))
                  .replace(
                    "{sales}",
                    formatKZT(snapshot.cards.sales_minor, locale),
                  )
                  .replace(
                    "{receipts}",
                    formatKZT(snapshot.cards.receipts_minor, locale),
                  )}
              </p>
              <p>
                <strong>{currentScope}. </strong>
                {t("analyticsSummaryDebt")
                  .replace(
                    "{debt}",
                    formatKZT(snapshot.cards.outstanding_minor, locale),
                  )
                  .replace("{debtors}", String(snapshot.cards.debtors_count))}
              </p>
              {snapshot.cards.receipts_minor < 0 && (
                <p className="analytics-signed-note">
                  {t("analyticsNegativeReceiptsSummary")}
                </p>
              )}
              <nav
                className="analytics-report-links"
                aria-label={t("analyticsReportLinks")}
              >
                <Link className="button button-secondary" to="/seller/history">
                  <Icon name="history" />
                  {t("analyticsOpenHistory")}
                </Link>
                <Link className="button button-secondary" to="/seller/debts">
                  <Icon name="debts" />
                  {t("analyticsOpenDebts")}
                </Link>
              </nav>
            </Card>
            {snapshot.cards.sales_count === 0 &&
              snapshot.cards.receipts_minor === 0 && (
                <Card className="analytics-empty">
                  <EmptyState
                    title={t("analyticsNoActivity")}
                    description={t("analyticsNoActivityHint")}
                    action={
                      <Link className="button button-primary" to="/seller/sale">
                        <Icon name="sale" />
                        {t("analyticsNewSale")}
                      </Link>
                    }
                  />
                </Card>
              )}
            <DailyChart
              key={`daily:${business.id}:${days}:${scenario}`}
              snapshot={snapshot}
            />
            <HourlyChart
              key={`hourly:${business.id}:${days}:${scenario}`}
              snapshot={snapshot}
            />
          </>
        )
      )}
    </section>
  );
}
