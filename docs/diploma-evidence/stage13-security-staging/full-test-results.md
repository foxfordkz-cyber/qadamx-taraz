# Fresh Stage13 verification — 2026-10-26

All runs below execute from the Stage13 worktree, not inherited Stage12 results.
Tested input hashes: runs/verified-inputs.json. Production app, migrations, OpenAPI
and generated TypeScript remain byte-identical to the Stage12 baseline.
Runtime: Python3.12.14, PostgreSQL17.11, Node24.21.0, Vitest4.1.12,
Vite7.3.7 and installed Chrome. Offline AI and local signed-JWT fixtures only.

| Check | Actual result | Evidence |
|---|---|---|
| Backend full pytest | 782 passed / 0 failed / 0 skipped; 372.61 s | runs/backend.xml, backend.txt |
| PostgreSQL-marked tests | 211 passed, included in 782 | runs/postgres-collection.txt |
| New isolation guards | 12 passed, included in 782 | tests/test_stage13_staging.py |
| Ruff / Python formatting | both exit0 | runs/backend-static.json |
| OpenAPI/examples export check | exit0 | runs/api-contract.txt |
| Locked npm ci | exit0 | runs/npm-ci.txt |
| First full Vitest4 run | 638 passed / 1 failed / 0 skipped; 752.30 s | runs/frontend.xml, frontend.txt |
| Targeted failure diagnosis | all 6 WhatsApp component tests passed, unchanged | runs/frontend-targeted.xml, frontend-targeted.txt |
| Full serial Vitest4 confirmation | 639 passed / 0 failed / 0 skipped; 47 files, 558.85 s | runs/frontend-serial.xml, frontend-serial.txt |
| TypeScript / ESLint / Prettier / check:api / build | all exit0 | runs/web-*.txt and web-static.json |
| Exact config/deployment guard probes | 9 passed, no network | runs/config-probe.json |
| Full Chrome/API/PostgreSQL E2E | 19 passed / 0 failed / 0 skipped; 12.1 min; retries0 | runs/browser.xml, browser.txt |
| Seller Chrome/Demo E2E | 8 passed / 0 failed / 0 skipped; 1.7 min | runs/seller.xml, seller.txt |
| Migration/backup rehearsal | 21 checks pass in each of 2 fresh runs | runs/migration-a.json, migration-b.json |
| Persistent Stage13 demo read-only Chrome smoke | passed; no page errors/writes; SQL unchanged | runs/demo-smoke.json, demo-preservation.json |
| Final new-config lint/format + TypeScript recheck | exit0 | runs/final-config-*.txt, final-typecheck.txt |
| npm audit / npm audit --omit=dev | both zero findings, exit0 | runs/audit-after.json, audit-production-after.json |

## Failure retained and investigated

Initial failure: whatsapp-components.test.tsx, first RU case, waiting for heading
Асқар at line99. The one-second asynchronous lookup timed out (case duration
1.5555 s). There was no semantic mismatch in a displayed balance/link. Isolated
rerun passed all6 cases without source, assertion or timeout changes; failed RU
case then completed in0.667 s. The first full run overlapped static/build and later
browser activity; contention is plausible but not proven. The serial full run
above is the final compatibility gate. Both full results are retained. No test
was disabled, assertion loosened, timeout raised or failed case removed.

## Exact reproduction commands

From repository root, install locked dependencies in their own directories:
```powershell
Set-Location apps/web
npm ci
Set-Location ../api
uv sync --locked --python 3.12
```
On this Windows machine the available interpreter was supplied explicitly to uv:
`& ../qadam-diploma-integration/apps/api/.venv/Scripts/uv.exe sync --locked --python ../qadam-diploma-v1/apps/api/.venv/Scripts/python.exe --project apps/api`
from repository root using the installed uv executable. It resolved42/installed41
packages without modifying uv.lock. This uses a known Python runtime only, not
another checkout's site-packages.

Create a NEW local empty qadam_stage13_full_test-style database for EACH pytest
run. From apps/api (use fresh names if these already exist):
```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_stage13_full_new_test'
$env:DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_stage13_unused'
$env:PYTHONUTF8='1'
.\.venv\Scripts\python.exe -m pytest -q --tb=short --basetemp ../../tmp/stage13/full-new --junitxml=../../tmp/stage13/backend-new.xml
.\.venv\Scripts\python.exe -m pytest -m postgres --collect-only -q
.\.venv\Scripts\python.exe -m ruff check app tests scripts migrations tools
.\.venv\Scripts\python.exe -m ruff format --check app tests scripts migrations tools
.\.venv\Scripts\python.exe -m app.export_contracts --check
```
From apps/web:
```powershell
npm test -- --maxWorkers=1 --reporter=default --reporter=junit --outputFile=../../tmp/stage13/frontend-new.xml
npm run typecheck
npm run lint
npm run format:check
npm run check:api
npm run build
# Create NEW EMPTY qadam_research_browser_stage13_new_test before this command.
$env:RESEARCH_TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_research_browser_stage13_new_test'
$env:PYTHONUTF8='1'
npx playwright test -c e2e/staging.playwright.config.ts
npx playwright test -c e2e/staging-seller.playwright.config.ts
```
Run heavy suites sequentially on this machine. E2E19 config uses8333/4313 and
reuses no existing servers; Seller8 uses4175. Preserve reports before repeating,
as config artifact paths are fixed under tmp/stage13. Tests refuse nonempty DBs;
never reset an old database to make a rerun start. `createdb` must succeed first.

Logs in this folder are copies with checkout paths normalized to <repo> and EOF
whitespace normalized; ignored tmp/stage13 retains originals. The untracked
inspection helper initially assumed pruned old refs existed and then misread a
GitHub helper tuple; both read-only mistakes were corrected without mutating any
PR/ref. An initial console-only XML error print hit cp1251 for Kazakh text;
UTF-8 output fixed reporting, not tests. These are not hidden application failures.

The 19 browser cases verify actual UI and SQL effects, not HTTP200 alone:
customer creation; sale/partial payment/debt/repayment/reversal; AI confirmation;
Analytics; Research loading/error/retry/empty/7/30; feedback consent/save/reload;
account/business isolation; response-loss replay; RU/KZ360/390/768/1440 plus font/
keyboard stress. Live Supabase, live AI/ASR and physical devices remain untested.
