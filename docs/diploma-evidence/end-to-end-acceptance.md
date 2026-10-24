# Research end-to-end acceptance — 2026-10-24 follow-up

**Later update:** [Research stabilization](stabilization-20261024.md) implements
authorized tab-local business restoration and in-memory feedback recovery across
internal navigation, with reload/logout warnings. The old reload/draft limitations
below describe the earlier tested commit; consult the stabilization report for the
current behavior and its remaining browser/crash limitations.

Branch `feature/ml-sales-debt-research`, [Draft PR #100](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/100).
Start HEAD `29da9620b909f354d1680d8db3730a1dcca45f2e`, equal to remote after fetch/pull.
Base main remained `2518b2e80b8c8ef881063a968645382d61aeb37e`. No other branch was merged.
This report supplements the earlier test report; it does not replace its historical failures.

## What was actually connected

| Environment | Auth | API / storage | Result and boundary |
|---|---|---|---|
| Automated browser, localhost:4297 | Local ES256 test issuer through the existing verifier and Supabase SDK | Actual FastAPI on :8316 and PostgreSQL 17.11 on loopback:55439, migrated 0001–0009 | All 3 browser integration cases passed. No mocked research responses. Ledger fixtures are synthetic |
| Interactive browser, localhost:4298 | **Actual Supabase login** with the user-provided teaching account; JWT verified by backend | Actual API 0.8.0 on :8320; separate local `qadam_research_browser_20261024_manual_test` | 7/30 forecasts, explained debt, consented test feedback, SQL persistence, reload/private review, empty business and RU/KZ inspected in browser |
| Existing hosted Render API | No login or write performed here | Public OpenAPI reports **0.7.2**, no `/research/` paths | Health responded after initial 40s cold-start timeout; cannot serve this feature without separately approved rollout |
| Vercel branch Preview | Redirects to **Vercel login**, before Qadam | [Preview URL](https://qadamx-taraz-git-feature-ml-sales-debt-research-p-it-chers.vercel.app/seller/research) | Blocked by access protection. Internal settings not inspectable without an owner session; no bypass, login or protection change attempted |

The interactive run initially used a local observation wrapper to record only the
verified subject for assigning **local synthetic memberships**. A preflight bug in
that temporary observer was corrected. The wrapper was then removed from execution:
the final API runs the unchanged entry point `uvicorn app.main:app`. Its OpenAPI
contains research routes and **no fixture `/auth/v1/token` route**. Existing Auth
and financial application code were not modified. Credentials/tokens are not in Git.

These are not the real records of the account's production business. The local
teaching point is named `QA PostgreSQL · синтетическая история`; all fixture
businesses are `is_demo=true` and labelled QA. Calculations are computed from the
local journal, not copied from `research-examples.json`. No eligible real merchant
history has been supplied/imported, and no scientific model-performance claim follows.

## Scenarios and data correctness

- Browser login → actual `/me` → permitted point → SQL daily aggregation → 7/30
  forecast → visible chart, dates and MAE/RMSE. The fixture has 180 sales on completed
  days; excluding the initial partial day leaves **179 observations**. Test asserts
  sum of history against independent SQL and chronological split ordering.
- Both test horizons display the measured winner; in this fixture the baseline
  beat ridge. No assumption that ML must win. Empty point displays 0/98 (or 0/144)
  days, no chart or evaluation metrics. Business switch clears previous output.
- A delayed actual response displays loading. A deliberately aborted connection
  displays error, no Demo substitute; explicit retry fetches real API data.
- Debt facts: 50,000 tiyn original credit minus 10,000 later repayment gives
  **40,000 tiyn / 400 ₸**. The UI shows the age, factors and rules-v1 score70;
  the new link opens that customer's existing open-sale list with the same balance.
  No reminders, charges, repayment or ledger actions are triggered by the score.
- Feedback without consent is rejected in UI and by server422. After an actual
  committed POST, the browser test drops the response; UI retains the intent.
  Double-click creates one request; explicit replay uses the same key and body.
  Independent SQL finds **one row**, consent=true; changed payload with that key
  gets409. Reload/reselect original point/private review retrieves the saved text.
- Owner B cannot read A's feedback or research data (404); absent/tampered JWTs
  get401. No-store is checked. Automated before/after SQL verifies unchanged
  journal count/sales/receipts. The automated A/B identities are test issuers,
  not a claim of testing two real Supabase users.
- The interactive real-Supabase session saved one clearly marked technical test
  response, not a participant's survey. Its receipt matched SQL, consent=true and
  the same text was visible after reload. No real customer data was collected.

The existing BusinessProvider keeps selected point in memory: reload chooses the
first permitted business. **Reselect the original point** before reviewing its
responses. This existing behavior was not changed. Unsaved feedback fields/intent
are in-memory; after a reload, review saved responses before starting a new answer.

## Checks performed in this follow-up

| Command / working directory | Actual result |
|---|---|
| `pytest -q tests/test_forecasting.py tests/test_debt_risk.py tests/test_research_api.py tests/test_research_feedback.py --tb=short` — apps/api, dedicated empty TEST_DATABASE_URL | **47 passed**, 21.71s; real PostgreSQL, migrations/constraints/isolation |
| `ruff check app tests`; `ruff format --check app tests`; `python -m app.export_contracts --check` — apps/api | Passed; 72 files formatted; existing contract unchanged |
| `npm test -- --maxWorkers=1 src/test/research-data.test.tsx src/test/research-feedback.test.tsx` — apps/web | **17 passed** |
| `npm test -- --maxWorkers=1` — apps/web | **627 passed**, 46 files, 191.30s |
| `npm run test:e2e -- --reporter=list` — apps/web | **44/44 passed**, 2.8min, one complete run |
| `npx playwright test -c e2e/research.playwright.config.ts --reporter=list` — apps/web | **6/6 passed**, 26.5s; explicit Demo / mocked transport, distinct from SQL suite |
| `npx playwright test -c e2e/research-postgres.playwright.config.ts --reporter=list` — apps/web | **3/3 passed**, 58.5s; actual HTTP + SQL |
| `npm run check:api`, `typecheck`, `lint`, `format:check`, `build` — apps/web | All passed |
| `git diff --check` | Passed before publication |

Earlier integration-harness attempts are not called passing: Windows executable
quoting prevented startup; SQL SUM returned Decimal until the fixture verifier
used bigint; reload selected a different permitted point until the test explicitly
reselected the original. Final whole SQL suite passed after these test fixes.
Existing build chunk-size, Starlette/httpx and NO_COLOR warnings remain.
Raw logs are local/ignored under `tmp/research-e2e-followup/`.

## Minimal production changes and evidence

Only `ResearchPage.tsx` and its RU/KZ dictionary changed in application code:
fractional-tiyn MAE/RMSE are no longer rounded to an integer tiyn (e.g. 0.25 tiyn
displays 0.0025 ₸ instead of zero); risk adds a read-only existing customer-sales
link and explanation. Regression unit tests cover both. Backend application code,
financial ledger, Auth, migrations, OpenAPI/generated.ts and production settings
are unchanged in this follow-up.

- [Interactive real Supabase → local API screenshot](screenshots/real-supabase-local-research.jpg).
- [Automated actual SQL forecast/risk](screenshots/postgres-research-ru.png).
- [Automated persisted feedback after reload](screenshots/postgres-feedback-persisted.png).
- The four earlier Demo screenshots were regenerated for corrected metric formatting.

## Reproduce the isolated HTTP/SQL suite

Use a **new empty local DB** named `qadam_research_browser_<run>_test`; the fixture
refuses non-loopback hosts, other names and nonempty schemas. It never resets an
existing database. It applies migration0009 and leaves its disposable data for SQL
inspection. Do not point it at shared DBs. No external Auth or paid AI is used.

Example on this workstation, from the worktree root (PostgreSQL already running):
```powershell
& ../qadam-research-tools/pgsql/bin/createdb.exe -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_next_test
$env:RESEARCH_TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_next_test'
cd apps/web
npx.cmd playwright test -c e2e/research-postgres.playwright.config.ts --reporter=list
```
Use a fresh name on the next run. Other workstations supply their own Python venv,
Chrome and PostgreSQL; dependencies remain from the existing lockfiles. Test login
fixtures are only for localhost:4297, never enter a real password there.

## Browser handoff: actual Supabase with isolated local SQL

The interactive instance is left at http://127.0.0.1:4298/seller/research.
Local ignored `apps/api/.env` and `apps/web/.env.local` point exclusively at the
isolated database/API and the already supplied public Supabase project config.
No password, JWT or database secret was saved in those files. Verified membership
exists only in this local teaching DB; shared memberships were not edited.

If these local servers have stopped, use two terminals (do not start duplicates):
```powershell
# terminal 1, apps/api; existing local database, NO migration command needed
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8320
# terminal 2, apps/web
npm.cmd run dev -- --port 4298 --strictPort
```
The local PostgreSQL cluster is `../qadam-research-tools/pgdata-test` from the
worktree root, port55439; it is separate from Supabase storage. If stopped, start
it with the corresponding pg_ctl and loopback binding before the API.

Personally check: login → QA history point → 7/30 → metric comparison → risk/open
sales → review the technical response → choose empty point → RU/KZ. On reload,
reselect the intended point. Do not treat these synthetic journal records or the
technical questionnaire as real business/research results. Real merchant evaluation,
shared migration rollout, private Preview access and production acceptance remain
pending separate authorization/data. No merge or production deployment performed.
