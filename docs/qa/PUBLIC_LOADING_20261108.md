# Public cabinet loading recovery — 2026-11-08

Branch: `fix/public-auth-loading`, based on fetched `origin/main`
`2518b2e80b8c8ef881063a968645382d61aeb37e`. The working local QadamX
cross-device branch and its database/configuration were not changed.
No push, deployment, migration, financial write or real-account login was made.

## Observed production behaviour

| Check | Actual result from this Windows laptop |
| --- | --- |
| Pages `/seller`, fresh Chrome context | Redirected to `/login`; rendered normally; no recorded page errors |
| Deployed frontend configuration | Render `/api/v1`; Supabase project `pdjjdqgoitnkpgkbqjtp`; publishable key present, not recorded |
| Supabase `/auth/v1/settings` from Pages origin | HTTP 200, approximately 966 ms |
| Render `/api/v1/health`, `/openapi.json`, `/api/v1/venues` from Pages origin | No response within 12 seconds |
| Anonymous `/api/v1/me` | Browser fetch failed; no HTTP status available |
| OPTIONS `/api/v1/me` with Pages origin and Authorization preflight | No response within 12 seconds; CORS configuration cannot be established from this |
| Independent direct Render health probe | curl timed out after 75.04 seconds, HTTP 000, zero received bytes |
| Later direct Render connection-stage check | DNS 0.121 s, TCP 0.153 s, TLS 0.241 s; no HTTP response/first byte by the 20-second deadline |

The deployed frontend assets observed were `index-CCvUNJhC.js` and
`auth-CB7MGzWB.js`. Their exact deployment commit was not exposed/verified.
Backend OpenAPI/version and deployed environment variables could not be retrieved.

**Confirmed frontend defect:** restoration depended on `INITIAL_SESSION` with
no deadline; API reads awaited `getSession()`, fetch and JSON body without a
deadline. Consequently a pending `/me` leaves `ProtectedSeller` in `isPending`
indefinitely. Offline queries could also remain paused instead of reaching an error.

**Reproduction on the deployed bundle:** a disposable Chrome context with a
synthetic saved session and an intercepted, held `/me` still displayed only
`Загрузка…` after 90 seconds of Playwright virtual time, with no page errors.
All Supabase/Render requests from this synthetic context were intercepted: no
synthetic credentials were sent to real services. This reproduces the UI defect,
not the contents of the user's actual failing session.

**Infrastructure limit:** Render was unreachable from this laptop during the
probes. Whether this is service startup, configuration, platform availability,
an upstream/network issue or a database dependency cannot be established without Render
Events/Logs. Supabase's healthy Auth endpoint does not establish FastAPI or
financial-database availability. Do not report a proven PostgreSQL outage or
successful real refresh/login based on these observations.
The later probe reached TLS successfully, so DNS resolution and TLS establishment
worked in that probe. Browser CORS alone cannot explain a direct request without
an Origin header also receiving no HTTP response.

## Local changes

- Auth initialization has a 10-second watchdog and a RU/KZ recovery screen.
  Retry explicitly reloads the page without application code clearing stored credentials.
  Late SDK events after this failed attempt cannot reopen the cabinet.
- Auth HTTP fetch and response bodies are bounded at 8 seconds. Token lookup,
  sign-in and sign-out promises are bounded at 10 seconds; callback completion
  at 20 seconds. A timed-out sign-in requires recovery rather than queuing another login.
- Authenticated GET/HEAD fetch and response body waits are bounded at 20 seconds,
  after a maximum 10-second token lookup. Abort and identity-generation guards
  remain in effect. A late 401 after a read timeout cannot expire the session.
- `/me` does not retry automatically. Its Retry button starts a new read. Offline
  reads reach an error rather than a permanently paused React Query loading state.
- Distinct RU/KZ handling for Auth unavailability, invalid credentials, pending
  email confirmation, rate limiting, backend timeout/network failure and the
  existing server `DATABASE_UNAVAILABLE` error. Network/CORS failures are not
  falsely diagnosed as database failures. Existing zero-membership state remains.
- No JWT, RLS, membership authorization, OpenAPI, backend or ledger changes.
  Monetary/customer POST timeout, idempotency and unknown-result protocols are
  unchanged; this change adds no automatic write retry.
