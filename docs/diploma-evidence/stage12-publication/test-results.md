# Stage 12 — fresh verification, 2026-10-26

The published application preserves Stage 11 `e94d9a71` / Stage 10 `e825dd9a`
production source. Tests below were actually executed in the new integration
worktree. Final documentation commits do not alter the tested product code;
artifact-manifest.json records the verified files. Historical reports are not
substituted for these runs. No live provider calls or shared database writes.

Environment: Windows, Python 3.12.14, Node 24.21.0, PostgreSQL 17.11 on loopback 55441,
installed Chrome, Playwright 1.64.1, Vitest 3.2.7. Locked installs were used.

| Check | Passed | Failed | Skipped | Evidence |
|---|---:|---:|---:|---|
| Full backend pytest | 770 | 0 | 0 | runs/backend.txt, backend.xml; 279.06 s |
| PostgreSQL-marked subset of full run | 211 | 0 | 0 | runs/postgres-collection.txt; included above, not additional |
| Full frontend unit/component | 639 | 0 | 0 | 47 files; runs/frontend.txt, frontend.xml; 358.45 s |
| Ruff check / Python format / API export check | 3 commands | 0 | 0 | runs/backend-static.json |
| TypeScript / ESLint / Prettier / check:api / build | 5 commands | 0 | 0 | runs/web-exits.json; Vite build 21.38 s |

## Actual browser/SQL acceptance

Full installed Chrome → real FastAPI → disposable PostgreSQL suite: **19 passed,
0 failed, 0 skipped**, 10.8 min, one worker, retries 0. Raw log/XML: runs/browser.txt
and runs/browser.xml. Named test files: diploma.acceptance.ts,
extraction.acceptance.ts, final.acceptance.ts and stage9.acceptance.ts.

Separate Seller Chrome/Demo suite: **8 passed, 0 failed, 0 skipped**, 57.0 s;
runs/seller.txt and runs/seller.xml. Covers protected routes, no backend writes in
Demo, RU/KZ navigation at 360/390/768/1440 px, customer/catalog behavior, reload,
search/filter and accessible menu. These synthetic UI cases do not replace real SQL.

Integrated coverage: login/account switch and business isolation; customer
creation; manual sale/partial receipt; debt; repayment/reversal; draft without money
writes and explicit confirmation; Analytics matching SQL; Research 7/30 and empty,
loading, error, retry; consented feedback/save/reload; RU/KZ at 360/390/768/1440 px
and 200% font; duplicate JSON fallback; ambiguous customer choice; unknown payment
stays empty. No test was disabled or retried to obtain the pass.

Independent SQL checkpoint after the main workflow: four operations, sales 4200 ₸,
receipts 2200 ₸, debt 2000 ₸, six customers and one feedback. Later scenarios add the
Kazakh 3000/1000 sale and 3400/3400 response-loss sale: final six operations,
sales 10600 ₸, receipts 6600 ₸, debt 4000 ₸, seven customers, one consented feedback.
final-sql.json and sql-migration.json independently verify these totals and
0009_research_feedback. workflow-sql.json retains the earlier checkpoint.

Response-loss evidence: two requests with identical key/body/operation ID produce
exactly one journal addition; customer recovery makes one POST, two lookups,
one added client and zero ledger changes. JSON contains only synthetic test IDs.

Research 30: 179 eligible full days, 144 required, 30 held-out observations.
Seasonal baseline selected; test MAE 18.6667 ₸ / RMSE 20.6074 ₸; ridge
30.3827 ₸ / 32.4034 ₸ on this artificial series. Exact values and splits are in
research-30-response.json. No merchant accuracy claim or claim that ML won.

Two fresh real automation screenshots: [Kazakh draft](screenshots/grounded-kazakh-1280.png)
and [Kazakh Research 360px](screenshots/research-sql-kk-360.png). They were visually
reviewed and contain synthetic records only. Full-page captures can retain the
sticky header's scroll position; they are QA evidence. All originals remain in
ignored tmp/stage12/browser/screenshots.


## Fresh deterministic evaluations

| Frozen corpus / comparison | Baseline full outcome | Improved/current | Remaining errors |
|---|---:|---:|---|
| Stage 1 paired semantic factual checks | See confusion matrix in eval-stage1/comparison_summary.json | TP18/TN24/FP0/FN0, 42/42 | None |
| Stage 7 100-case extraction | 71/100 | 99/100 | S7-090 |
| Stage 8 original frozen comparison | 75/120 | 104/120 | 16 original mismatches,12 introduced conservative regressions; raw cases retained |
| Stage 9 on the exposed Stage 8 corpus | 104/120 | 118/120 | S8-080,S8-084;14 improved, 0 new regressions |
| Stage 10 authored challenge | 42/42 | 42/42 | None; no new improvement claimed |

