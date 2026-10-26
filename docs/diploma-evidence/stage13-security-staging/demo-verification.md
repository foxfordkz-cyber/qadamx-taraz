# Stage13 local demonstration

Fresh installed Chrome → real FastAPI → disposable PostgreSQL:
19/19 end-to-end tests passed in the new worktree. Fixture database:
qadam_research_browser_stage13_full_test on loopback55441; API8333, web4313.
No mocked browser financial endpoint or shared DB. JWT issuance and AI provider
transport are explicitly local synthetic fixtures, not real Supabase/AI.

Workflow: login → customer → sale3000/received1000 → debt2000 → repayment500 →
debt1500 → repayment reversal → debt2000 → offline AI full-paid1200 draft →
explicit confirmation → Analytics → Research7/30 → consented feedback → reload →
logout/other-owner access. SQL checkpoint: sales4200, receipts2200, debt2000 KZT,
4 operations,6 customers,1 feedback (runs/workflow-sql.json).

Later independent tests add Kazakh partial sale3000/1000 and response-loss
sale3400/3400. Final independent SQL: **sales10600, receipts6600, debt4000 KZT**,
6 operations,7 customers,1 consented feedback; revision0009_research_feedback.
See runs/final-sql.json and runs/sql-migration.json. Raw money is integer minor
units (divide by100 for KZT). No artificial correction was made.

Response-loss replay: same key/body/operation ID adds one ledger operation;
customer recovery sends one POST and two lookups, adds one customer and no money
operation. Evidence: runs/response-loss-sql.json and customer-recovery-sql.json.
Research 30 response/splits/metrics are in runs/research-30-response.json; the
179-day eligible artificial series selects a seasonal baseline. This is
correctness evidence only, not trained-model superiority or merchant accuracy.

Actual screenshots, visually inspected, synthetic records only:
- [Kazakh draft and explicit confirmation](screenshots/grounded-kazakh-1280.png).
- [Research in Kazakh at360px](screenshots/research-sql-kk-360.png).
Full-page capture can retain the sticky header at its scroll position; these are
unaltered test screenshots, not a redesign or polished presentation mockup.

## Persistent demo after acceptance

Running: http://127.0.0.1:4313/login (API8333), source
9afb7ed65c4dae7dd2c2702029983932b3041466. New database
qadam_research_browser_stage13_ready_test. Clean business starts with0 operations,
0 sales/receipts/debt/feedback and5 synthetic customers; history business has180
seeded sale days (179 eligible full days). Exact initial SQL is retained.

A fresh installed Chrome156.0.8078.47 read-only smoke passed login, Research7/30,
rules-based debt prioritization, empty-business/mobile state and logout.
page_errors=[], blocked_writes=[]; SQL snapshot including the all-business ledger
hash is identical before/after. See runs/demo-smoke.json, demo-preservation.json
and demo-smoke-provenance.json. The original Stage11 smoke script is unchanged;
a UTF-8 local copy substitutes only Stage13 origins and the actual source label.
This extra check is separate from the19 full-flow and8 Seller suites.

Stage12 remains on http://127.0.0.1:4303/login with API8322 and its original DB.
Its endpoint readiness was checked read-only; no Stage12 process was stopped or
schema/data reset. New launcher defaults4313/8333, reserves the old ports, rejects
existing output/nonempty DB and strips inherited provider credentials. Startup
commands and synthetic login are in staging-configuration.md. No live provider,
paid request, physical microphone acceptance or production deployment is claimed.
