# Stage 1 critical stability — 2026-11-11

Branch `fix/qadam-critical-stability`, base `main` at
`2518b2e80b8c8ef881063a968645382d61aeb37e`. Implementation commit:
`87d42c7bf2dc6f55fda68ae9c395cc9e59d6538f`. Publication and final check results
are recorded below. No production deployment or shared database
change. The native local QadamX worktree/configuration/data were not modified.

## Changes and root causes

1. **C1: indefinite loading.** Includes previously unpublished commit
   `229ffd2fcad475133c59004b3edf9296466e2989`: bounded Auth initialization,
   Supabase HTTP/body and token reads, private API reads and RU/KZ manual recovery.
   No membership is a separate state. Read deadlines do not change financial
   POST unknown-result/idempotency behaviour. Detailed original evidence:
   [PUBLIC_LOADING_20261108](PUBLIC_LOADING_20261108.md).
2. **C2: unsupported quota diagnosis.** The same user message was shown for every
   provider 429. Frequency, quota and billing cannot be distinguished that way.
   New RU/KZ wording states the uncertainty, current-page retention and manual fallback.
3. **C3: ignored Retry-After.** Server previously discarded the provider header,
   CORS did not expose it and the client did not parse it. The full chain now
   preserves only a normalized delay and disables prepare/retry/clarify until
   expiry. No automatic call on expiry; input edits cannot bypass the timer.
4. **C4: wrong shop after reload.** Real browser acceptance found that selection
   was memory-only: after reload the first membership replaced the chosen shop,
   causing a correct saved ledger to appear empty. A per-user sessionStorage
   preference now retains only the business ID within the tab. Every render
   validates it against current `/me`; foreign/revoked IDs are ignored. Storage
   failure still permits in-memory selection. No Auth or membership bypass.

The ledger service, backend JWT verifier, migrations, OpenAPI/generated types and
financial arithmetic remain unchanged. New backend production code only carries
the bounded Retry-After metadata and exposes that response header over CORS.

## Actual financial browser acceptance

Real installed Chrome → React/Supabase SDK → FastAPI → signed ES256 verification
against local test JWKS → PostgreSQL on `127.0.0.1:55447/qadam_stability_test`.
Only Supabase token issuance is intercepted. No financial API response is mocked.
No real merchant data or hosted login is used.

- Create synthetic customer through the UI; select authorized synthetic shop.
- Sale 3000 / received 1000; synchronous double click produces one operation.
- Repayment 500; reverse that repayment through the history confirmation dialog.
- Fully paid sale 1200.
- Summary and reload: 4200 / 2200 / 2000 KZT.
- API returns 420000 / 220000 / 200000 tiyn.
- SQL sums and row count: four immutable journal rows, same amounts.
- Analytics values and 30 daily bars; KZ at 390 px has no horizontal overflow.
- Real unconfigured AI returns a controlled error; entered text and manual mode
  remain available. No AI-created monetary operation. No browser page errors.

Screenshots contain only this isolated synthetic database:
[desktop summary](evidence/critical-stability-20261111/postgres-summary-desktop.png),
[KZ mobile analytics](evidence/critical-stability-20261111/postgres-analytics-kz-mobile.png).
This is not physical-phone, live model or production acceptance.

## Verification record

| Check | Actual result |
| --- | --- |
| Full backend `pytest -q`, real isolated PostgreSQL enabled | 401 passed, 0 skipped, 477.76 s; one upstream Starlette deprecation warning |
| Explicit real browser/PostgreSQL pytest harness | 1 passed, 50.10 s, including 1 Playwright scenario; do not double-count the wrapper |
| Final frontend unit/component suite | 648 passed in 47 files, 269.67 s, after C4 and test-session isolation fix |
| Combined Chrome Auth/registration/AI delay suite | 39 passed, 6.0 min; synthetic Auth/API faults, real SDK/Chrome; widths 360/390/768/1440 |
| Typecheck/lint/build/API contract | Passed after C4; build retains the existing >500 kB chunk warning |
| Ruff check and format for all backend files | Passed |
| Full web format check | Fails on two unchanged pre-existing files: dashboard-demo.test.tsx and whatsapp-components.test.tsx |
| Prettier for every new/modified Stage 1 TS/TSX file; git diff --check | Passed |
| Fresh public browser probe | Supabase settings 200; Render health/OpenAPI/me/venues/preflight exceed 12 s |

Failures found during development were retained in the investigation: a stale
quota-text assertion was updated to the intentional neutral wording; the financial
reload failure exposed C4 and was fixed in production code. Windows' default pytest
temp directory denied access, so the browser run used a fresh checkout-local
`--basetemp`; UTF-8 output avoids a cp1251 crash when printing the KZT sign.
Unit fixture cleanup now clears sessionStorage between independent tests; the
new selection regressions explicitly test persistence within the same session.

## Reproduction

Use Node and the existing project Python 3.12 environment (or `uv sync --locked`).
No dependency lockfile was changed. The run used Python 3.12.14, FastAPI 0.143.2,
SQLAlchemy 2.0.54, Alembic 1.20.0, psycopg 3.3.6, pytest 8.4.2, Vitest 3.2.7.

From `apps/web`:

```powershell
npm run typecheck
npm run lint
npm run check:api
npm run build
npm test -- --maxWorkers=1 --hookTimeout=30000
npx playwright test -c e2e/loading-recovery.playwright.config.ts
```

For PostgreSQL, create a **new empty local database ending in `_test`** on a
dedicated cluster. The fixture refuses an existing qadam schema or the configured
application DB. It migrates and drops only its own verified test schema. Never
set TEST_DATABASE_URL to a shared or production database.

From `apps/api`, using a Python executable with the locked dev dependencies:

```powershell
$env:PYTHONIOENCODING='utf-8'
$env:DATABASE_URL='postgresql+psycopg://unused@127.0.0.1:1/unconnected'
$env:TEST_DATABASE_URL='postgresql+psycopg://qadam_stability_test@127.0.0.1:55447/qadam_stability_test'
python -m pytest -q
# New directory, not an existing folder with user data: pytest owns its contents.
$qaTempDir = Join-Path (Resolve-Path '../../tmp').Path ('browser-' + [guid]::NewGuid().ToString('N'))
python -m pytest tests/stability_browser_acceptance.py -q -s --basetemp=$qaTempDir
```

The explicit browser harness uses local ports 8338/4338 and installed Chrome.
It blocks non-loopback browser requests, uses no provider key, and runs no external AI.
The ordinary production build without configured environment is a source/build check,
not an artifact approved for deployment. Hosted build variables require owner review.

## Release decision and next work

- **Local isolated manual-finance demo: GO** for the verified scenario and error
  recovery; no claim of real AI/physical microphone acceptance.
- **Hosted staging acceptance: NO-GO** until the backend responds, the correct
  versions/configuration are known and real Auth/device checks are authorized.
- **Production: NO-GO.** Review, hosted DB-backed checks, actual provider diagnosis
  and release verification remain. No merge or deploy performed.

Stage 2 AI/voice and Stage 3/4 business features are not partly installed here.
See [AI acceptance](../ai/QADAM_AI_VOICE_ACCEPTANCE.md) and
[prioritized roadmap](../product/QADAM_NEW_FEATURES_ROADMAP.md).
Render unavailability is unresolved; a UI timeout makes failure recoverable but
cannot restore the hosting service. No new P1/P2 business feature is claimed.
