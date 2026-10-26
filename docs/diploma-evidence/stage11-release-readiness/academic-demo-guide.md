# Five-minute thesis demonstration

Target duration is a script budget, **not a measured timing result**.
Use the actual local application at http://127.0.0.1:4303/login.
Fresh Stage11 prepared DB: `qadam_research_browser_stage11_ready_test`,
loopbackPG55441; verified source e825dd9a9568dda33a9226e1941e789fd21d2175.
Frontend/API launch uses existing guarded Stage10 tool, not new production code.
Local fixture login: `a@research.example.test / synthetic-local-only`.
These are public synthetic fixture values, never credentials for Pages/Supabase.

Preparation: check `tmp/stage11-ready/ready.json` in the Stage10 worktree, exact URL,
and visible OFFLINE AI · SYNTHETIC banner. Initial clean point has5 seeded fictional
customers,0 sales/receipts/debt/feedback; recheck totals before your run.
No reset of prior data. If nonzero, use another newly authorized local DB and record
starting values. Follow [Stage10 launcher](../final-integration/demo-guide.md) with
a NEW database/output and current isolated port55441; never run two launchers on4303.

| Time budget | Actual application action | What to explain/show |
|---|---|---|
|0:00–0:30|Log in, select чистая точка; show dashboard; create clearly synthetic customer|Real React/API/PostgreSQL; local test Auth and offline AI; no merchant study|
|0:30–1:20|Manual Sale3000 ₸, received1000, select customer, explicitly confirm|Journal saved; customer debt2000; money integer tiyn on API|
|1:20–1:50|Open that debt, repay500, confirm|Remaining1500; repayment does not increase sales; history preserved|
|1:50–2:40|Sale text: «Продажа 1200, оплатили сразу полностью» → draft|Offline authored provider adapter; draft alone changes no money; review1200/1200 then explicitly confirm|
|2:40–3:05|Dashboard|Expected delta sales4200, receipts2700, debt1500 ₸; compare authoritative UI, not history-page arithmetic|
|3:05–4:15|Research: clean point shows insufficient history; switch история180дней; show7 then30 days|Real SQL calculations on synthetic history;179 complete days; chronological hold-out; baseline may win; no invented accuracy|
|4:15–4:45|Debt priority and its open-sale action|Rule explanations, not default probability; no due dates so no asserted overdue label|
|4:45–5:00|Feedback consent panel and conclusions|Private persistence exists; real participant collection and live Supabase/AI remain unaccepted|

Do not reverse the repayment in this shortened scenario; the longer Stage10 script
does reverse it and has different totals. Two demos on one DB are not two clean runs.
No synthetic score is a market/revenue benefit. If a step fails, show manual fallback
or recorded **labelled** evidence; do not narrate an operation as saved without success.
The script itself was not timed in Stage11. The current read-only browser smoke verified
login, Research7/30, risk, empty state,390px layout and logout; it did not replay these
financial writes. Prior full workflow is inherited Stage10 evidence.

For future live demo: approved HTTPS callback/accounts/point, real provider budget,
consented physical microphone, exact versions, confirmed financial reconciliation,
privacy/retention owner and independent team acceptance must be ready first.
