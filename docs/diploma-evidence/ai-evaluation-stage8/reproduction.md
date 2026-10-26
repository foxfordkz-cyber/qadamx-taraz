# Reproduction — Stage 8 isolated worktree

Source: feature/diploma-stage8-ai-evaluation. Evaluator/test commit
92aba501844d777fd7a2175b8a7e72a82ffb09bf; dataset freeze 071ae3e;
original source ae43dc2 and improved b84b4c7 must remain in Git history.
Run in a separate checkout of this branch; never switch or reset another contributor's
working tree. No network provider key is required for offline checks.

Windows environment used: Python 3.12.14, uv locked dependencies, Node 24.21.0,
installed Chrome 156.0.8078.47, PostgreSQL 17.11. This worktree used a dedicated
loopback server at 127.0.0.1:55439 and test role qadam_research.
Use your own authorized disposable local PostgreSQL installation on another machine.

## Install and run frozen comparisons

From the Stage 8 repository root:

```powershell
uv sync --locked --project apps/api
Push-Location apps/web
npm.cmd ci --no-audit --no-fund
Pop-Location
Push-Location apps/api
.venv/Scripts/python.exe -m tools.stage8_eval.evaluate --output ../../tmp/stage8-reproduction
.venv/Scripts/python.exe tools/extraction_eval/evaluate.py --output ../../tmp/stage7-reproduction
.venv/Scripts/python.exe tools/diploma_eval/evaluate_stage1.py --output-dir ../../tmp/stage1-reproduction
Pop-Location
```

Use fresh output directories; do not overwrite committed evidence. Compare metric
objects and case JSON with results-replay. execution_commit changes on a docs-only
commit; implementation hashes must still match. Do not invoke Stage 1 --verify-original:
that option is only for the pre-implementation baseline stage.

Stage 8 verifies LF-normalized frozen hashes and exact runtime source hashes.
Never regenerate/relabel its gold after seeing outcomes. Stage 1 and Stage 7 frozen
files remain unchanged.

## Dedicated PostgreSQL and full backend

These tests migrate, truncate and downgrade their own database. Confirm host,
database name and ownership before running; never reuse a shared database or erase
one merely because its name already exists. Browser and pytest require different DBs.

```powershell
# Repository root; existing dedicated local server, not production.
$stage8PgBin = (Resolve-Path ../qadam-research-tools/pgsql/bin).Path
& "$stage8PgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_stage8_repro_test
# STOP if createdb fails; use a new approved empty name.
$env:TEST_DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage8_repro_test'
$env:DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage8_unused'
Push-Location apps/api
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check tools/stage8_eval tests/test_stage8_evaluation.py tests/test_stage8_live_tool.py tests/stage8_browser_server.py
.venv/Scripts/python.exe -m app.export_contracts --check
.venv/Scripts/python.exe -m pytest -q --tb=short --basetemp ../../tmp/stage8/repro-pytest --junitxml=../../tmp/stage8/repro-backend.xml
Pop-Location
```

The worktree-local basetemp avoids the observed Windows user TEMP denial. It must
be a dedicated test directory (pytest manages its contents), never an evidence folder.
Missing TEST_DATABASE_URL causes PostgreSQL skips; such a run is not the full result.

## Frontend and real local browser/API/SQL

```powershell
Push-Location apps/web
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd test -- --maxWorkers=1
Pop-Location

# Root: create another NEW EMPTY local database.
& "$stage8PgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_stage8_repro_test
# STOP if creation fails; do not drop/reuse an existing DB.
$env:RESEARCH_TEST_DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage8_repro_test'
Push-Location apps/web
npx.cmd playwright test -c e2e/stage8.playwright.config.ts
Pop-Location
```

The fixture rejects non-loopback, non-test and nonempty DBs, and existing servers.
It starts API 8320 and Vite 4301, uses Chrome, one worker, no retries and blocks
non-loopback browser requests. JWT verification and membership checks are real;
the issuer and AI responses are local test fixtures, not production Supabase/providers.
The six scenarios cover the acceptance matrix in integration-test-report.md.

Use --headed to watch. Test artifacts overwrite the Stage 8 screenshots/snapshots
in the current checkout; use a separate reproduction worktree to retain original
evidence. Do not deploy tests/stage8_browser_server.py. Existing Stage 6 demo
ports 8316/4297 are not touched.

## Live plan only

```powershell
Push-Location apps/api
.venv/Scripts/python.exe -m tools.stage8_eval.live --manifest ../../docs/diploma-evidence/ai-evaluation-stage8/live-manifest.template.json --output ../../tmp/stage8-dry-reproduction
Pop-Location
git diff --check
git status --short
```

This is dry and makes zero paid calls. Execution requires separate approval;
see live-ai-readiness.md. No ASR score is produced without actual consented audio.
