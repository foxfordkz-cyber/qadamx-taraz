# Configuration and operating gates

Use [configuration/.env.example](configuration/.env.example) as an inventory,
not as a ready deployment. Its variable names come from app/config.py and the
existing frontend configuration. Empty values are intentionally not usable secrets.

| Variables | Scope / validation |
|---|---|
| DATABASE_URL | Server secret; NEW approved staging PostgreSQL only; separate application role |
| TEST_DATABASE_URL | Local disposable empty *_test only; never staging/shared data; tests truncate/drop their schema |
| SUPABASE_URL, JWT_ISSUER, JWT_AUDIENCE | Server; exact HTTPS project, issuer = project/auth/v1, audience approved with owner |
| ALLOWED_ORIGINS | Server JSON array of exact origins; no wildcard/path; same staging origin as browser |
| AI_PROVIDER, AI_MODEL, OPENAI_MODEL, OPENAI_TRANSCRIPTION_MODEL | Server provider/model selection; exact approved accessible model required before live tests |
| AI_API_KEY, OPENAI_API_KEY | Server secrets; blank in this stage; never VITE_ |
| AI_FALLBACK_OPENAI, AI_PRIMARY_TIMEOUT_SECONDS | Existing fallback flag false; primary timeout 8 s; live fallback requires explicit call/budget accounting |
| ASSISTANT_ENABLED, ASSISTANT_DAILY_LIMIT | Server assistant off; daily user limit 20 is not a global cost cap |
| LIVESTOCK_DEMO_MODE | true for educational records; do not count as real market observations |
| STORAGE_SERVICE_KEY, STORAGE_BUCKET | Server-only private storage; unused for this rehearsal |
| DEMO_OWNER_A/B_SUB and DEMO_OWNER_A/B_TOKEN | Only explicit approved test ownership binding; short-lived server-side tokens; no real accounts in Git |
| VITE_API_BASE_URL | Public HTTPS API URL ending /api/v1 for hosted build; loopback for the local fixture |
| VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY | Public config of SAME separately approved test project; never service_role |
| VITE_CUSTOMER_IDS_ENABLED | true with the integrated idempotent customer API |
| VITE_ASSISTANT_ENABLED | false for hosted preparation until backend+budget accepted; true only for offline local fixture |

No invented Research, global AI kill-switch or budget variable was added. Missing
provider keys and models prevent live AI setup; do not mistake this for a complete
egress policy. Hosted staging should use outbound controls and secret-store access
policy. There is no approved new callback: current frontend pins the Pages callback
and denies registration on arbitrary production origins. Do not bypass this guard,
reuse production credentials or add wildcard redirects. Login/session acceptance on
a separate test project and registration/callback approval are independent gates.

## Local startup (from repository root, PowerShell)

Prerequisites: Node 24, Python 3.12, installed Chrome, PostgreSQL client tools, a
dedicated local QA cluster. No .env files in apps/api or apps/web (examples allowed).

```powershell
Set-Location apps/web
npm ci
Set-Location ../api
uv sync --locked --python 3.12
Set-Location ../..
# Substitute installed PostgreSQL binary directory; use a NEW unused DB name.
createdb -h 127.0.0.1 -p 55441 -U qadam_research qadam_research_browser_stage13_demo_new_test
if ($LASTEXITCODE -ne 0) { throw 'Database must be newly created' }
Set-Location apps/api
.\.venv\Scripts\python.exe -m tools.stage13_staging.demo --database-url 'postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_research_browser_stage13_demo_new_test' --output ../../tmp/stage13-demo-new
```

Open http://127.0.0.1:4313/login. Fixture accounts: a@research.example.test and
b@research.example.test, password synthetic-local-only. These are local fixtures,
not Supabase credentials. Source SHA/owned PIDs/DB are written to ready.json.
Use Ctrl+C in that launch terminal to stop only its children. SQL is retained.
Never kill an occupied port. Re-run requires a new output directory and new empty
database; use --api-port/--web-port for other distinct ports. 8322/4303 are reserved
to preserve Stage12. The launcher rejects .env files and strips inherited provider
credentials and VITE settings. The fixture refuses a nonempty or remote database.

## Approved hosted staging procedure (not executed)

1. Owner approves isolated DB/server, hostname, certificate, costs, test Auth project
   and roles. Bind only synthetic test memberships; use no shared customer export.
2. Provision with owner-approved tooling; store DATABASE_URL/keys outside Git and
   frontend. Back up and record schema/version before migrations.
3. From apps/api in the dedicated staging environment, inspect `alembic current`
   and `alembic heads`. Follow repository linear history 0001 through
   0008_canonical_markets then 0009_research_feedback; run `alembic check`.
   Only execute after DB owner approves the exact target and backup.
4. Run `uvicorn app.main:app` behind the approved HTTPS proxy (never fixture
   entrypoints). Build normal frontend with approved public config. No deployment
   was initiated by this task. `build:hosted` does not resolve the callback gate.
5. `/health` or `/api/v1/health` is liveness, not proof of DB/Auth/provider health.
   Readiness requires SELECT 1 + expected alembic revision, `/me` using a test
   account, business membership allow/deny checks, read-only summary/research,
   and exact CORS. Only then authorized synthetic writes and feedback replay.
6. After schema/API mismatch or failed integrity check: stop new traffic/writes,
   preserve logs/DB, roll application to prior compatible artifact. Restore the
   backup into a NEW database and verify hashes/counts/balances before switching.
   Never downgrade 0009 in place as an ordinary rollback: it deletes feedback.

Restrict local dumps/QA credentials to the operator; do not commit dumps, JWTs,
browser auth states or raw customer responses. Hosted retention, backup encryption,
restore privileges, secret rotation and deletion ownership require review.
