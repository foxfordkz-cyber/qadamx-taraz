# Continue development from one published base

Recommended base for the next diploma task: `origin/integration/qadam-diploma-v1`.
It is a review candidate, not a production release. Do not restart from a stale
local worktree or re-merge Stages 6–9. Preserve original contributors and commits.

```powershell
git status --short
git fetch origin --prune
git log -1 --format=fuller origin/integration/qadam-diploma-v1
git worktree add -b feature/<approved-task> ../qadam-<approved-task> origin/integration/qadam-diploma-v1
cd ../qadam-<approved-task>
```

Use `feature/…`, `fix/…`, `test/…`, or `docs/…` for the actual scope. Check
AGENTS.md, CONTRACTS, handoffs, base/head SHA and PR status every time. Do not
change another worktree. For an already published own branch, fetch then
`git pull --ff-only origin <own-branch>`; stop on divergence and review it.

## Locked local setup

Requirements: Python 3.12, uv, Node 22.12+ or 24, npm, installed Chrome, PostgreSQL
17 or another supported PostgreSQL installation. Stage 12 used Python 3.12.14,
Node 24.21.0 and PostgreSQL 17.11 on Windows. No production credentials are needed.

```powershell
uv sync --locked --project apps/api --python 3.12
Push-Location apps/web
npm.cmd ci
Pop-Location
```

If uv cannot install its managed Python, select an existing Python 3.12 executable
with `--python <absolute-python-path>`; do not change the lockfile to hide a setup
failure. Initial Stage 12 managed-download failure is recorded in test-results.md.

For the complete offline application use [local-demo-guide.md](local-demo-guide.md).
It starts backend and frontend together with loopback local Auth and labelled
synthetic SQL. Do not deploy this fixture. A real-backend developer instead supplies
their own ignored apps/api/.env from the template, approved dedicated database
and Auth configuration, then runs `uv run uvicorn app.main:app --host 127.0.0.1
--port 8000` from apps/api. Frontend uses its own ignored .env.local/template and
`npm run dev`. Never copy a teammate's tokens or real customer records.

## Disposable PostgreSQL tests

Create a NEW EMPTY database on a dedicated loopback PostgreSQL server. The example
uses the Stage 12 local role/port, not shared-server configuration. Change these
only to your own approved local installation. Refuse to reuse an existing DB.

```powershell
createdb -h 127.0.0.1 -p 55441 -U qadam_research qadam_stage12_repro_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: use a new empty test database' }
$env:PYTHONUTF8='1'
$env:TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_stage12_repro_test'
$env:DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_unused'
Push-Location apps/api
.venv/Scripts/python.exe -m pytest -q --tb=short --basetemp ../../tmp/stage12-repro-pytest --junitxml=../../tmp/stage12-repro-backend.xml
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check .
.venv/Scripts/python.exe -m app.export_contracts --check
Pop-Location
Push-Location apps/web
npm.cmd test -- --maxWorkers=1
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
Pop-Location
```

On Unix replace `.venv/Scripts` with `.venv/bin`. The pytest fixture migrates,
truncates and downgrades ONLY its empty test DB. Missing TEST_DATABASE_URL means
SQL tests are skipped, not successful. Keep failures and denominators in reports.
Browser reproduction is in [test-results.md](test-results.md).

## Publication and rollback

Run appropriate checks; stage explicit own paths; inspect `git diff --cached` and
secrets; commit. Fetch again, compare base and branch heads, use ff-only only when
applicable, then non-force push to the own branch. Verify remote SHA; open/update
one Draft PR and role handoff. Review CI/Preview separately from live acceptance.
Do not merge or deploy without authorization. No paid AI requests in offline QA.

For an approved release, retain the exact last known good application artifact and
database backup. Rollback normally restores application configuration/artifact,
with schema compatibility reviewed first. Migration 0009 downgrade drops feedback:
it is NOT a lossless rollback. Stage 11 demonstrated downgrade only on a restored
disposable copy. Shared migration, backup/restore and deploy need their own plan.
