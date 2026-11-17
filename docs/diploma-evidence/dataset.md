# Dataset provenance and preprocessing

**No real research dataset was provided or extracted. No participant was recruited.**
This repository contains synthetic contract/test fixtures and an explicit absence
report. Existing team demo accounts, voice screenshots and production test totals
are not a forecasting dataset or survey evidence.

| Source | Content | Permitted interpretation |
|---|---|---|
| Authenticated business journal, when available | Owner's completed daily sales, current net open debts | Scoped experimental operational output; eligibility must be audited |
| Business marked is_demo | Actual journal rows of a teaching point | Teaching data, not real-world validation |
| ForecastSynthetic7/30 contract examples | 180 programmatically generated daily amounts from 2025-01-01 | Explicit Demo/rendering and deterministic engineering tests |
| PostgreSQL test fixtures | Synthetic IDs, sales/repayments/reversals and feedback | Database correctness, access control and migration evidence |
| real-data-status.json | Empty input with reason and null evaluation | No actual performance claim |

Forecast preprocessing: exact integer minor units; one ordered row per local day;
first recorded day/current partial day excluded. Live SQL generates missing dates
after onboarding as zero journal activity; offline input with gaps/duplicates or
invalid/negative/unsafe amounts is rejected so it cannot silently change meaning.
Maximum 730 complete days. Values above 10 times median positive amount are retained
and flagged, never removed for improving metrics. All-zero history is handled by
the baseline and reported as such. Only past lag/rolling/weekday features are used;
scaling is learned on training data. A sale reversed before its day closes is
excluded; later reversal does not rewrite what was known at that historical close.

Debt facts: open unreversed sales with positive remaining balance, original credit,
net later repayments after reversals, age of oldest open sale and open count.
Customer display name is shown only to its owner; contact, audio and identification
documents are not used. Paid/censored/overdue/default labels cannot be inferred
reliably from those snapshots. Rule-based categories are not ground truth.

Privacy: live export remains local to the owner. Keep private input/results outside
Git (for example ignored tmp/ with appropriate OS access controls), then review
aggregation/anonymization before sharing. Hashes establish reproducibility, not
consent, representativeness or truth. Review time-window completeness, store closure,
late recording and monetary corrections with the owner. Data outside Qadam's
journal is unknown. Model output should not be used for automated financial decisions.

Synthetic construction and exact results are in app.evaluate_research and the
two synthetic-forecast JSONs. See [evaluation plan](../ml-evaluation-plan.md) for
scientific gates, bias, additional label requirements and future rolling evaluation.
