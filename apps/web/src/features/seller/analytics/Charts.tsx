import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { formatKZT } from "../../../shared/format";
import { useI18n, type Locale } from "../../../shared/i18n";
import { Button, Card } from "../../../shared/ui";
import type { AnalyticsSnapshot } from "./model";

export function analyticsDate(
  value: string,
  locale: Locale,
  timezone: string,
  short = false,
): string {
  // Calendar dates come from the snapshot, never from the browser's local day.
  return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-KZ", {
    timeZone: timezone,
    day: "numeric",
    month: short ? "short" : "long",
  }).format(new Date(`${value}T12:00:00Z`));
}

function moveBar(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  buttons: (HTMLButtonElement | null)[],
) {
  let next: number;
  if (event.key === "ArrowRight")
    next = Math.min(index + 1, buttons.length - 1);
  else if (event.key === "ArrowLeft") next = Math.max(index - 1, 0);
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = buttons.length - 1;
  else return;
  event.preventDefault();
  buttons[next]?.focus({ preventScroll: true });
  buttons[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function useSelectedBarScroll(
  selected: number,
  buttons: { current: (HTMLButtonElement | null)[] },
) {
  const viewport = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = viewport.current;
    const button = buttons.current[selected];
    if (!container || !button) return;
    // Scroll only the chart, never the document. Mobile initially shows today
    // and the busiest registration hour rather than an off-screen selection.
    const center = () => {
      const position =
        button.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft;
      container.scrollLeft =
        position - (container.clientWidth - button.offsetWidth) / 2;
    };
    center();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(center);
    observer.observe(container);
    return () => observer.disconnect();
  }, [selected, buttons]);
  return viewport;
}

