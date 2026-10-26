# Reproduce Stage 7

Run from this worktree, not the Stage 6 demo or another contributor's checkout.
Prerequisites: Python 3.12, locked uv dependencies, Node/npm, installed Chrome and a
**dedicated disposable local PostgreSQL**. Original Git commit ae43dc2 must be available.
Do not point these commands at shared/production data. No provider key is required.

## Install and run the frozen comparison (repository root)

```powershell
uv sync --locked --project apps/api
Push-Location apps/web
npm ci --no-audit --no-fund
Pop-Location
Push-Location apps/api
.venv/Scripts/python.exe tools/extraction_eval/evaluate.py --output ../../tmp/stage7-reproduction
Pop-Location
```

Compare metric objects and per-case results with committed `comparison/`.
HEAD metadata may differ on a later docs-only commit; source hashes must match.
The runner checks both frozen LF-normalized hashes and the original Git source.
Do not regenerate or relabel the dataset.

## Backend and contract checks

The original run used PostgreSQL 17.11 on 127.0.0.1:55439, a local fixture role
`qadam_research`, and a new empty `qadam_stage7_backend_test` database.
For reproduction, create another empty test database; do not drop an existing database
to reuse its name. `DATABASE_URL` is a different unused local target so the fixture can
verify isolation. The PostgreSQL executable path below describes this Windows workspace;
on another host use its local client installation and a dedicated test role.

```powershell
# From repository root; local PG server must already be running.
$pgBin = (Resolve-Path ../qadam-research-tools/pgsql/bin).Path
& "$pgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_stage7_repro_test
$env:TEST_DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage7_repro_test'
$env:DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage7_unused'
Push-Location apps/api
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check app/services/ai.py app/services/extraction_grounding.py tests/test_ai.py tests/test_extraction_grounding.py tests/test_extraction_postgres.py tests/extraction_browser_server.py tools/extraction_eval
.venv/Scripts/python.exe -m app.export_contracts --check
.venv/Scripts/python.exe -m pytest -q --tb=short
Pop-Location
```

The existing PostgreSQL fixture applies/checks migrations in the isolated target,
truncates its test tables between cases and downgrades at teardown.
Never run it against real data. The frozen original snapshot is not reformatted.

## Frontend checks

```powershell
Push-Location apps/web
npm run check:api
npm run typecheck
npm run lint
npm run format:check
npm run build
npm test -- src/test/voice.test.tsx src/test/voice-adaptation.test.tsx src/test/ledger.test.tsx src/test/assistant.test.tsx src/test/research-data.test.tsx src/test/research-feedback.test.tsx --maxWorkers=1
Pop-Location
```

## Browser → API → PostgreSQL

```powershell
# Repository root; another NEW EMPTY database, separate from the backend suite.
& "$pgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_stage7_repro_test
$env:RESEARCH_TEST_DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage7_repro_test'
Push-Location apps/web
npx playwright test -c e2e/extraction.playwright.config.ts
Pop-Location
```

Playwright starts API 8317 and Vite 4299, refuses existing servers, uses Chrome and
blocks browser requests outside loopback. The fixture refuses nonempty/non-loopback/
non-test database names. It uses production routes, SQL, JWT signature validation and
membership checks, with an ephemeral local identity issuer; **not Supabase live acceptance**.
The provider is a frozen response double; its phrase lookup exists only in a test file.

The suite captures desktop and mobile-emulation screenshots and checks SQL deltas.
No microphone, ASR, paid AI request or real merchant transaction is used.
Ports 8316/4297 belong to the earlier Stage 6 demo and are not touched.

Use the same command with `--headed` to observe the three scenarios locally.
Screenshots illustrate tested application behavior, not live provider performance.
Do not deploy either browser fixture entry point.
