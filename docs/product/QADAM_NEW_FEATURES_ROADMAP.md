# Product roadmap after critical stability — 2026-11-11

Stage 0/1 is delivered separately from unfinished diploma PRs. No P1/P2 feature
is represented as already implemented by writing this plan. Financial correctness
and hosted availability remain release gates; do not pile new business mutations
onto an unverified deployment. Use `feature/qadam-business-improvements` and a
separate reviewed PR per substantial feature after Stage 1/2 acceptance.

| Order | P1 work | Existing capability to preserve | Required dependency and risk | Acceptance |
| --- | --- | --- | --- | --- |
| 1 | System status | Login health probe, bounded Auth/backend reads, safe DB error code | Auth/backend/DB/AI readiness must be separately proven; health alone cannot prove all | Offline backend/DB/Auth, denied credentials and retry each show honest reason |
| 2 | Customer financial profile | Name/search/debt links and authoritative balances | Server aggregation across all pages; no client sums of partial history | Sales/payments/debt/reversals agree with SQL; cross-business access rejected |
| 3 | Sales/debt filters | Existing customer/history pagination and 7/30 analytics | Typed server filters and pagination; no due-date field currently established | Date/customer/type/amount filters match SQL; stable next page |
| 4 | CSV and printable period reports | Day summary share text | Full authorized dataset, formula-injection protection, privacy, integer minor units | Totals match API/SQL, Unicode preserved, exports cannot execute spreadsheet formulas |
| 5 | Durable offline drafts | In-memory editable forms and server idempotency for confirmed writes | Consent/storage policy, account isolation, schema versioning, same-key unknown-result recovery | Reload/offline/reconnect, explicit send, no duplicate, logout isolation |
| 6 | Reminder workflow/history | User-operated WhatsApp templates and debtor list | Agreed due dates and persisted status model; provider authorization for delivery | No invented overdue status; preview only until explicit user send; no fake delivery status |

Research/forecasting/feedback must be integrated by reviewing PR #100 and its
dependent #101–103 chain, not copying a newer generated contract into main.
Hold-out MAE/RMSE, insufficient-history behaviour and feedback migration require
their own reproducible API/PostgreSQL/browser acceptance on the agreed baseline.

P2 after these gates: saved filters first (local state/privacy policy), then
Dashboard preferences. Stock accounting, category models and repeat-purchase
analytics require explicit schemas and dedicated PRs; do not introduce them
together. Native Flutter/mobile code is outside this Stage 1 patch.

Owners: backend for authoritative aggregation/contracts, ledger-web for draft and
write boundaries, seller-web for navigation/state/errors, public-web for public
catalog, hosting owner for Render/deployment and provider configuration. Preserve
all existing ledger, membership, JWT and RLS enforcement.
