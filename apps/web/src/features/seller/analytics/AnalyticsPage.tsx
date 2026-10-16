import { useState } from "react";
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
import { Icon } from "../../../shared/ui/Icon";
import { DailyChart, HourlyChart, analyticsDate } from "./Charts";
import type { AnalyticsDays, DemoScenario } from "./model";
import { useAnalytics } from "./queries";
import "./analytics.css";

export function AnalyticsPage() {
  const { business } = useBusiness();
  const { t, locale } = useI18n();
  const [days, setDays] = useState<AnalyticsDays>(7);
  const [scenario, setScenario] = useState<DemoScenario>("activity");
  const query = useAnalytics(days, scenario);
  const snapshot = query.mode === "waiting" ? undefined : query.data;
  const asOf = snapshot
    ? new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-KZ", {
        timeZone: snapshot.timezone,
        dateStyle: "medium",
        timeStyle: "short",
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
              <Card className="analytics-kpi analytics-kpi-primary">
                <span className="analytics-kpi-icon" aria-hidden="true">
                  <Icon name="summary" />
                </span>
                <h2>{t("analyticsPeriodSales")}</h2>
                <strong className="analytics-kpi-value">
                  {formatKZT(snapshot.cards.sales_minor, locale)}
                </strong>
                <p>{t("analyticsSales")}</p>
                <small>
                  {t("analyticsSaleCount")}: {snapshot.cards.sales_count}
                </small>
              </Card>
              <Card className="analytics-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">
                  <Icon name="history" />
                </span>
                <h2>{t("analyticsPeriodReceipts")}</h2>
                <strong className="analytics-kpi-value">
                  {formatKZT(snapshot.cards.receipts_minor, locale)}
                </strong>
                <p>{t("analyticsReceiptsHint")}</p>
              </Card>
              <Card className="analytics-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">
                  <Icon name="sale" />
                </span>
                <h2>{t("analyticsAverage")}</h2>
                <strong className="analytics-kpi-value">
                  {snapshot.cards.average_ticket_minor === null
                    ? t("analyticsNoSales")
                    : formatKZT(snapshot.cards.average_ticket_minor, locale)}
                </strong>
                <p>{t("analyticsAverageHint")}</p>
              </Card>
              <Card className="analytics-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">
                  <Icon name="debts" />
                </span>
                <h2>{t("analyticsCurrentDebt")}</h2>
                <strong className="analytics-kpi-value">
                  {formatKZT(snapshot.cards.outstanding_minor, locale)}
                </strong>
                <p>{t("analyticsDebtHint")}</p>
                <small>
                  {t("analyticsDebtors")}: {snapshot.cards.debtors_count}
                </small>
              </Card>
            </div>
            <p className="analytics-financial-note">
              {t("analyticsNotProfit")}
            </p>
            {snapshot.cards.sales_count === 0 &&
              snapshot.cards.receipts_minor === 0 && (
                <Card className="analytics-empty">
                  <EmptyState
                    title={t("analyticsNoActivity")}
                    description={t("analyticsNoActivityHint")}
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