- Cancellation checks use the existing `aborted` flag rather than requiring the
  newer `AbortSignal.throwIfAborted()` browser method.

## Reproduction and verification

Final behavioural verification: **630/630 unit/component tests (45 files)** and
**37/37 Chrome E2E scenarios** passed. This includes 20 new unit regressions
and 12 new browser scenarios. These are synthetic transport evaluations through
real application components/SDK; they are not successful production account or
PostgreSQL checks.

| Final check | Result |
| --- | --- |
| TypeScript (`typecheck`, also repeated by `build`) | PASS |
| ESLint | PASS |
| `check:api` | PASS; generated types/OpenAPI unchanged |
| Production compilation (`npm run build`) | PASS; existing large-chunk warning |
| Unit/component, serial with 30-second setup-hook budget | 630 PASS, no skips |
| Chrome E2E, combined config | 37 PASS, no retries |
| Formatting of changed TS/JS files and `git diff --check` | PASS |
| Repository-wide `format:check` | Existing failures in two unchanged files, listed below |

The local compilation output is not a deployed/configured release. Publication
must use the project's hosted build with its approved Pages environment; no
local `dist` upload or production configuration change was performed.

Primary implementation files: `apps/web/src/app/auth.tsx`, `auth-transport.ts`,
`AuthRecovery.tsx`, `login-errors.ts`, the login/registration/callback route guards,
`app/query.ts`, `app/runtime.tsx`, `shared/api/client.ts`, `shared/api/deadline.ts`,
`shared/ui/index.tsx` and the RU/KZ dictionaries. Regressions are in
`src/test/loading-recovery.test.tsx` and `e2e/loading-recovery.acceptance.ts`;
existing transport/analytics/Auth expectations were adjusted for a combined
cancellation signal and the more specific network message.

Run from `apps/web`:

```powershell
npm run typecheck
npm run lint
npm run check:api
npm run build
npm test -- --maxWorkers=1 --hookTimeout=30000
npx playwright test -c e2e/loading-recovery.playwright.config.ts
```

The dedicated E2E config opens installed Chrome against port 4328 and uses the
real application and Supabase SDK with synthetic intercepted Auth/API responses.
It never reuses the local financial runtime or makes production writes. The
refresh-timeout browser check waits real time; `/me` deadline/no-retry checks use
the virtual clock. New and existing synthetic-account states, repeat login,
reload, expired/blocked refresh, 401/403/404/429/500/503 and network refusal are covered.
The same config also runs the existing registration, zero-membership and PKCE
callback suites in installed Chrome (360, 390, 768 and 1440 px).

The original `auth-onboarding.playwright.config.ts` launch could not run because
its bundled Chromium executable was absent. Its 25 tests are included unchanged
in the Chrome config above. The first concurrent run was interrupted and is not
counted as a successful run. The serial command raises only the setup hook deadline
to 30 seconds for the existing cold Three.js import; test assertions are unchanged.

Repository-wide `npm run format:check` reports pre-existing formatting differences
in `src/test/dashboard-demo.test.tsx` and `src/test/whatsapp-components.test.tsx`.
Both files are identical to `origin/main` and have not been edited. Formatting
of all changed TypeScript/JavaScript files is checked separately.

Evidence is local and ignored by Git: `apps/web/tmp/public-loading-evidence/`
(public probes and deployed-bundle reproduction), `apps/web/test-results/loading-recovery/`
(Chrome screenshots), `apps/web/tmp/*final*.log` (verification output).
No real tokens, user records or private configuration are included.

## Required before public acceptance

1. Owner checks Render Events/Logs and deployed source SHA; confirm the service
   starts and listens on its assigned port. The repository startup script validates
   settings, but its contents are not proof of the deployed settings.
2. Privately verify `DATABASE_URL`, `SUPABASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`
   and exact `ALLOWED_ORIGINS` entry `https://qadamx-taraz.pages.dev`. Do not share
   secrets or turn off JWT/CORS enforcement. No production migration is authorized.
3. Once Render answers, verify CORS preflight and real authorized `/me`, then a
   DB-backed read for an allowed business. Check response shapes against the
   deployed frontend contract; version compatibility is currently unconfirmed.
4. After separate publication approval, release the frontend fix and test fresh
   login, reload and refresh with an authorized existing account and a new account.
   Local synthetic E2E does not establish production database or account readiness.
