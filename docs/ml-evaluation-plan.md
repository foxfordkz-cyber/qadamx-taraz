# Reproducible ML evaluation plan

Status: engineering implementation, **no real-business experiment completed**.
This protocol belongs to the diploma extension, not a claim about the deployed
Qadam release. [Evidence and baseline audit](diploma-evidence/README.md).

## Hypotheses and predeclared comparisons

H1: regularized lag regression can reduce held-out daily-sales MAE relative to a
simple baseline for an eligible business. H0: it does not improve MAE. RMSE is a
secondary measure of large errors. Baseline wins and ties are valid results.
H2 (future): labeled repayment outcomes could be predicted better than transparent
rules. H2 is currently **untested**: the journal has no contractual due dates or
verified maturity/default labels. Do not treat current open debt as default.

## A. Sales: implemented protocol

Target, units, exclusions, features, model fitting and chronological boundaries:
[forecast-method](diploma-evidence/forecast-method.md). Daily KZT integer minor units,
Asia/Almaty, recorded sales as known at each local day close. No private client
details. First partial onboarding day and current day excluded. Gaps after
onboarding mean zero **recorded** sales, not proof the shop was open.

For horizon H=7 or H=30: at least 84 training days, then H validation days, then H
untouched test days (98/144 total). Candidate non-ML baselines: last-7-day mean and
weekly seasonal naive. Ridge lag regression uses alpha in {0.1,1,10}; train scaling
and model choice never use test values. Select baseline/alpha/deployed method by
validation MAE. Refit on train+validation, forecast the same H test days recursively
for both methods, compute MAE and RMSE. Record the observed test winner separately
from the validation-selected deployed method. Finally refit for future inference.
No shuffled time-series split. No prediction intervals are claimed.

Record per business: collection/source eligibility, date range, exclusions and
missing-record caveats, dataset hash, code SHA, Python version, feature/model
version, split bounds, alpha, methods, raw metrics, failures and limitations. Do not
mix horizons or sum test errors across unrelated currencies. Never pool a tenant's
private data into another tenant's model. The live service fits at request time
(maximum 730 daily rows); no model registry/background retraining is implemented.

### Reproduction (from apps/api)

```powershell
uv sync --locked
uv run python -m app.evaluate_research --empty --horizon 7 --output ../../tmp/research-real-status.json
uv run python -m app.evaluate_research --synthetic --horizon 7 --output ../../tmp/research-synthetic-7.json
uv run python -m app.evaluate_research --synthetic --horizon 30 --output ../../tmp/research-synthetic-30.json
# Only with a consented private export of daily {date,sales_minor} rows:
uv run python -m app.evaluate_research --input ../../tmp/private-daily.json --horizon 7 --output ../../tmp/private-result.json
```

Use the exact `history` array from the authenticated forecast JSON export, preserving
its as-of timestamp and original provenance privately. The CLI accepts that array,
not the whole API wrapper. It validates dates, continuity, safe integer amounts and
history length. Operator-supplied files are **not independently verified** merely
because a hash was computed. Do not commit private inputs or identifiable outputs.

[Recorded JSONs](diploma-evidence/README.md) are generated, reproducible engineering
examples. They intentionally omit private source rows. The dataset construction is
in the CLI, not a claimed customer dataset. Re-run with the same Python version and
code; compare JSON contents including hash and metrics (line endings may affect the
source-code hash across platforms). JSON full precision is authoritative.

| Evidence | H | Baseline MAE / RMSE, minor | ML MAE / RMSE, minor | Interpretation |
|---|---:|---:|---:|---|
| Synthetic deterministic v1 | 7 | 700 / 700 | 42.285714 / 43.431391 | Computation example only |
| Synthetic deterministic v1 | 30 | 1866.666667 / 2060.744202 | 136.9 / 150.286282 | Computation example only |
| Real eligible business data | 7/30 | Not measured | Not measured | insufficient_data |

These fabricated-for-testing time series are deliberately simple. Their favorable
ML result is not evidence for H1 in real businesses. Tests also include baseline
wins/ties and constant/zero histories. No accuracy percentage, participant benefit
or generalized performance conclusion follows from this table.

## B. Debt risk: current rules, supervised experiment pending

Current `rules-v1`: oldest open sale age 8–30 days +25, >=31 days +50;
>=50% original credit still unpaid +20; no net later payment +10.
Low <30, medium 30–59, high >=60. Score is a review priority, not a calibrated
probability. All weights/thresholds are prototype choices, not estimates from data.
Current debt and net later payments account for reversals. No due-date-derived
overdue days are available. Financial records and customer access are never changed.

Before training: agree the outcome definition and maturity window with the captain
and researcher, collect contractual due dates and reliable outcomes, consent,
feature snapshots **before** outcome, and sufficient matured positives/negatives.
A pilot design might require >=200 matured cases with >=50 of each outcome across
multiple businesses; this is a proposed feasibility gate, not a statistical power
guarantee. Determine adequate sample size with the actual prevalence and uncertainty.
Keep all records of a customer together; split by time and hold out businesses when
assessing generalization. Exclude censored/immature cases explicitly, not as paid.

Compare rules and a simple supervised logistic model on identical held-out cases.
Fit imputation/scaling/thresholds on training/validation only. Record precision,
recall, F1, class counts/confusion matrix and ROC-AUC only with both classes; include
PR-AUC for imbalance if implemented. Explain false positives (unfair reminders)
and false negatives (missed follow-up); never automate credit denial. Report
uncertainty and calibration before treating scores as probabilities. Do not
oversample before splitting or use repayment events after prediction time as
features. **No classifier, labels, fitted model or classification metric exists
in this implementation; exported metrics are null.**

## C. Scientific interpretation and next experiment

Recruit eligible businesses under [user research plan](user-research-plan.md).
Audit completeness, downtime, returns, promotions/holidays and store opening dates.
The current single holdout is suitable for a prototype but weak for scientific
generalization. A later registered experiment should use multiple chronological
rolling origins, several businesses and paired per-origin errors; avoid selecting
the winning report after inspecting test results. Report every eligible store and
failed run, disclose exclusions and negative results. Do not claim significance
from overlapping windows or one synthetic series. No causal usability claim without
an appropriate study. Forecast performance and questionnaire opinions are separate.
