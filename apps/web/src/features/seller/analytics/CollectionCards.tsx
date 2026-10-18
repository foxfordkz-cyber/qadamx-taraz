import { useId } from "react";
import { Link } from "react-router-dom";
import { formatKZT } from "../../../shared/format";
import { useI18n } from "../../../shared/i18n";
import { Badge, Card } from "../../../shared/ui";
import type { AnalyticsSnapshot } from "./model";
import "./collection.css";

/** Display the server's cohort amounts, their collected subtotal and ratio. */
export function CollectionCards({
  snapshot,
  demo,
  remindersId,
}: {
  snapshot: AnalyticsSnapshot;
  demo: boolean;
  remindersId: string;
}) {
  const { t, locale } = useI18n();
  const collectionId = useId(),
    agingId = useId();
  const { collection, debt_aging: aging } = snapshot;
  if (!collection && !aging) return null;
  const money = (value: number) => formatKZT(value, locale);
  const collected = collection
    ? collection.paid_at_sale_minor + collection.paid_later_minor
    : 0;
  const percentage = collection?.sales_minor
    ? Math.round((collected / collection.sales_minor) * 100)
    : 0;
  const segments = collection
    ? [
        {
          key: "immediate",
          label: t("analyticsPaidAtSale"),
          amount: collection.paid_at_sale_minor,
        },
        {
          key: "later",
          label: t("analyticsPaidLater"),
          amount: collection.paid_later_minor,
        },
        {
          key: "outstanding",
          label: t("analyticsStillOwed"),
          amount: collection.outstanding_minor,
        },
      ]
    : [];
  const ages = [
    { key: "0_7", label: t("analyticsAgeWeek") },
    { key: "8_30", label: t("analyticsAgeMonth") },
    { key: "31_plus", label: t("analyticsAgeOlder") },
  ] as const;
  const countLabel = (count: number) => {
    const form = new Intl.PluralRules(
      locale === "kk" ? "kk-KZ" : "ru-KZ",
    ).select(count);
    return t(
      form === "one"
        ? "analyticsSalesCountOne"
        : form === "few"
          ? "analyticsSalesCountFew"
          : "analyticsSalesCountOther",
    ).replace("{count}", String(count));
  };
  return (
    <div className="analytics-collection-grid">
      {collection && (
        <Card
          className="analytics-collection-card"
          aria-labelledby={collectionId}
        >
          <div className="analytics-money-heading">
            <h2 id={collectionId}>{t("analyticsCollectionTitle")}</h2>
            {demo && <Badge>{t("analyticsDemoData")}</Badge>}
          </div>
          {collection.sales_minor === 0 ? (
            <p className="analytics-money-empty">
              {t("analyticsCollectionEmpty")}
            </p>
          ) : (
            <>
              <p className="analytics-collected-value">
                {t("analyticsCollectedPercent").replace(
                  "{percent}",
                  String(percentage),
                )}
              </p>
              <p className="analytics-collection-total">
                {t("analyticsCollectionTotal")
                  .replace("{sales}", money(collection.sales_minor))
                  .replace("{paid}", money(collected))}
              </p>
              <div
                className="analytics-collection-bar"
                role="img"
                aria-label={segments
                  .map(
                    (segment) => `${segment.label}: ${money(segment.amount)}`,
                  )
                  .join("; ")}
              >
                {segments
                  .filter((segment) => segment.amount > 0)
                  .map((segment) => (
                    <span
                      key={segment.key}
                      className={`analytics-collection-segment is-${segment.key}`}
                      style={{
                        width: `${(segment.amount / collection.sales_minor) * 100}%`,
                      }}
                      aria-hidden="true"
                    />
                  ))}
              </div>
              <dl className="analytics-collection-legend">
                {segments.map((segment) => (
                  <div key={segment.key}>
                    <dt>
                      <span
                        className={`analytics-money-dot is-${segment.key}`}
                        aria-hidden="true"
                      />
                      {segment.label}
                    </dt>
                    <dd>{money(segment.amount)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Card>
      )}
      {aging && (
        <Card className="analytics-aging-card" aria-labelledby={agingId}>
          <div className="analytics-money-heading">
            <h2 id={agingId}>{t("analyticsAgingTitle")}</h2>
            {demo && <Badge>{t("analyticsDemoData")}</Badge>}
          </div>
          <p className="analytics-aging-description">
            {t("analyticsAgingDescription")}
          </p>
          {aging.every((row) => row.amount_minor === 0) ? (
            <p className="analytics-money-empty">{t("analyticsAgingEmpty")}</p>
          ) : (
            <ul className="analytics-aging-list">
              {ages.map(({ key, label }) => {
                const row = aging.find((item) => item.key === key)!;
                const warning = key === "31_plus" && row.amount_minor > 0;
                return (
                  <li key={key} className={warning ? "is-overdue" : undefined}>
                    <div className="analytics-aging-row">
                      <span>{label}</span>
                      <div>
                        <strong>{money(row.amount_minor)}</strong>
                        <span>{countLabel(row.sales_count)}</span>
                      </div>
                    </div>
                    <div
                      className="analytics-aging-bar"
                      role="img"
                      aria-label={`${label}: ${money(row.amount_minor)}, ${countLabel(row.sales_count)}`}
                    >
                      <span
                        style={{
                          width: `${snapshot.cards.outstanding_minor ? (row.amount_minor / snapshot.cards.outstanding_minor) * 100 : 0}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            className="button button-secondary analytics-aging-remind"
            to="/seller/debts"
            onClick={(event) => {
              const target = document.getElementById(remindersId);
              if (target && window.matchMedia("(min-width: 721px)").matches) {
                event.preventDefault();
                target.scrollIntoView({ block: "start" });
                target.focus({ preventScroll: true });
              }
            }}
          >
            {t("assistantWhoToRemind")}
          </Link>
        </Card>
      )}
    </div>
  );
}