export function DailyChart({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const helpId = useId();
  const [series, setSeries] = useState<"sales_minor" | "receipts_minor">(
    "sales_minor",
  );
  const [selected, setSelected] = useState(snapshot.daily.length - 1);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const viewport = useSelectedBarScroll(selected, buttons);
  const point = snapshot.daily[selected] ?? snapshot.daily[0];
  const values = snapshot.daily.map((day) => day[series]);
  const positive = Math.max(0, ...values);
  const negative = Math.abs(Math.min(0, ...values));
  const range = positive + negative || 1;
  const baseline = (negative / range) * 100;
  const seriesLabel = t(
    series === "sales_minor" ? "analyticsSales" : "analyticsReceipts",
  );
  return (
    <Card className="analytics-chart-card" aria-labelledby={headingId}>
      <div className="analytics-chart-heading">
        <div>
          <span className="analytics-eyebrow">{t("analyticsPeriod")}</span>
          <h2 id={headingId}>{t("analyticsDailyTitle")}</h2>
        </div>
        <div
          className="analytics-series"
          role="group"
          aria-label={t("analyticsSeries")}
        >
          <Button
            variant="ghost"
            aria-pressed={series === "sales_minor"}
            onClick={() => setSeries("sales_minor")}
          >
            {t("analyticsSales")}
          </Button>
          <Button
            variant="ghost"
            aria-pressed={series === "receipts_minor"}
            onClick={() => setSeries("receipts_minor")}
          >
            {t("analyticsReceipts")}
          </Button>
        </div>
      </div>
      <p className="analytics-chart-explanation">{t("analyticsDailyHint")}</p>
      {series === "receipts_minor" && (
        <p className="analytics-signed-note">{t("analyticsSignedHint")}</p>
      )}
      <div className="analytics-chart-legend">
        <span
          className={`analytics-series-dot ${series === "receipts_minor" ? "analytics-receipt-dot" : ""}`}
          aria-hidden="true"
        />
        <span>{seriesLabel}</span>
        <strong>{formatKZT(positive, locale)}</strong>
      </div>
      <div
        className="analytics-chart-scroll"
        ref={viewport}
        role="region"
        aria-label={t("analyticsDailyChart")}
        aria-describedby={helpId}
      >
        <div className="analytics-bars analytics-daily-bars">
          {snapshot.daily.map((day, index) => {
            const value = day[series];
            const height = (Math.abs(value) / range) * 100;
            const label = `${analyticsDate(day.date, locale, snapshot.timezone)}. ${seriesLabel}: ${formatKZT(value, locale)}. ${t("analyticsCount")}: ${day.sales_count}${day.is_partial ? `. ${t("analyticsPartial")}` : ""}`;
            return (
              <button
                key={day.date}
                type="button"
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                className={`analytics-bar-button ${index === selected ? "analytics-bar-selected" : ""}`}
                aria-label={label}
                aria-pressed={index === selected}
                tabIndex={index === selected ? 0 : -1}
                onClick={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onKeyDown={(event) => moveBar(event, index, buttons.current)}
              >
                <span className="analytics-bar-plot" aria-hidden="true">
                  <span
                    className="analytics-zero-line"
                    style={{ bottom: `${baseline}%` }}
                  />
                  <span
                    className={`analytics-bar ${series === "receipts_minor" ? "analytics-receipt-bar" : ""} ${value < 0 ? "analytics-negative-bar" : ""} ${day.is_partial ? "analytics-partial-bar" : ""}`}
                    style={{
                      height: value === 0 ? "2px" : `${height}%`,
                      bottom: `${value < 0 ? baseline - height : baseline}%`,
                    }}
                  />
                </span>
                <span className="analytics-bar-label" aria-hidden="true">
                  {day.date.slice(8)}
                  {day.is_partial && (
                    <span className="analytics-partial-dot">•</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {negative > 0 && (
        <div className="analytics-negative-label">
          {formatKZT(-negative, locale)}
        </div>
      )}
      <p className="analytics-chart-help" id={helpId}>
        {t("analyticsChartHint")}
      </p>
      <div
        className="analytics-selection"
        role="status"
        aria-label={t("analyticsSelected")}
      >
        <div className="analytics-selection-date">
          <strong>
            {analyticsDate(point.date, locale, snapshot.timezone)}
          </strong>
          {point.is_partial && <span>{t("analyticsPartial")}</span>}
        </div>
        <dl>
          <div>
            <dt>{t("analyticsSales")}</dt>
            <dd>{formatKZT(point.sales_minor, locale)}</dd>
          </div>
          <div>
            <dt>{t("analyticsReceipts")}</dt>
            <dd>{formatKZT(point.receipts_minor, locale)}</dd>
          </div>
          <div>
            <dt>{t("analyticsCount")}</dt>
            <dd>{point.sales_count}</dd>
          </div>
        </dl>
      </div>
      <details className="analytics-table-details">
        <summary>{t("analyticsShowDailyTable")}</summary>
        <div
          className="analytics-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={t("analyticsTableScroll")}
        >
          <table className="analytics-table">
            <caption>{t("analyticsDailyCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("analyticsDate")}</th>
                <th scope="col">{t("analyticsSales")}</th>
                <th scope="col">{t("analyticsReceipts")}</th>
                <th scope="col">{t("analyticsCount")}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.daily.map((day) => (
                <tr key={day.date}>
                  <th scope="row">
                    <time dateTime={day.date}>
                      {analyticsDate(day.date, locale, snapshot.timezone)}
                    </time>
                    {day.is_partial && <small>{t("analyticsPartial")}</small>}
                  </th>
                  <td>{formatKZT(day.sales_minor, locale)}</td>
                  <td>{formatKZT(day.receipts_minor, locale)}</td>
                  <td>{day.sales_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

export function HourlyChart({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const { t } = useI18n();
  const headingId = useId();
  const helpId = useId();
  const [selected, setSelected] = useState(() => {
    const peak = Math.max(...snapshot.hourly.map((hour) => hour.sales_count));
    return snapshot.hourly.findIndex((hour) => hour.sales_count === peak);
  });
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const viewport = useSelectedBarScroll(selected, buttons);
  const max = Math.max(1, ...snapshot.hourly.map((hour) => hour.sales_count));
  const point = snapshot.hourly[selected] ?? snapshot.hourly[0];
  const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
  return (
    <Card className="analytics-chart-card" aria-labelledby={headingId}>
      <div className="analytics-chart-heading">
        <div>
          <span className="analytics-eyebrow">
            00:00 — 23:00 · {snapshot.timezone}
          </span>
          <h2 id={headingId}>{t("analyticsHourlyTitle")}</h2>
        </div>
      </div>
      <p className="analytics-chart-explanation">{t("analyticsHourlyHint")}</p>
      <div className="analytics-chart-legend">
        <span
          className="analytics-series-dot analytics-hourly-dot"
          aria-hidden="true"
        />
        <span>{t("analyticsCount")}</span>
        <strong>
          {max === 1 && snapshot.cards.sales_count === 0 ? 0 : max}
        </strong>
      </div>
      <div
        className="analytics-chart-scroll"
        ref={viewport}
        role="region"
        aria-label={t("analyticsHourlyChart")}
        aria-describedby={helpId}
      >
        <div className="analytics-bars analytics-hourly-bars">
          {snapshot.hourly.map((hour, index) => (
            <button
              type="button"
              key={hour.hour}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              className={`analytics-bar-button ${index === selected ? "analytics-bar-selected" : ""}`}
              aria-label={`${hourLabel(hour.hour)}. ${t("analyticsCount")}: ${hour.sales_count}`}
              aria-pressed={index === selected}
              tabIndex={index === selected ? 0 : -1}
              onClick={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              onKeyDown={(event) => moveBar(event, index, buttons.current)}
            >
              <span className="analytics-bar-plot" aria-hidden="true">
                <span className="analytics-zero-line" />
                <span
                  className="analytics-bar analytics-hourly-bar"
                  style={{
                    height:
                      hour.sales_count === 0
                        ? "2px"
                        : `${(hour.sales_count / max) * 100}%`,
                  }}
                />
              </span>
              <span className="analytics-bar-label" aria-hidden="true">
                {String(hour.hour).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="analytics-chart-help" id={helpId}>
        {t("analyticsChartHint")}
      </p>
      <div
        className="analytics-selection analytics-hour-selection"
        role="status"
        aria-label={t("analyticsSelected")}
      >
        <strong>
          {hourLabel(point.hour)} — {String(point.hour).padStart(2, "0")}:59
        </strong>
        <dl>
          <div>
            <dt>{t("analyticsCount")}</dt>
            <dd>{point.sales_count}</dd>
          </div>
        </dl>
      </div>
      <details className="analytics-table-details">
        <summary>{t("analyticsShowHourlyTable")}</summary>
        <div
          className="analytics-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={t("analyticsTableScroll")}
        >
          <table className="analytics-table">
            <caption>{t("analyticsHourlyCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("analyticsHour")}</th>
                <th scope="col">{t("analyticsCount")}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.hourly.map((hour) => (
                <tr key={hour.hour}>
                  <th scope="row">{hourLabel(hour.hour)}</th>
                  <td>{hour.sales_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
