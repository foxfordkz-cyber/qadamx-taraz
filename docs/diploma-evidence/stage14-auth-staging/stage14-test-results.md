# Fresh Stage14 verification

2026-10-27, a42c72d7 plus Stage14 files recorded in commit. Python3.12.14,
PostgreSQL17.11, Node24.21.0, Vitest4.1.12; Chrome version in browser JSON.
No paid providers or real Supabase used.

| Execution | Actual result |
|---|---|
| Initial backend focused |108 passed,1 skipped (diagnostic HTTP case needed PG) |
| New readiness final |48 passed,0 skipped |
| PG drafts/ledger/feedback/diagnostics |61 passed,0 skipped; includes previously skipped case |
| Frontend Auth/callback/generation |76 passed in5 files,0 skipped |
| Frozen offline packet |14/14; not live model accuracy |
| Migration0009/restore |21/21,12.562s, new local cluster |
| npm ci / uv sync --locked |exit0 |
| npm run build (includes tsc -b) |exit0,62.70s command wall time |
| Local bundle scan |7 text assets,0 canary/fixture hits,0 source maps |
| npm audit --json |0 vulnerabilities |
| Ruff check/format, API export, web check:api, new JSON Prettier |exit0 |
| Unauthenticated preview |2 paths redirect to Vercel login; application acceptance BLOCKED |
| Previous full E2E suites |NOT RERUN; product runtime unchanged |

Counts overlap; do not sum them into a unique-test total. Initial new readiness
run after adding a network sentinel:45 passed/1 failed, because Windows asyncio
creates an internal loopback socketpair. Corrected guard permits that IPC, denies
external connects and every HTTP send;47/47. A final port-zero rejection and
stronger isolated DB assertions then passed48/48. Original log retained. No
application assertion/timeout weakened. Initial Ruff formatting corrected.
Starlette/httpx deprecation and Vite chunk warning retained.

Historical Stage13, NOT fresh Stage14:782 backend,639 frontend,19 Chrome/API/SQL,
8 Seller/Demo, two21-check rehearsals. Its initial638/639 timeout, targeted6/6 and
full639/639 remain recorded; no claim of a clean first run.

From apps/api after locked dependency installation:

```powershell
uv run ruff check tools/stage14_readiness tests/test_stage14_readiness.py
uv run ruff format --check tools/stage14_readiness tests/test_stage14_readiness.py
uv run python -m app.export_contracts --check
uv run pytest tests/test_stage14_readiness.py -q
uv run pytest tests/test_auth.py tests/test_ai.py tests/test_ai_diagnostics.py tests/test_stage13_staging.py -q
uv run python -m tools.stage14_readiness.evaluate_offline --output ../../tmp/stage14-offline.json
```

PG: create NEW empty *_test database on loopback; TEST_DATABASE_URL points there,
DATABASE_URL is a different unused local database. Then pytest test_drafts.py,
test_research_feedback.py, test_ledger.py, test_ai_diagnostics.py under tests/.
Fixture downgrades its own test schema. Never use shared credentials.

Rehearsal: `uv run python -m tools.stage11_release.rehearsal --run-id <NEW_ID> --port <LOCAL_PORT> --pg-bin <PG_BIN> --output ../../tmp/<NEW_OUTPUT>`.
Actual Stage14 port55442/runID s14_20261027; never reuse existing targets/output.

From apps/web: npm ci; npm run check:api; npm run build; npm audit --json.
Auth: `npm test -- src/test/auth.test.tsx src/test/qa-auth-regression.test.tsx src/test/auth-callback.test.tsx src/test/auth-callback-config.test.ts src/test/auth-onboarding-readiness.test.tsx --maxWorkers=1`.
Build used synthetic public settings and fake server canaries, no .env copied.
Raw sanitized results in runs/; database dumps stay local.
