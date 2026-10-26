# Stage 10 actual verification

Executed 2026-10-25 on Windows, Python 3.12.14, Node 24.21.0, installed Chrome
156.0.8078.47, PostgreSQL 17.11. Heavy browser/backend/frontend suites ran
sequentially. No paid provider, real account or shared database was used.

Production source equals Stage 9. Acceptance tooling was tested in the working
tree and then committed; exact implementation commit/file hashes are recorded in
candidate-verification.json. The post-commit fresh challenge is retained separately
from the first execution. Documentation changes do not alter production source.

## Results

| Check | Passed | Failed | Skipped | Actual detail / evidence |
|---|---:|---:|---:|---|
| Full backend pytest | 764 | 0 | 0 | 365.50 s; logs/backend-full.log and XML |
| PostgreSQL-marked subset of that full run | 211 | 0 | 0 | Not additional tests; selection count in logs/postgres-collection.log |
| Focused new challenge/SQL first run | 35 | 0 | 0 | Separate earlier run; logs/focused.log |
| Full frontend Vitest | 639 | 0 | 0 | 47 files, 289.01 s; logs/frontend-full.log |
| Combined Chrome/API/SQL final suite | 19 | 0 | 0 | 10.1 min, one worker, retries 0; logs/browser-final.log and XML |
| Initial browser suite, retained | 17 | 2 | 0 | Two new test-harness defects below; logs/browser-first.log |
| Fresh challenge first execution | 42 matches | 0 mismatches | 0 | Same authored fixture outputs for Stage 9 and candidate |
| Frozen Stage 7 replay | 99 matches | 1 mismatch | 0 | S7-090 retained; regression-stage7/ |
| Frozen Stage 8/9 paired replay | 118 matches | 2 mismatches | 0 | Stage 8 baseline 104/120; S8-080/084 retained |
| Frozen Stage 1 factual validation | 42 correct decisions | 0 | 0 | TP18/TN24/FP0/FN0; regression-stage1/ |

Evaluator mismatches remain in their denominators. They are not hidden as skipped
pytest tests. No claims about the full application's live E2E or model accuracy
are inferred from fixture counts. Other standalone Playwright configurations were
not rerun; the combined suite above is the relevant Stage 10 acceptance scope.

Static checks: full Ruff check; full Python format check (121 files); backend
exported contracts check all passed. Frontend check:api, typecheck, ESLint,
Prettier and build all passed (exit 0); build took 18.95 s.
Exit codes are recorded in `logs/web-static-exits.json`.
`git diff --check` passed. API 0.8.0 contract/generated types were not modified.

## Initial failures and correction

1. Initial Ruff reported 26 import/layout/line-length issues in new tooling.
   Formatting and bounded string wrapping fixed them; no gold was modified.
2. Browser first run: the lost-financial-response test asserted its intercept
   list immediately after the UI entered pending/unknown state, before the
   awaited response body had been recorded. Failure then disposed the browser
   response. The test now waits for the actual intercepted response, then checks
   SQL and identical key/body/operation ID. No timeout was increased.
3. Browser first run: customer creation expected HTTP 200, while the real
   contract returns 201; its observer also looked at the wrong lookup path.
   The correction asserts 201 and observes `/customer-creation-result`.
   The final test sees one POST, two lookup requests, one new customer and an
   unchanged ledger. Production customer logic was not changed.
4. The complete 19-case rerun used a NEW database, not the partially exercised
   first-run DB. No test was removed or marked flaky. Initial logs and both
   error contexts are preserved under logs/first-browser-failures/.
5. One ancillary SQL metadata shell command failed at PowerShell quoting before
   its metadata query ran. A file-based read-only query produced sql-migration.json;
   no data mutation or application fix was involved.

Warnings retained: Starlette/httpx TestClient deprecation; jsdom canvas diagnostics
in passing public-site tests; terminal color warnings and the existing Vite chunk
size warning where reported. No unrelated dependency upgrade was made.

