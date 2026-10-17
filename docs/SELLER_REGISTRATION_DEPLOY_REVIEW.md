# Registration deploy integration review — 2026-10-17

Branch: `integration/seller-registration-deploy-review`, separate worktree
`work/qadam-registration-deploy-review`. Base: `origin/deploy-062`
`9845b91b64d388c54312d2a8a75000218c7774af` (also current main on initial fetch).
Selected source: PR #31 `6f808677c067cc00fb6b6b9eb26384f68c3d1e38`.
No branch merge, Recovery PR #42 import, modification of PR #31, production
deployment, Supabase configuration or backend change.

## Selected integration

Reviewed and copied only these 12 Registration source/test files, not the old
branch or its documentation wholesale:

- `apps/web/src/app/App.tsx`, `auth.tsx`, `pages.tsx`,
  `registration-model.ts`, `registration.tsx`.
- `apps/web/src/shared/i18n/ru.ts`, `kk.ts`.
- `apps/web/src/test/auth-onboarding-readiness.test.tsx`, `registration.test.tsx`.
- `apps/web/e2e/auth-onboarding.acceptance.ts`,
  `auth-onboarding.playwright.config.ts`, `registration.acceptance.ts`.

One existing AuthProvider/client and router. `/register` calls SDK signUp;
`session:null` gives neutral confirmation waiting, never login or membership.
Explicit resend, service rate-limit messages, synchronous submission guards,
email/password/confirmation validation, RU/KZ and memory-only credentials are
retained. Only a non-identifying waiting flag survives in sessionStorage.
The service enforces resend quotas; no background resend/retry is introduced.
Authenticated session events lead through validated GET `/me`. Empty businesses
show the existing waiting state; Refresh can load captain-assigned memberships.
No provisioning/invitation API, automatic Demo, or arbitrary business access.

Additional changes: `src/app/auth-config.ts` rejects malformed public URLs and
known service paths (including `/rest/v1` and `/auth/v1`) before constructing the
SDK. Login and Registration show a fixed localized notice, never the configured
URL/key. No URL rewriting or fallback project. Explicit reverse-proxy prefixes
remain supported for self-hosting and synthetic browser tests. `.env.example`
clarifies the Project URL and matching Backend issuer without embedding values.
`src/test/auth-deploy-integration.test.tsx` exercises this boundary and `/me`
errors; the existing API client/runtime/error renderer are not modified.

Documentation changed: this report, `SELLER_REGISTRATION_AUDIT.md`,
`DECISIONS.md`, and `handoffs/seller-web.md`. Production Backend, contracts,
generated types, Voice, financial/customer logic, Analytics, public storefront,
styles/components, Flutter, 3D, dependencies and tracked screenshots are retained.

## Diagnosis of the reported incidents

### A. Project URL

The user's incorrect `/rest/v1/auth/v1/signup` is consistent with passing a REST
endpoint as the SDK Project URL. It is a reported local configuration problem,
not evidence of a defect in deployed code. The new guard refuses that config
instead of silently changing the destination. The published `/login` entry
`/assets/index-C0aIF3Iq.js` was read without execution: it contains the expected
Render `/api/v1` and team Supabase origin, and not `/rest/v1/auth/v1`.
This is configuration evidence, not a new live login.

### B. Confirmation link

