# Forecast methodology, v1

Target: registered sales that remained valid at **each local day's close**, KZT
minor units, Asia/Almaty. Later cancellations never rewrite earlier training
features. This intentionally differs from the existing analytics' current-snapshot
restated totals. Payments are not sales. Neither money ledger nor analytics changes.

The first observed sales date is excluded (possible partial onboarding), as is
today. PostgreSQL emits up to 730 completed consecutive days; days with no recorded
sales within this observed interval are zero. This is not evidence that all actual
business activity was recorded. No zeros are invented before recording started.
Offline exports must already be complete: gaps/duplicates/order errors reject the
dataset. Invalid/non-integer/negative/unsafe amounts are rejected, not silently
dropped. Outliers remain in the target; values >10× median positive sales are flagged.

Two baseline candidates: last-7-day mean and weekly seasonal naive. ML candidate:
ridge autoregression with intercept, lag1, lag7, mean7, mean28 and six weekday
indicators. Training-only mean scales money; ridge penalties 0.1, 1, 10 are chosen
on validation MAE. An 11×11 partial-pivot linear solver uses the Python standard
library; no large dependency or paid AI provider. Predictions are recursively fed
back as lags, rounded to minor units and constrained to [0, JS-safe integer maximum].
Zero histories are valid; a tie favors a baseline.

For horizon H (7 or 30), minimum history is 84 + 2H days (98 or 144). Split:
chronological train / H validation days / H final test days. Baseline choice, ridge
penalty and displayed method are selected **only on validation**. Refit candidates
on train+validation for identical H-step test forecasts; compute MAE and RMSE in
minor units. The reported test winner can differ from the validation-selected
method. Refit on all available history for the future forecast; the test score does
not describe those future observations. No shuffled split, test-driven tuning or
one-step metric disguised as a 30-day forecast.

No confidence interval or default probability is claimed. One held-out period is
a limited internal assessment, not external validation. Zero counts, missing
recording, seasonality changes, outliers and recursive error accumulation matter.
Thresholds are prototype design choices, not empirical proof of sufficiency.

Methodological reference: Hyndman & Athanasopoulos,
[time-series validation](https://otexts.com/fpp3/tscv.html): training precedes test,
and evaluation horizon should match use. Further rolling-origin and external
business validation is planned before scientific or business-wide claims.

Reproduce engineering fixtures from `apps/api`:

```powershell
uv run python -m app.evaluate_research --synthetic --horizon 7 --output ../../tmp/research-synthetic-7.json
uv run python -m app.evaluate_research --empty --horizon 30 --output ../../tmp/research-insufficient.json
uv run python -m app.evaluate_research --input <private-complete-daily-array.json> --horizon 30 --output ../../tmp/research-private-result.json
```

The input export must follow the day-close target above, not a partial history page
or an existing restated analytics response. Outputs record dataset and implementation
SHA-256, model/version, runtime, split and metrics. Never commit a real financial
export. `--synthetic` is only an engineering illustration; `--empty` records the
actual absence of a supplied real research dataset.
