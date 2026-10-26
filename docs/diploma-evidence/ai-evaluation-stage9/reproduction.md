# Reproduce Stage 9

Use a separate checkout of `feature/diploma-stage9-extraction-hardening` with
the full Git history including baseline `08fd3eef541c6ab47f1d44e79d38778eefd2c784`.
Do not switch/reset someone else's working tree. The tested machine used Windows,
Python 3.12.14, Node 24.21.0, Chrome 156.0.8078.47 and PostgreSQL 17.11.

## Install and evaluate (repository root)

```powershell
uv sync --locked --project apps/api
Push-Location apps/web
npm.cmd ci --no-audit --no-fund
Pop-Location
$env:PYTHONUTF8 = '1'
Push-Location apps/api
.venv/Scripts/python.exe -m tools.stage9_eval.evaluate --output ../../tmp/stage9-repro
.venv/Scripts/python.exe tools/extraction_eval/evaluate.py --output ../../tmp/stage9-stage7-repro
.venv/Scripts/python.exe tools/diploma_eval/evaluate_stage1.py --output-dir ../../tmp/stage9-stage1-repro
Pop-Location
```

Use NEW output directories. Compare raw cases and metric objects with
`results-final`; a later docs-only commit changes execution_commit, not source
hashes. The frozen Stage 8 evaluator is deliberately not relabeled to accept
Stage 9 as Stage 7: use the Stage 9 command, which reproduces the saved baseline.
Stage 1's `--verify-original` is not appropriate to the integrated implementation.

## Dedicated local PostgreSQL only

The following local server and role are examples from this worktree's verified
test installation, not credentials/configuration for a shared database. Use an
authorized disposable loopback server. Tests migrate/truncate/downgrade their own
test DB. Never run them against merchant or shared data.

```powershell
# From repository root, existing dedicated loopback PostgreSQL installation:
$stage9PgBin = (Resolve-Path ../qadam-research-tools/pgsql/bin).Path
& "$stage9PgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_stage9_repro_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: test DB was not newly created' }
$env:TEST_DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage9_repro_test'
$env:DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage9_unused'
Push-Location apps/api
.venv/Scripts/python.exe -m pytest -q --tb=short --basetemp ../../tmp/stage9-repro-pytest --junitxml=../../tmp/stage9-repro-backend.xml
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check app/services/ai.py app/services/openai_provider.py app/services/strict_json.py app/services/extraction_grounding.py tools/stage9_eval tools/stage8_eval/live.py tests/test_stage9_extraction.py tests/test_stage9_evaluation.py tests/test_stage9_postgres.py tests/stage9_browser_server.py tests/test_stage8_evaluation.py tests/test_stage8_live_tool.py
.venv/Scripts/python.exe -m app.export_contracts --check
Pop-Location
```

Missing TEST_DATABASE_URL causes skipped SQL coverage, not an equivalent full pass.
The basetemp is a dedicated disposable pytest folder, never an evidence directory.

## Frontend and browser acceptance

Run heavy suites sequentially to avoid resource-related timeouts.

```powershell
Push-Location apps/web
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd test -- --maxWorkers=1
Pop-Location

& "$stage9PgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_stage9_repro_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: browser DB was not newly created' }
$env:RESEARCH_TEST_DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage9_repro_test'
Push-Location apps/web
npx.cmd playwright test -c e2e/stage9.playwright.config.ts
Pop-Location
```

Browser API 8321 and Vite 4302 must be free; reuseExistingServer=false.
Use `--headed` to observe. Eight scenarios use installed Chrome, one worker,
no retries, local signed JWTs, genuine API/SQL and explicitly synthetic providers.
Non-loopback browser requests are blocked. This is neither live Supabase nor live AI.
The fixture refuses nonempty/non-test/non-loopback databases. Do not drop prior
databases to force reuse. A new run writes Stage 9 screenshots and SQL snapshots,
so reproduce in a separate checkout to preserve published artifacts.

A failed inherited whole-workflow run must be rerun with a fresh browser DB because
it saves synthetic financial operations. Do not reuse partially completed fixtures.

## Dry live preparation

```powershell
Push-Location apps/api
.venv/Scripts/python.exe -m tools.stage9_eval.live --manifest ../../docs/diploma-evidence/ai-evaluation-stage9/live-manifest.template.json --output ../../tmp/stage9-dry-repro
Pop-Location
git diff --check
git status --short
```

No `--execute` in this stage. See [live gates](live-ai-readiness.md).
No provider key is needed for any offline command above.