`otp_expired` does not establish whether this particular link expired, was reused
or consumed by a mail scanner. Its sanitized timestamp/provider logs and email
template settings were not supplied. Do not copy the token/link into Git or logs.
Supabase documents expiration/consumption and email prefetch as possible causes:
[OTP troubleshooting](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
`detectSessionInUrl:false` remains unchanged: successful confirmation is also
not automatically exchanged into a frontend session by this MVP.

**Callback and live email acceptance are Blocked.** PR #31 comments and
`HOSTING_TEAM_HANDOFF.md` contain proposals, explicitly not applied settings.
The current task still requires confirmation. No callback route, redirect URL,
flowType change or wildcard is enabled here. Existing invalid/expired notice
components are tested in isolation, not represented as a working callback.

Captain/backend must confirm the exact route and full HTTPS URL, redirect
allowlist/Site URL, implicit or PKCE flow, post-confirmation destination, invalid/
expired/reused handling, confirmation/SMTP/template policy, TTL and resend quota.
The permanent origin alone is not callback approval. See
[Supabase redirect rules](https://supabase.com/docs/guides/auth/redirect-urls).

### C. Dashboard /me

Own read-only hosted probes on 2026-10-17 (no credentials, signup or writes):

| Probe | Observed |
|---|---|
| `https://qadamx-taraz.vercel.app/login` | 200 |
| Render `/health` | 200 |
| Render `/openapi.json` | 200, API 0.6.2, GET `/api/v1/me` → MeResponse |
| Render `/api/v1/me`, anonymous | 401 `AUTH_REQUIRED` |
| CORS preflight GET `/me`, Authorization, permanent web origin | 200, exact allow-origin, Authorization allowed |
| Team Supabase public `/auth/v1/settings` | email enabled, signup enabled, confirmation required |

Expected project from approved public configuration:
`https://pdjjdqgoitnkpgkbqjtp.supabase.co`; expected issuer adds `/auth/v1`.
Backend source validates configured issuer, audience and signature/JWKS. This
does not independently reveal deployed JWT environment or validate a personal
project token. No personal Supabase was connected to the team Backend.

The user's failed local request/status/issuer were not available, so its cause
remains unconfirmed. Network/CORS exceptions cannot be reliably distinguished
by frontend fetch alone. Tests verify missing API config, network error, 401,
403, 404, 500 and malformed 200 remain errors, not empty memberships. A later
valid `{id,businesses:[]}` alone shows zero memberships. Retry performs GET only.

For live diagnosis, captain supplies the approved team test account privately;
record only status, request ID, public issuer/project match and exact Origin.
Never paste JWT/password/full callback URL or customer data. Check local API URL
and process first, then `/me` status, issuer match, CORS and response validation.

## Verification

Final local run is in progress; use the completed results in the seller handoff
after publication. Do not treat source PR results as a new run.
Initial new diagnostic tests exposed two test assumptions: informational Alert
has role `status`, and GET network/5xx has one 1-second retry. Tests now use the
actual accessibility role and wait for that policy, preserving error assertions.

From `apps/web`, Windows Node/npm:

```powershell
npm.cmd ci
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --no-file-parallelism
npm.cmd run build
npm.cmd run format:check
npx.cmd vitest run --config vitest.microphone.config.ts
npx.cmd playwright test --config e2e/auth-onboarding.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/qa.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/voice-integration.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/microphone.playwright.config.ts --trace off
$env:QADAM_SCREENSHOT_ROOT='./test-results/registration-deploy-screenshots'
npx.cmd playwright test --config e2e/analytics.playwright.config.ts --trace off
Remove-Item Env:QADAM_SCREENSHOT_ROOT
git diff --check
```

Synthetic SDK/HTTP/audio results do not prove live email, DB persistence, server
idempotency or physical Android. No real money or paid AI call. Existing npm audit
findings (1 moderate, 2 critical dev findings) remain; no forced upgrade.

## Captain acceptance gates

1. Review the Draft against deploy-062; choose merge/deployment separately.
2. Confirm callback settings and permitted account/email environment before any
   live signup/resend. Preserve existing session generation and private cache.
3. After approved deployment, register an agreed account, confirm email, login,
   inspect `/me`, verify zero memberships, assign membership as captain, Refresh,
   verify only assigned points, foreign-point denial and logout/reload.
4. Verify expired/reused/other-browser links and service quotas under the agreed
   flow. Capture sanitized evidence only. Physical Android is a separate gate.
5. Recovery PR #42 remains independent; no automatic merge of its coordinator.
