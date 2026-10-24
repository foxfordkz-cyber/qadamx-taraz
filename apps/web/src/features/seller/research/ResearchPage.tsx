import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../app/auth";
import { useBusiness, useRuntime } from "../../../app/runtime";
import { formatKZT } from "../../../shared/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
} from "../../../shared/ui";
import { FeedbackForm } from "./FeedbackForm";
import {
  demoForecast,
  demoRisk,
  downloadResearch,
  readFeedbackPage,
  readForecast,
  readRisk,
  researchQuery,
  type Forecast,
  type Risk,
} from "./data";
import { useResearchText, type ResearchTextKey } from "./i18n";
import "./research.css";

export function ForecastReport({ snapshot }: { snapshot: Forecast }) {
  const { locale, r } = useResearchText();
  const format = (value: number) => formatKZT(Math.round(value), locale);
  const method = (name: string | null) =>
    r(
      name === "ridge-lags-v1"
        ? "ml"
        : name === "rolling_mean_7"
          ? "mean"
          : "naive",
    );
  const historical = snapshot.history.slice(-60);
  const all = [
    ...historical.map((d) => d.sales_minor),
    ...snapshot.forecast.flatMap((d) => [d.baseline_minor, d.ml_minor]),
  ];
  const max = Math.max(1, ...all),
    count = historical.length + snapshot.forecast.length;
  const points = (values: number[], offset = 0) =>
    values
      .map(
        (v, i) =>
          `${80 + ((i + offset) * 500) / Math.max(1, count - 1)},${185 - (v / max) * 150}`,
      )
      .join(" ");
  const last = historical.at(-1)?.sales_minor ?? 0;
  const evaluation = snapshot.evaluation;
  return (
    <div className="research-report">
      <p className="muted">{r("target")}</p>
      {snapshot.provenance !== "business_ledger" && (
        <Badge>{r("sourceDemo")}</Badge>
      )}
      {snapshot.status === "insufficient_data" ? (
        <Alert>
          {r("insufficient")
            .replace("{observed}", String(snapshot.observed_days))
            .replace("{required}", String(snapshot.required_days))}
        </Alert>
      ) : (
        <>
          <Alert>{r("experimental")}</Alert>
          <p>
            <strong>{r("selected")}:</strong> {method(snapshot.selected_method)}
          </p>
          <svg
            className="research-chart"
            viewBox="0 0 610 220"
            role="img"
            aria-label={r("forecast")}
          >
            <title>
              {r("history")} / {r("baseline")} / {r("ml")}
            </title>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1="80"
                  x2="580"
                  y1={185 - f * 150}
                  y2={185 - f * 150}
                  stroke="currentColor"
                  opacity="0.15"
                />
                <text x="72" y={190 - f * 150} textAnchor="end">
                  {format(max * f)}
                </text>
              </g>
            ))}
            <polyline
              points={points(historical.map((d) => d.sales_minor))}
              className="research-line history-line"
            />
            <polyline
              points={points(
                [last, ...snapshot.forecast.map((d) => d.baseline_minor)],
                historical.length - 1,
              )}
              className="research-line baseline-line"
            />
            <polyline
              points={points(
                [last, ...snapshot.forecast.map((d) => d.ml_minor)],
                historical.length - 1,
              )}
              className="research-line ml-line"
            />
            <text x="80" y="212">
              {historical[0]?.date}
            </text>
            <text x="580" y="212" textAnchor="end">
              {snapshot.forecast.at(-1)?.date}
            </text>
          </svg>
          <div className="research-legend">
            <span className="history-key">— {r("history")}</span>
            <span className="baseline-key">┄ {r("baseline")}</span>
            <span className="ml-key">— {r("ml")}</span>
          </div>
          {evaluation && (
            <>
              <h3>{r("evaluation")}</h3>
              <p>
                {evaluation.test_from} — {evaluation.test_to} ·{" "}
                {snapshot.horizon} {r("days")}
              </p>
              <div className="research-table">
                <table>
                  <thead>
                    <tr>
                      <th>{r("selected")}</th>
                      <th>MAE, ₸</th>
                      <th>RMSE, ₸</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>{method(evaluation.baseline_method)}</th>
                      <td>{format(evaluation.baseline.mae_minor)}</td>
                      <td>{format(evaluation.baseline.rmse_minor)}</td>
                    </tr>
                    <tr>
                      <th>{r("ml")}</th>
                      <td>{format(evaluation.ml.mae_minor)}</td>
                      <td>{format(evaluation.ml.rmse_minor)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                {r("winner")}:{" "}
                <strong>
                  {r(
                    evaluation.test_winner === "baseline"
                      ? "baseline"
                      : evaluation.test_winner === "ml"
                        ? "ml"
                        : "tie",
                  )}
                </strong>
              </p>
              <p className="muted">{r("selection")}</p>
            </>
          )}
        </>
      )}
      {snapshot.warnings.includes("large_values_retained") && (
        <Alert>{r("warnings")}</Alert>
      )}
      {!!snapshot.history.length && (
        <details>
          <summary>{r("table")}</summary>
          <div className="research-table research-history">
            <table>
              <thead>
                <tr>
                  <th>{r("date")}</th>
                  <th>{r("history")}</th>
                  <th>{r("baseline")}</th>
                  <th>{r("ml")}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map((d) => (
                  <tr key={d.date}>
                    <th>{d.date}</th>
                    <td>{format(d.sales_minor)}</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                ))}
                {snapshot.forecast.map((d) => (
                  <tr key={d.date}>
                    <th>{d.date}</th>
                    <td>—</td>
                    <td>{format(d.baseline_minor)}</td>
                    <td>{format(d.ml_minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <Button
        variant="secondary"
        onClick={() =>
          downloadResearch(snapshot, `qadam-forecast-${snapshot.horizon}.json`)
        }
      >
        {r("download")}
      </Button>
    </div>
  );
}

export function RiskReport({ snapshot }: { snapshot: Risk }) {
  const { locale, r } = useResearchText();
  const factors: ResearchTextKey[] = [
    "open_sale_age_0_7",
    "open_sale_age_8_30",
    "open_sale_age_31_plus",
    "at_least_half_initial_debt_unpaid",
    "no_net_later_payment_on_open_sales",
    "net_later_payment_observed",
    "no_current_debt",
  ];
  return (
    <>
      <p>{r("rules")}</p>
      {!snapshot.items.length ? (
        <p>{r("noDebt")}</p>
      ) : (
        <ul className="research-risk-list">
          {snapshot.items.map((item) => (
            <li key={item.customer_id}>
              <div className="research-risk-heading">
                <strong>{item.display_name}</strong>
                <Badge
                  tone={
                    item.category === "high"
                      ? "red"
                      : item.category === "low"
                        ? "green"
                        : "neutral"
                  }
                >
                  {r(item.category)} · {r("score")}: {item.score}/100
                </Badge>
              </div>
              <p>
                {r("balance")}:{" "}
                <strong>{formatKZT(item.balance_minor, locale)}</strong> ·{" "}
                {r("age")}: {item.oldest_open_sale_days} {r("days")}
              </p>
              <ul aria-label={r("reasons")}>
                {item.factors
                  .filter((f) => factors.includes(f as ResearchTextKey))
                  .map((f) => (
                    <li key={f}>{r(f as ResearchTextKey)}</li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ResearchPage() {
  const { scope } = useRuntime();
  const { business } = useBusiness();
  return <ResearchScreen key={`${scope}:${business.id}`} />;
}
function ResearchScreen() {
  const auth = useAuth();
  const { business } = useBusiness();
  const { api, scope } = useRuntime();
  const { r } = useResearchText();
  const [horizon, setHorizon] = useState<7 | 30>(7);
  const [riskCursor, setRiskCursor] = useState("");
  const [feedbackCursor, setFeedbackCursor] = useState("");
  const [review, setReview] = useState(false);
  const enabled =
    !auth.expired &&
    (auth.demo ||
      (!!auth.session && !!import.meta.env.VITE_API_BASE_URL?.trim()));
  const shared = {
    scope,
    businessId: business.id,
    api,
    enabled,
    demo: auth.demo,
  };
  const forecast = useQuery(
    researchQuery({
      ...shared,
      resource: "forecast",
      params: { horizon: String(horizon) },
      sample: () => demoForecast(business.id, horizon),
      read: (v) => readForecast(v, business.id, horizon),
    }),
  );
  const risk = useQuery(
    researchQuery({
      ...shared,
      resource: "debt-risk",
      params: { limit: "25", ...(riskCursor ? { cursor: riskCursor } : {}) },
      sample: () => demoRisk(business.id),
      read: (v) => readRisk(v, business.id),
    }),
  );
  const feedback = useQuery(
    researchQuery({
      ...shared,
      enabled: enabled && !auth.demo && review,
      resource: "feedback",
      params: {
        limit: "25",
        ...(feedbackCursor ? { cursor: feedbackCursor } : {}),
      },
      sample: () => ({
        business_id: business.id,
        items: [],
        next_cursor: null,
      }),
      read: (v) => readFeedbackPage(v, business.id),
    }),
  );
  return (
    <section className="research-page">
      <PageHeader title={r("title")} subtitle={r("intro")} />
      {auth.demo && <Alert>{r("demo")}</Alert>}
      <nav className="actions" aria-label={r("title")}>
        <a href="#forecast">{r("forecast")}</a>
        <a href="#risk">{r("risk")}</a>
        <a href="#feedback">{r("feedback")}</a>
        <Link to="/seller/analytics">{r("analytics")}</Link>
      </nav>
      {!enabled ? (
        <Alert>{r("unavailable")}</Alert>
      ) : (
        <>
          <Card id="forecast">
            <div className="research-heading">
              <h2>{r("forecast")}</h2>
              <Select
                label={r("horizon")}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value) as 7 | 30)}
              >
                <option value="7">7 {r("days")}</option>
                <option value="30">30 {r("days")}</option>
              </Select>
            </div>
            {forecast.isPending ? (
              <Spinner />
            ) : forecast.isError ? (
              <ErrorState
                error={forecast.error}
                retry={() => void forecast.refetch()}
              />
            ) : (
              <ForecastReport snapshot={forecast.data} />
            )}
          </Card>
          <Card id="risk">
            <h2>{r("risk")}</h2>
            {risk.isPending ? (
              <Spinner />
            ) : risk.isError ? (
              <ErrorState
                error={risk.error}
                retry={() => void risk.refetch()}
              />
            ) : (
              <RiskReport snapshot={risk.data} />
            )}
            <div className="actions">
              {riskCursor && (
                <Button variant="secondary" onClick={() => setRiskCursor("")}>
                  {r("first")}
                </Button>
              )}
              {risk.data?.next_cursor && (
                <Button
                  variant="secondary"
                  onClick={() => setRiskCursor(risk.data!.next_cursor!)}
                >
                  {r("next")}
                </Button>
              )}
            </div>
          </Card>
          <Card id="feedback">
            <h2>{r("feedback")}</h2>
            <FeedbackForm
              api={api}
              businessId={business.id}
              enabled={enabled && !auth.demo}
            />
            {!auth.demo && (
              <details>
                <summary>{r("myResponses")}</summary>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (review) void feedback.refetch();
                    else setReview(true);
                  }}
                >
                  {r("review")}
                </Button>
                {review &&
                  (feedback.isPending ? (
                    <Spinner />
                  ) : feedback.isError ? (
                    <ErrorState
                      error={feedback.error}
                      retry={() => void feedback.refetch()}
                    />
                  ) : (
                    <>
                      {!feedback.data.items.length && (
                        <p>{r("emptyResponses")}</p>
                      )}
                      <ul>
                        {feedback.data.items.map((item) => (
                          <li key={item.id}>
                            {item.created_at.slice(0, 10)}: {item.improve_first}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          downloadResearch(
                            feedback.data,
                            "qadam-my-feedback-page.json",
                          )
                        }
                      >
                        {r("download")}
                      </Button>
                      <div className="actions">
                        {feedbackCursor && (
                          <Button onClick={() => setFeedbackCursor("")}>
                            {r("first")}
                          </Button>
                        )}
                        {feedback.data.next_cursor && (
                          <Button
                            onClick={() =>
                              setFeedbackCursor(feedback.data.next_cursor!)
                            }
                          >
                            {r("next")}
                          </Button>
                        )}
                      </div>
                    </>
                  ))}
              </details>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