## Independent SQL checkpoints (tenge in table; JSON uses integer tiyn)

| Checkpoint | Journal rows | Sales ₸ | Receipts ₸ | Debt ₸ |
|---|---:|---:|---:|---:|
| Clean business before workflow | 0 | 0 | 0 | 0 |
| Manual 3000/1000 | 1 | 3000 | 1000 | 2000 |
| Repayment 500 | 2 | 3000 | 1500 | 1500 |
| Reverse repayment | 3 | 3000 | 1000 | 2000 |
| Explicitly confirm offline 1200/1200 draft | 4 | 4200 | 2200 | 2000 |
| Separate Kazakh 3000/1000 confirmation test | 5 | 7200 | 3200 | 4000 |
| Separate 3400/3400 lost-response/same-key recovery | 6 | 10600 | 6600 | 4000 |

workflow-sql.json records the four-row main demo before later cases. The
response-loss-sql.json before/after snapshots show one extra row despite two
identical requests. final-sql.json records the final six-row ledger, seven
customers and one feedback record. sql-migration.json independently verifies
0009_research_feedback and consent=true. Research/assistant/layout/draft-only
checks compare the entire ledger hash before/after; no write is inferred from
HTTP 200 alone. All these records are synthetic and local.

The seeded-history fixture has 180 daily entries. The actual 30-day Research
response exposes 179 eligible complete days after excluding the first partial
day, required_days=144, chronological train/validation/test and 30 held-out
observations. The selected seasonal baseline has test MAE 18.6667 ₸ and RMSE
20.6074 ₸; ridge has 30.3637 ₸ and 32.3804 ₸ on this artificial series. See
research-30-response.json for unrounded values. This demonstrates functioning
selection/evaluation, not evidence that ML beats a baseline or merchant accuracy.

## Reproduction commands

Run on this branch with full Git history and locked dependencies. Use a fresh
checkout/output directory to preserve captured evidence. From repository root:

```powershell
uv sync --locked --project apps/api
Push-Location apps/web
npm.cmd ci --no-audit --no-fund
Pop-Location
$env:PYTHONUTF8='1'
$stage10PgBin=(Resolve-Path ../qadam-research-tools/pgsql/bin).Path
& "$stage10PgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_stage10_repro_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: test DB must be NEW EMPTY' }
$env:TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage10_repro_test'
$env:DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage10_unused'
Push-Location apps/api
.venv/Scripts/python.exe -m pytest -q --tb=short --basetemp ../../tmp/stage10-repro-pytest --junitxml=../../tmp/stage10-repro-backend.xml
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check .
.venv/Scripts/python.exe -m app.export_contracts --check
.venv/Scripts/python.exe -m tools.stage10_eval.evaluate --output ../../tmp/stage10-challenge-repro
.venv/Scripts/python.exe -m tools.stage9_eval.evaluate --output ../../tmp/stage10-stage9-repro
.venv/Scripts/python.exe tools/extraction_eval/evaluate.py --output ../../tmp/stage10-stage7-repro
.venv/Scripts/python.exe tools/diploma_eval/evaluate_stage1.py --output-dir ../../tmp/stage10-stage1-repro
Pop-Location
Push-Location apps/web
npm.cmd test -- --maxWorkers=1
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
Pop-Location
& "$stage10PgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_stage10_repro_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: browser DB must be NEW EMPTY' }
$env:RESEARCH_TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage10_repro_test'
Push-Location apps/web
npx.cmd playwright test -c e2e/final.playwright.config.ts
Pop-Location
git diff --check
```

Never point the pytest migration/truncation fixture at shared or merchant data.
Browser fixtures preserve completed and failed DBs. Live Supabase, external AI,
ASR, physical devices, staging migration/backup/restore and blind human labels
were **not run**. They remain separate gates in staging-readiness.md.
