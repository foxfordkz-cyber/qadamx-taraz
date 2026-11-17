# Research API 0.8.0 (additive)

This branch adds research routes. Existing monetary/AI/Auth endpoint schemas are
unchanged. Source: OpenAPI, research_schemas.py and research-examples.json. Regenerate
with `python -m app.export_contracts`, then web `npm run generate:api`; do not edit
generated TypeScript by hand.

All paths have prefix `/api/v1/businesses/{business_id}/research`, require the
existing Bearer Supabase JWT and owner membership, return 404 for foreign points,
and send Cache-Control no-store (including errors). No direct Supabase table API.

| Method / suffix | Input | Result |
|---|---|---|
| GET /forecast | horizon=7 or 30, default 7 | ForecastResponse; explicit insufficient_data or experimental |
| GET /debt-risk | limit 1..100 default 25, optional UUID cursor | DebtRiskResponse; rules-v1, items and next_cursor |
| POST /feedback | FeedbackCreate | 201 FeedbackReceipt after commit; idempotent per submitting owner |
| GET /feedback | limit 1..100 default 25, optional UUID cursor | FeedbackPage; only this owner's responses in this point |

Forecast uses Asia/Almaty/KZT integer minor units, full recorded day-close sales,
98/144-day minimum, maximum 730 days. Includes as_of, provenance, dataset hash,
chronological split and held-out baseline/ML MAE/RMSE. Test winner and
validation-selected forecast method are distinct. Live sources: business_ledger or
demo_business_ledger. synthetic_example appears only in explicit Demo fixtures.
No live failure is replaced with synthetic data.

Risk is a transparent priority score, not ML probability or actual overdue status.
No due dates/outcomes exist, so overdue_status=unknown_no_due_dates,
supervised_status=insufficient_data and outcome_metrics=null. No financial writes.
Cursor is the last UUID from the previous page; an empty page alone is not proof
of absence outside the current query.

Feedback requires client_request_id UUID, ru/kk, consent=true, consent_version=v1,
features_used (unique subset of sales/debts/voice/analytics/forecast/risk/catalog/inquiries),
three nullable ratings 1..5, improve_first 1..500 Unicode code points.
unresolved_problem <=1500, suggestion <=2000, follow_up boolean; whitespace is
trimmed. See complete required/default shape in OpenAPI. Numeric/bool coercion is
not accepted for ratings/consent. No email or contact field, no anonymity claim.

A duplicate same user/business/key/payload returns the original receipt; different
payload under that committed key returns 409. Concurrent retries are serialized by
the unique constraint. Lost-response retry is explicit with the same immutable
payload/key; browser never automatically repeats POST. Reload does not replay
anything; use own-response review to inspect committed feedback. This is distinct
from financial and customer-creation idempotency protocols, which are unchanged.

Migration 0009_research_feedback adds one table, constraint and paging index with
RLS/grants restricted. Apply only in a dedicated local database for development.
Shared/production rollout requires captain review, backup/restore plan and a
retention/withdrawal process; no migration or deployment is automatic. No new
environment variable or paid AI provider is required. Existing DB/JWT/CORS settings
remain server-side. Review privacy protocol before real recruitment.