All evaluator commands returned 0. This means the evaluator ran, not that every
gold case matched. Error cases remain in the denominators/raw case files. These
are authored synthetic provider responses, not live LLM/ASR accuracy, independent
human annotation or merchant research. Stage 8 original replay read the unchanged
`08fd3eef` worktree with bytecode writing disabled; all output was written into
this Stage 12 worktree. Stage 9 paired replay tests the actual integrated pipeline.

## Recorded setup failures and warnings

- After publication, the running local demo also passed a separate read-only
  Chrome smoke: login, 7/30 Research, risk/empty mobile state and logout; no page
  errors or attempted financial writes. See runs/demo-smoke-final.json. The first
  attempt failed because a local copy of the existing Stage11 script was read
  using Windows default encoding, corrupting Cyrillic locator text. Explicit UTF-8
  fixed only that local copy; its next run passed. Both results are retained;
  neither the application nor the original tracked Stage11 tool was changed.
  The copied script's only intended change is its source label from actual
  ready.json. Hashes/method are in demo-smoke-r2-provenance.json. This extra smoke
  is separate from the 19+8 complete suites, not a physical/live test.

- Both browser suites passed, but the initial relative JUnit/test-result paths
  resolved to apps/tmp/stage12 rather than root tmp/stage12. A report-copy step
  therefore failed to find its XML. No test result was lost: originals remain in
  apps/tmp; the reports above are copied from those originals. The two new configs
  now use absolute paths derived from import.meta.url. Final list/config checks,
  lint and format verify that output-path-only correction; assertion/product code
  did not change. Full browser execution is not falsely claimed to be repeated
  after this reporter-only fix.


- First `uv sync --locked` tried to download a managed Python 3.12.15 and failed
  on a missing expected install directory (exit 2). Retried with existing
  Python 3.12.14 executable and the same lockfile: success. Both logs are retained.
- `npm ci` succeeded; `npm audit` failed with three development dependency
  findings (one moderate, two critical). See security-check.md. No silent upgrade.
- Starlette/httpx deprecation warning, expected jsdom canvas diagnostics in
  passing public UI tests, terminal color warning and Vite large-chunk warning
  remain visible. They are not counted as failed assertions.

## Reproduction

Use a fresh integration checkout to preserve existing evidence; install locked
dependencies and use NEW EMPTY local databases as described in
[development-workflow.md](development-workflow.md). Full backend/frontend/static
commands are listed there. To repeat evaluations, from apps/api:

```powershell
$env:PYTHONUTF8='1'
.venv/Scripts/python.exe tools/diploma_eval/evaluate_stage1.py --output-dir ../../tmp/repro-stage1
.venv/Scripts/python.exe tools/extraction_eval/evaluate.py --output ../../tmp/repro-stage7
.venv/Scripts/python.exe -m tools.stage9_eval.evaluate --output ../../tmp/repro-stage9
.venv/Scripts/python.exe -m tools.stage10_eval.evaluate --output ../../tmp/repro-stage10
```

For the original Stage 8 comparison, use a separate detached snapshot of the exact
historical source (the current stricter implementation intentionally fails that
evaluator's source guard). From the integration repository root:

```powershell
$stage12Python=(Resolve-Path apps/api/.venv/Scripts/python.exe).Path
$stage8Output=Join-Path (Get-Location) 'tmp/repro-stage8-original'
git worktree add --detach ../qadam-stage8-replay 08fd3eef541c6ab47f1d44e79d38778eefd2c784
Push-Location ../qadam-stage8-replay/apps/api
$env:PYTHONDONTWRITEBYTECODE='1'
& $stage12Python -B -m tools.stage8_eval.evaluate --output $stage8Output
Pop-Location
```

Browser suites, from the integration root (ports 8322/4303/4175 must be free):

```powershell
createdb -h 127.0.0.1 -p 55441 -U qadam_research qadam_research_browser_stage12_repro_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: use a NEW empty browser DB' }
$env:RESEARCH_TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_research_browser_stage12_repro_test'
Push-Location apps/web
npx.cmd playwright test -c e2e/publication.playwright.config.ts
npx.cmd playwright test -c e2e/publication-seller.playwright.config.ts
Pop-Location
```

The publication configs reuse existing assertions, disable traces, use one worker
and zero retries, and redirect new results into ignored tmp/stage12. Frozen
Stage 10 evidence is not overwritten. The seller suite is synthetic/Demo UI;
the integration suite uses real local React/FastAPI/PostgreSQL, synthetic JWTs and
offline AI. Neither is a physical-device or live-Supabase acceptance claim.
