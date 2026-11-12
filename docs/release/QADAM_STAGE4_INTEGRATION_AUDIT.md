# Stage 4 — independent integration audit

12.11.2026. Branch `review/qadam-stage4-integration`, based on the verified
Stage 3 commit `6898faa55a8c9be2c4241da7816b849d311402aa`.
No production deployment, hosted migration, paid AI request or merge was performed.
This report separates local evidence from hosted release acceptance.

## Git and ownership

| Ref / Draft PR | Exact audited HEAD | Base |
| --- | --- | --- |
| main | `2518b2e80b8c8ef881063a968645382d61aeb37e` | — |
| [#104](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/104) | `d382e80164fb2ec559db88001ba05d73fc831731` | main |
| [#105](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/105) | `7a5e1b775a5290ba282b78cba708849b3e0dc20a` | fix/qadam-critical-stability |
| [#106](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/106) | `6898faa55a8c9be2c4241da7816b849d311402aa` | feature/qadam-stage2-ai-voice |

Fresh fetch and Git ancestry checks prove the complete linear dependency chain:
main → 4 Stage 1 commits → 2 Stage 2 commits → 2 Stage 3 commits. No lost ancestor,
merge conflict or duplicated feature implementation was found in this stack.
All three existing PRs were open Drafts and mergeable at inspection. Their
branches and PR contents were not edited. A new clean worktree preserves the
other participants' working copies.

Main-to-Stage-3 migration files, database models, Auth implementation and core
financial schemas are unchanged. AST comparison of ledger functions finds only
the history read changed; sale, repayment and reversal write functions match
main. Stage 4 adds response metadata and client read compatibility checks,
without changing ledger writes, JWT, Membership, schema or RLS.

The branch contains one Alembic head, `0008_canonical_markets`. Research forecasting
and migrations 0009/0010 from other diploma branches are **not part of this stack**.
The earlier Stage 3 report's Research mention was corrected; this is not a lost
Stage 1/2 commit. Do not import those other branches during this release.

## Defects and corrections

1. **Real integration defect: silently ignored filters.** Hosted API 0.7.2 accepts
   unknown query parameters, so the new client could present unfiltered history
   as filtered. New filtered history/debt reads and period/customer reports now
   require `X-Qadam-API-Version: 0.8.0`. Missing/different versions fail closed
   with RU/KZ explanation and explicit Retry. Backend adds and exposes the header
   through CORS; OpenAPI and generated TypeScript declare it. Actual HTTP errors
   retain their 401/404/503 semantics. Legacy unfiltered reads and writes remain
   compatible. A pre-Stage-4 API 0.8.0 lacking the header also needs the metadata fix.
2. **Development dependency security.** Clean installation exposed critical
   advisories in the locked Vitest/tinypool chain. Vitest was upgraded from 3.2.7
   to exact 4.1.12; tinypool is no longer installed. Only development dependency
   versions changed. Node 24 / Vite 7 satisfy the Vitest 4 requirements. Full
   tests verify the changed mock lifecycle rather than assuming major-version
   compatibility.
3. **Two old formatting failures** in `dashboard-demo.test.tsx` and
   `whatsapp-components.test.tsx` were fixed without changing assertions.
4. **Reproducible browser setup.** The Stage 4 suite wrapper selects installed
   Chrome, one worker, bounded timeouts, fresh per-suite local servers and zero
   automatic retries. The Stage 1/2 PostgreSQL harnesses are headless by default,
   with `QADAM_QA_HEADED=1` available. No fake claim of physical-device acceptance.
5. **Stale browser expectations.** The initial broad public suite had 30 pass /
   13 fail: seven cases used a globally ambiguous Demo badge locator, one expected
   Assistant surfaces with that feature disabled in the aggregate test config,
   four tried editing the intentionally fixed Demo Summary date, and one login
   timed out without a confirmed product root cause. Tests now scope the badge,
   enable the existing synthetic fact-only Assistant configuration, assert the
   approved fixed-date Summary values/label, and require Stage 1's selected-shop
   persistence after reload. Financial expected amounts and security checks are
   retained. An intermediate run passed 39 and failed four because the new exact
   Demo-label assertion was incomplete; that assertion was corrected to the full
   visible label. These failures are disclosed and full-suite results are below.
6. **Audit-runner fixes.** Initially five WebKit cases could not launch because
   the wrapper inherited the Chrome channel; the five Chrome cases passed.
   Engine-specific configuration fixes this, and the entire ten-case suite then
   passed. JSON reports now go outside source directories, avoiding 19 generated
   reports being treated as source formatting failures. Neither issue changes
   application behavior or hides a product failure.

Final npm audit: **0 production findings; 7 moderate development findings,
0 high, 0 critical**. The remaining minimatch advisory propagates through the
ESLint/typescript-eslint chain. Patched minimatch 11 is outside the direct
dependency's allowed 10.x range; an unverified major override was not applied.
Security-owner review remains a release dependency.
Sources: [tinypool worker-options advisory](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3),
[tinypool run-options advisory](https://github.com/advisories/GHSA-85c8-ppgw-ccpr),
[@vitest/mocker advisory](https://github.com/advisories/GHSA-qxg6-89mg-rqv8),
[remaining minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Environment and completed checks

Windows 11, Chrome 157.0.8103.78, Node 24.21.0, npm 11.19.0,
Python 3.12.14, uv 0.13.7.
Fresh `apps/api/.venv` from locked dependencies and fresh `apps/web/node_modules`
using `npm ci`; no shared dependency junctions. PostgreSQL is a new loopback-only
cluster on port 55450, database/role `qadam_stage4_test`. Existing user databases,
local Qadam services and configuration were not touched.

| Check | Actual result |
| --- | --- |
| Full backend, including isolated PostgreSQL | **482 passed, 0 skipped**, 221.99 s |
| Full frontend, all 50 files in one invocation | **686 passed, 0 failed, 0 skipped**, 307.67 s |
| Strict microphone lifecycle configuration | **35 passed, 0 failed, 0 skipped**, 9.85 s; includes 8 extra lifecycle cases and 27 cases overlapping the default suite |
| TypeScript / ESLint | PASS |
| Generated API consistency | PASS |
| Full frontend format check | PASS; the two historical warnings are resolved |
| Production web build | PASS; existing large-chunk / empty Auth-chunk warnings remain |
| Ruff lint | PASS |
| Alembic upgrade / metadata check / downgrade in empty test DB | PASS; single head 0008 |

One backend warning is the installed Starlette/httpx TestClient deprecation.
The previous Stage 3 run (657 pass / 13 fail / 4 skipped) is historical evidence,
not overwritten. Its previously affected cases run in the full Stage 4 invocation
with one worker and explicit 15 s test / 60 s hook deadlines. No test is skipped,
marked expected-failure or selectively rerun to produce the reported green total.
The prior failures were not reproduced under these controlled conditions;
this does not prove all timing sensitivity is permanently eliminated.
The old log identifies a 10 s `beforeAll` timeout for `mal-bazar.test.tsx`, which
prevented its four cases from running; all four pass now. The other failures
include 5 s test and UI-appearance timeouts across customer, Analytics and
Assistant tests. No product patch was justified solely by those old timeouts.

## Complete browser regression

Each row is a complete final invocation, one worker, zero automatic retries.
Final totals: **231 passed, 0 failed, 0 skipped** across 19 suite invocations.
There are **217 distinct file / test-title / browser-project combinations**:
six ledger-reading and eight seller cases occur in two suite configurations.
These are not 231 independent financial or physical-device tests.

| Suite (`QADAM_STAGE4_SUITE`) | Passed |
| --- | ---: |
| compatibility | 2 |
| auth | 39 |
| microphone | 18 |
| assistant | 13 |
| voice | 1 |
| ledger | 6 |
| summary | 7 |
| public | 43 |
| qa | 21 |
| cabinet | 10 |
| customer | 5 |
| assistantUI | 6 |
| assistantSurfaces | 8 |
| analyticsLayout | 5 |
| analyticsRedesign | 14 |
| reminders | 8 |
| inquiry | 9 |
| registrationPreview | 6 |
| ios | 10 |

The microphone suite's formerly retried cases passed in this complete first
invocation. The `ios` name denotes five installed Chrome and five desktop
WebKit 27.2 cases, including emulated touch. It does **not** mean physical iOS.
The registration suite uses a local built application and intercepted synthetic
services; it does not validate hosted email, Cloudflare or Supabase settings.
The public suite excludes only the screenshot-only writer; human timing tasks
are not automated regression tests. The first two failed public runs and first
WebKit launch failure are retained locally and disclosed above. Final passing
totals do not erase them.

## Financial acceptance in real Chrome / API / PostgreSQL

All three complete opt-in harnesses passed: Stage 2 editable AI/Voice drafts
and Stage 3 customer/filters/reports ran together with **2 passed, 0 failed**,
130.74 s. Stage 1 finance/AI-unavailable acceptance subsequently passed **1/1**,
23.81 s. These three real-PostgreSQL browser scenarios are additional to the
231 service-double browser executions above (234 executions, 220 distinct
scenarios/browser projects overall). Installed
Chrome is headless; Supabase HTTP sign-in/JWKS and AI/STT are explicit test doubles.
JWT verification, Membership, FastAPI, ledger rules and PostgreSQL are real.
No hosted credentials, real clients, physical microphone or paid provider is used.

Each independent fixture starts with an empty synthetic business and performs:

| Step | Sales delta, KZT | Receipts delta, KZT | Resulting debt, KZT |
| --- | ---: | ---: | ---: |
| Sale 3000, received 1000 | 3000 | 1000 | 2000 |
| Repayment 500 | 0 | 500 | 1500 |
| Reverse that repayment | 0 | -500 | 2000 |
| Fully paid sale 1200 | 1200 | 1200 | 2000 |
| Final totals | **4200** | **2200** | **2000** |

UI summary/report, API results and SQL aggregates agree:
`count(*)=4`, `sales=420000`, `receipts=220000`, `debt=200000` **minor units**.
SQL checks run after browser completion; a successful HTTP status alone is not
treated as proof. No operation exists before user confirmation; UI double-click
creates one operation. Reload, business switch and foreign-token denial pass.

Customer profile, repayment history, filters, calendar age, RU/KZ copied reminder,
CSV download, print CSS and 360/390/768/1440 px overflow checks pass. Print is a
Chrome media emulation, not a physical printer. The report screenshot was also
visually inspected. Backend tests additionally exercise simultaneous same-key
requests, concurrent repayments (one rejected rather than overpaid), conflict
409, atomic failure rollback and cross-tenant references. Existing write rules
remain unchanged.

Final fixture teardown left zero public tables in this disposable test DB.
Only this owned cluster on 55450 was then stopped; its files and logs are kept
under ignored `tmp/stage4-pg`. Existing user services/databases were untouched.

Actual screenshots from this Stage 4 run, synthetic local PostgreSQL data only:
[desktop report](evidence/stage4/report-desktop.png),
[KZ mobile debt](evidence/stage4/debts-kz-mobile.png).
These are Chrome viewport captures, not photographs of a physical device.

Stage 2 covers RU/KZ/mixed draft text, decoded test WAV, explicit confirmation,
provider error/manual fallback and Assistant fact bindings. These results verify
the integration boundary, **not real model accuracy or physical speech capture**.

## Hosted diagnosis — read-only, not hosted acceptance

Measurements at approximately 05:13 UTC, 12.11.2026, from this Windows machine:

| Request | Status | Duration / finding |
| --- | --- | --- |
| Render `/api/v1/health`, initial request | 200 | **43.218 s** |
| Render `/health`, immediately warm | 200 | **0.385 s** |
| `/openapi.json` | 200 | 2.228 s; **API 0.7.2**, no period-report endpoint |
| `/api/v1/me`, no credentials | 401 AUTH_REQUIRED | 0.427 s; expected protection |
| `/api/v1/venues`, public DB-backed read | 200 | 1.638 s, 3 entries; no private data collected |
| CORS OPTIONS `/api/v1/me` from Pages origin | 200 | 0.367 s; origin and Authorization accepted |

A later warm curl request completed in 0.652 s. The repository declares a Render
Free service; a 43 s first response followed by subsecond responses is consistent
with cold startup, and exceeds both the reported 12 s observation window and
the candidate client's bounded 20 s read deadline. This is an **inference**,
not a log-confirmed diagnosis. Render documents idle sleep after 15 minutes and
roughly one minute to wake a Free web service. Do not enlarge every money-request
deadline or add automatic POST retries to mask this behavior.
Sources: [Render Free services](https://render.com/docs/free),
[health-check semantics](https://render.com/docs/health-checks).

`/health` verifies the process, not DB/JWKS readiness. The successful public
DB-backed request proves one read at that time, not financial tenant access,
schema revision, Auth refresh or full hosted readiness. `/me` without a token
does not test a real user. CORS alone does not establish deployment compatibility.

Render Dashboard was inspected in a browser and required login; no authorized
logs/settings were available. No login, OAuth permission, restart or plan change
was attempted. Startup duration, actual environment and database revision remain
unconfirmed. The repository startup script validates settings but does not apply
migrations. Do not assume the deployed configuration equals `render.yaml`.

The hosted backend is incompatible with the new business read surface. New web
must not be released against that backend. Exact web/backend artifacts, hosted
Supabase sessions, DB migration state and physical devices require owner-led
staging acceptance. A script's Pages GET returned 403; no conclusion about browser
availability or frontend deployed SHA is drawn from that response.

## Reproduction

From `apps/api`, use Python 3.12 and a **new empty local** database whose name ends
in `_test`. Never point this fixture at any user/shared database:

```powershell
uv sync --locked --python 3.12
$env:TEST_DATABASE_URL='postgresql+psycopg://qadam_stage4_test@127.0.0.1:55450/qadam_stage4_test'
$env:DATABASE_URL='postgresql+psycopg://unused@127.0.0.1:1/unconnected'
$env:AI_API_KEY=''
$env:OPENAI_API_KEY=''
$env:ASSISTANT_ENABLED='false'
$env:PYTHONIOENCODING='utf-8'
$testTemp=Join-Path (Resolve-Path ../../tmp) ('pytest-'+[guid]::NewGuid())
uv run pytest -q --tb=short --basetemp $testTemp
uv run ruff check app tests
uv run ruff format --check app tests
uv run python -m app.export_contracts --check
$browserTemp=Join-Path (Resolve-Path ../../tmp) ('browser-'+[guid]::NewGuid())
uv run pytest -q -s tests/stage2_browser_acceptance.py tests/stage3_browser_acceptance.py --basetemp $browserTemp
$stabilityTemp=Join-Path (Resolve-Path ../../tmp) ('stability-'+[guid]::NewGuid())
uv run pytest -q -s tests/stability_browser_acceptance.py --basetemp $stabilityTemp
```

From `apps/web`:

```powershell
npm ci
npm run typecheck
npm run lint
npm run check:api
npm run format:check
npm test -- --maxWorkers=1 --no-file-parallelism --testTimeout=15000 --hookTimeout=60000
node node_modules/vitest/vitest.mjs run --config vitest.microphone.config.ts --maxWorkers=1 --no-file-parallelism --testTimeout=15000 --hookTimeout=60000
npm run build
npx playwright install webkit
foreach ($suite in @('compatibility','auth','microphone','assistant','voice','ledger','summary','public','qa','cabinet','customer','assistantUI','assistantSurfaces','analyticsLayout','analyticsRedesign','reminders','inquiry','registrationPreview','ios')) {
  $env:QADAM_STAGE4_SUITE=$suite
  npx playwright test -c e2e/stage4.playwright.config.ts
  if ($LASTEXITCODE -ne 0) { throw "Failed complete suite: $suite" }
}
```

The full public browser suite passed **43/43** after the disclosed test corrections.
No `-g`, `--last-failed`, skip or automatic retry was used for that final run.
Chrome must be installed for this wrapper. Playwright installs only its WebKit
test engine with the command above; it does not provide a physical iPhone.
The JSON reporter writes to ignored `apps/web/test-results/stage4-*.json`.
Raw local logs are in ignored `tmp/`: `backend-full.log`, `frontend-full.log/json`,
`browser-postgres.log`, `stability-browser.log`, `microphone-strict.log`,
`e2e-*.log`, `final-*.log`, `build.log`, and `hosted-probe.json`.
First/intermediate failed public and WebKit reports are also retained there.
Generated screenshots in older reports were preserved locally and restored to
their prior tracked versions; only two dedicated Stage 4 screenshots are published.

## Change ownership and release decision

Stage 4 changes only:

- Backend response version/CORS metadata in `app/main.py` and `app/routers.py`,
  plus `tests/test_api_version.py`.
- Frontend API client, ledger list/report hooks, RU/KZ error mapping and API
  version regression tests; no financial write rules or Auth changes.
- OpenAPI response-header declarations, generated TypeScript and
  `BUSINESS_READS_API.md` together.
- Vitest development dependency and lockfile; two format-only test corrections.
- Existing browser expectations/configuration and a dedicated Stage 4 wrapper
  and compatibility acceptance tests.
- This audit, release checklist, two synthetic evidence images, decisions,
  seller handoff and the factual correction to the Stage 3 Research statement.

Stage 1–3 are compatible as a local stack with the Stage 4 compatibility guard.
**GO for local synthetic demonstration and owner code review.** This is not
approval to merge. **Hosted staging acceptance: NO-GO / not executed** until an
approved matching backend/frontend pair, staging account/database and owner
access are available. **Production: NO-GO.** Remaining gates include old hosted
API 0.7.2, real Supabase login/refresh, deployed schema revision and artifacts,
hosting logs, physical device/microphone acceptance and security-owner review
of seven moderate development advisories. Live AI quality and paid provider
availability were not evaluated. No paid calls or shared-DB writes were made.

See the [release checklist](QADAM_STAGE4_RELEASE_CHECKLIST.md) for exact merge
order, dependencies, migration/rollback plans and mandatory approvals.

## Publication

Implementation and all test-bearing changes: **`91efcd9e98ca0de2b5f715f07bdb81dbe5baa533`**.
Ordinary push succeeded and the remote/local hashes matched. A final follow-up
commit records this publication only; its exact SHA is available from the PR head
and `git rev-parse HEAD`, without changing the verified implementation.

[Draft PR #107](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/107):
`review/qadam-stage4-integration` → `feature/qadam-stage3-business`
(`6898faa55a8c9be2c4241da7816b849d311402aa`). GitHub reported mergeable, no conflicts.
Fresh fetch confirmed main and #104–106 unchanged. A first pull was inapplicable
because the new branch had no remote; subsequent synchronization uses ff-only.

On the implementation commit, Vercel reported success and GitHub Actions returned
zero runs. This is existing Preview automation, not a backend/financial regression
CI gate or authenticated staging acceptance. The PR description records checks
for the final documentation head. No hosting setting or deployment was manually
changed; no merge or shared-database action was performed.
