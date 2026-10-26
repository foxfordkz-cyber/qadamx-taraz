# Run the integrated application locally

This demonstration uses the real frontend, API routes, SQL ledger and Research
calculations. Auth issuer and AI provider are local test adapters; all customers,
history and feedback are synthetic. Business names visibly say
`OFFLINE AI · SYNTHETIC`. No Supabase account, provider key or paid request is used.

Prepared instance, checked 2026-10-26: **http://127.0.0.1:4303/login**,
source `49832f828c890fb5346eaa0de06baf849bc3f4b0`, database
`qadam_research_browser_stage10_ready_20261026_test`. See demo-ready.json and
demo-initial-sql.json: clean-business sales/receipts/debt/feedback are all zero
(five seeded synthetic customers already exist). While this instance is running,
open the URL directly; do not start a second server on the same ports.
These readiness checks are separate from the complete browser workflow on
2026-10-25. The prepared instance remains available only while its local processes
are running; it is not a hosted Preview.

## Setup (PowerShell, repository root)

Requires Python 3.12, Node, installed Chrome and an authorized disposable local
PostgreSQL. The server/role/port below identify the isolated development instance
used for this task; they are not production credentials.

```powershell
uv sync --locked --project apps/api
Push-Location apps/web
npm.cmd ci --no-audit --no-fund
Pop-Location
$stage10PgBin = (Resolve-Path ../qadam-research-tools/pgsql/bin).Path
& "$stage10PgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_stage10_present_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: use a NEW database; do not erase existing data' }
$env:PYTHONUTF8 = '1'
apps/api/.venv/Scripts/python.exe apps/api/tools/stage10_eval/demo.py --database-url 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage10_present_test' --output tmp/stage10-presentation
```

Use new DB/output names for each launch. The guarded fixture refuses shared,
non-loopback and nonempty targets. Ports 8322/4303 must be free; it will not kill
existing services. Ctrl+C stops only its child processes and preserves the DB.
`tmp/.../ready.json` records the source SHA and local process IDs, without tokens.

Open **http://127.0.0.1:4303/login** in Chrome. Local fixture login:
`a@research.example.test` / `synthetic-local-only`. These values are intentionally
public test fixtures, never credentials for Supabase or the public Qadam site.

## Presentation scenario (about 8–12 minutes; no measured usability claim)

1. Explain the OFFLINE AI / SYNTHETIC label. Select the clean business; verify
   starting sales/receipts/debt are zero. Do not confuse it with the seeded-history
   business or a merchant environment.
2. Create a clearly named synthetic customer. Manually sell 3000 ₸, received
   1000 ₸; select that customer and explicitly confirm. Show debt 2000 ₸.
3. From that debt, record 500 ₸ repayment. Show debt 1500 ₸. Reverse the repayment
   from history: debt is 2000 ₸ again and history retains all three operations.
4. In Sale enter the exact supported offline phrase:
   `Продажа 1200, оплатили сразу полностью`. Prepare a draft; show that money has
   not changed. Explicitly confirm after reviewing 1200/1200. Expected cumulative
   sales 4200 ₸, receipts 2200 ₸, debt 2000 ₸, four journal rows.
5. Open analytics and the read-only assistant. Explain Stage 1 fact binding to
   current SQL and show the outstanding customer; assistant does not write money.
6. In Research on the clean business, show insufficient history and explain why
   no MAE/RMSE is invented. Follow the debt reason/action to the real open sale.
7. Select the `история 180 дней` business. Show 7 and 30 days, baseline/model
   comparison and chronological evaluation. State that the series is artificial.
   Toggle RU/KZ and inspect narrow layout. Do not claim a trained debt model.
8. Back on the clean business, give consent and submit text explicitly marked
   `Synthetic QA feedback; not a participant response`. Reload, open saved
   feedback and load the persisted response.
9. Log out and use `b@research.example.test` / `synthetic-local-only`; only that
   owner's business is available. The previous owner's response must be absent.

Extra safe draft examples (do not auto-confirm):

- `Асқарға үш мың теңгеге тауар бердім, мыңын төледі`: 3000/1000; choose the
  customer explicitly. This would change the financial scenario if confirmed.
- `Ерланға екі мың теңгеге сатым, остальное потом`: payment remains unknown,
  clarification is required; no zero payment is inferred.
- `Саматтың дәптері 2715. Получено 915.`: source-grounded amounts and ambiguous
  local customer candidates; seller chooses, no arbitrary association.
- `Продажа 3000, оплачено полностью`: intentionally malformed offline reply,
  preserved input and manual fallback. This is an injected fault, not live AI.

The fixture supports documented authored examples, not arbitrary AI dialogue.
Do not substitute this demonstration for a live model benchmark or timing study.

## Independent SQL check

From root in a second terminal, for the same dedicated DB:

```powershell
$env:RESEARCH_TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage10_present_test'
$env:PYTHONPATH='.'
Push-Location apps/api
.venv/Scripts/python.exe tests/final_browser_server.py --verify
Pop-Location
```

Amounts in this output are integer tiyn: 420000/220000/200000 after step 4,
not 420000 ₸. `workflow-sql.json` is the recorded automated execution of this
sequence. Other browser cases subsequently write additional labelled operations;
`response-loss-sql.json` records those later before/after states separately.
Screenshots and raw reports are linked in screenshots-register.md and
full-test-results.md. Never overwrite original evidence when repeating the demo.
