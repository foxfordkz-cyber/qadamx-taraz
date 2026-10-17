# Seller Registration MVP — 2026-10-16

## Approved implementation update (supersedes the readiness block below)

Captain/user approved public Supabase signup, email confirmation and explicit
resend. Continue the same `feature/seller-registration-onboarding` / Draft #31,
base `integration/voice-preview-061:0737439915c17e8d8f20cddcbe9e75bebede9b46`.
Starting HEAD for this stage: `c2a94026cd121e9dc89c2b347029b56adc4c957f`.
Initial fetch/pull --ff-only: successful, already up to date; working tree clean.
The newer OpenAI/customer-recovery integration was reviewed read-only; its backend,
API 0.6.2 and different Voice snapshot were not imported into this approved base.

The user explicitly confirmed during implementation that callback URL, redirect
allowlist and confirmation mechanism are **not agreed**. Only callback wiring
and real email acceptance remain Blocked; the independent MVP is authorized.

### Implemented

- `/register` linked from Login, using the current Card/Input/Button/Brand,
  typography and layout classes without global CSS/shared UI changes.
- Email, password, confirmation, show/hide, native email/required checks plus an
  explicit minimum-six-character/password-match guard. The server may impose
  stricter password policy; its weak-password error is localized.
- RU/KZ switches preserve current fields. Heading/validation focus, labels,
  status/alert announcements, keyboard navigation and mobile layouts.
- Existing AuthProvider now exposes `signUp` and `resendConfirmation`; both use
  the same Supabase client. A shared in-flight lock prevents overlapping
  registration/resend calls, even across page remount; the UI also locks submit.
- Successful signup with a user and null session shows a neutral confirmation
  waiting screen. It does not log in or fetch private data. Explicit duplicate
  email codes use the same screen and do not disclose account existence.
- Only the existing SDK auth-event path can establish the session. A real
  returned session uses that path and the existing `/me`; no manual session,
  role, membership or Demo assignment is introduced.
- Explicit resend with `{type: "signup", email}`, success/loading/errors, no
  automatic resend/retry. Weak password, invalid data, unavailable signup,
  network, rate limit and unknown SDK responses have safe localized messages.
  Raw SDK messages are never rendered or logged by the implementation.
- Password/confirmation are cleared after accepted signup, including neutral
  duplicate-email handling. They are never persisted. A tab reload preserves
  only `qadam.registration.pending=1` in sessionStorage; email must be entered
  again for resend. No email/password/token in that marker or the URL. Storage
  failure falls back to in-memory behavior; login/logout clear the marker.
- Late registration UI results after account change/unmount are ignored.
  Existing session epoch/A→B→A/late401/cache/business isolation remain intact.
- Exact zero-membership titles: RU «У вас пока нет торговых точек»,
  KZ «Сізде әзірге сауда нүктелері жоқ». GET refresh/logout/language still work.
  Captain assigns teaching memberships through the existing verified procedure;
  self-service creation and staff invitations are outside this MVP.

### SDK and callback boundary

Checked installed `@supabase/supabase-js` and `auth-js` **2.118.0** source:
`signUp({email,password})`, `resend({type:"signup",email})`.
No `emailRedirectTo`, wildcard, new callback path, code exchange or token parser
was invented. `detectSessionInUrl: false`, session persistence and refresh remain
as before. Without a redirect override, SDK uses the project's existing behavior;
that Site URL and actual email delivery are **not certified** by this change.
No real emails or accounts were created in shared Supabase.

`ConfirmationNotice` prepares waiting/invalid/expired RU/KZ presentation, tested
as an independent component. Invalid/expired real links and a successful browser
callback are **not integrated** until the exact route and mechanism are approved.
Do not report component tests as a successful callback or deploy this as complete
live email onboarding.

Captain/backend must supply: exact callback route/URL; exact allowed HTTPS origins
and allowlist confirmation; post-confirmation destination; implicit SDK vs PKCE
code-exchange mechanism; expired/reused-link behavior; an approved training
email/account and permission for a live signup/resend/delivery acceptance.
No Supabase, preview, cloudflared, backend, CORS or database setting was changed.

### New files / verification

New: `apps/web/src/app/registration.tsx`, `registration-model.ts`,
`src/test/registration.test.tsx`, `e2e/registration.acceptance.ts`.
Updated: app AuthProvider/router/Login, RU/KZ, existing zero-membership test
expectations and the isolated auth-onboarding Playwright config, this audit,
seller handoff and the approved decision record.

All commands below remain reproducible. The Auth browser config now includes
registration. Current-stage results:

| Check | Result |
| --- | --- |
| npm ci / check:api / typecheck / lint / build / format:check / diff --check | PASS |
| Full unit/component | **277/277**, including 23 new registration cases |
| Strict microphone/lifecycle components | **35/35** (27 overlap default) |
| Registration + existing onboarding browser | **17/17** (10 new + 7 existing) |
| Microphone browser | **18/18**, synthetic device |
| Seller/Analytics/public browser | **24/24** |
| Existing Auth/Customers QA browser | **21/21** (8 overlap standard Seller) |
| Synthetic customer/sale/idempotent retry/repayment/history/summary/Analytics journey | **1/1** |

No checks skipped or converted to expected failures. The initial short-password
test exposed the need for an explicit length guard beyond native minLength;
the initial duplicate-email HTTP fixture lacked the API-version header required
by SDK 2.118.0. Both corrected, with specific error-message assertions retained.
Mobile/desktop waiting screenshots inspected; final navigation links use existing
button classes for touch targets. PNGs are ignored local artifacts, not a rewrite
of other participants' design evidence. Installation retains 3 inherited dev
audit findings; build retains the existing 3D chunk warning and empty Auth chunk
without public env. No dependency update in this task.

Current-stage publication hashes are recorded in the seller handoff;
the counts later in this document describe the preceding readiness stage.
Implementation `b156bc3f96fb514b4e31c95a4e23294c6114afb3` was pushed successfully
to the existing branch/PR #31 with local/remote HEAD verified equal. Final
publication metadata is a separate docs-only checkpoint; no merge or deployment.
No callback E2E is claimed. Synthetic browser tests run the real SDK against
isolated local HTTP, with no real accounts, email or financial writes.

---

# Historical readiness audit (before captain approval)

## Scope and approved base

Branch: `feature/seller-registration-onboarding`. Captain/user explicitly approved
`origin/integration/voice-preview-061` at
`0737439915c17e8d8f20cddcbe9e75bebede9b46`.
Separate worktree; no merge of PR #14, #23 or #28. API **0.6.1** is preserved.
PR #28's QA branch is not the production base. Global styles/shared UI belong to
participant #6; this task reuses existing components without changing their files.

**Registration is Blocked on onboarding agreement.** The base approval does not
approve membership provisioning, invitations or email callback URLs. No signup
page, signup/resend call, backend endpoint, automatic role or Demo membership is
introduced by this readiness change. Task sections 3–4 require agreement first;
section 11 explicitly permits an independent audit/tests/UX Draft.

## What exists

| Area | Verified implementation |
| --- | --- |
| Auth | One Supabase client/AuthProvider, `signInWithPassword`, local-scope logout; public configuration only |
| Session | `persistSession: true`, `autoRefreshToken: true`; SDK auth events update the current identity |
| Isolation | Runtime/query keys include session generation; cache cleared on identity changes; A→B→A late-401 regression passes |
| Callback | `detectSessionInUrl: false`; no registration/callback route or email-link handler yet |
| Protected routes | Anonymous → Login; authenticated → `/me`; pending/error/retry; no automatic Demo |
| Memberships | BusinessProvider receives only validated `/me.businesses`; arbitrary URL business ID grants no access |
| Zero memberships | Authenticated empty state on all seller routes; RU/KZ, logout and explicit GET refresh; no business-data requests |
| Errors | Login shows a generic localized failure without exposing raw SDK/server text; no dedicated unconfirmed-email message yet |
| Demo | Explicit user action; memory-only session; customer/money writes disabled; no live API requests or automatic fallback |

Source: `apps/web/src/app/{auth,App,runtime,pages}.tsx`,
`apps/web/src/shared/{api,demo}` and existing regression tests.

## Backend contract and concrete questions for the captain

Read-only review of `packages/contracts/openapi.json` and
`apps/api/app/{routers,schemas,models}.py`:

- GET `/api/v1/me` returns the verified subject and memberships with role
  **owner**. A valid subject with no owner memberships gets
  `{ "id": "<subject UUID>", "businesses": [] }`, not fabricated access.
- There are no business creation, staff invitation, invitation acceptance or
  membership assignment endpoints in this approved contract.
- Public business listings do not grant private access. Existing server seed /
  owner-binding scripts are not self-service APIs and were not run.
- Staff roles are not represented in the current membership schema.

Decisions requested (not presumed approved), also sent to the established backend
channel: [PR #18 coordination comment](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6217630633).

1. Who creates a new business: captain/admin, or a future self-service API?
2. Is self-service creation in this release? If yes, publish the schema and
   authorization rules before frontend implementation.
3. How does the owner invite staff? Is staff onboarding deferred while the
   contract only supports `owner`?
4. Who assigns the initial owner membership and how does a user request it?
5. Confirm that no additional approved provisioning/invitation endpoints have
   superseded API 0.6.1.
6. Confirm the zero-membership waiting state + explicit `/me` refresh as the
   initial release path, without automatic assignment.
7. Confirm intended roles and access policy for new accounts.
8. Confirm email signup, confirmation, resend policy, allowed callback URLs and
   the intended post-confirmation destination. Provide configuration decisions,
   not passwords, JWTs or server keys.

Proposed minimum flow: existing Supabase AuthProvider `signUp` → honest
email-confirmation waiting screen when session is null → approved callback →
existing `/me` → existing seller UI for assigned memberships, otherwise the
waiting state. Creating a point / inviting staff remains unavailable until a
real API exists. Resend is explicit, rate-limited by the service, never automatic.
Duplicate-email handling must follow Supabase's anti-enumeration behavior and
must not promise that an account was created.

## Public Supabase policy: read-only observation

On 2026-10-16, the project's public `/auth/v1/settings` response reported:
`disable_signup=false`, `external.email=true`, `mailer_autoconfirm=false`.
Email signup is enabled and email confirmation is required. No users were
created, emails sent or project settings changed.

This does not verify SMTP delivery, redirect allowlist, password policy, resend
quota or live browser login. Captain must confirm the deployed redirect URLs.
The current `detectSessionInUrl: false` means a callback implementation is still
needed. A successful signup with a null session must never be treated as login.
Invalid/expired callback errors should use localized messages and must not clear
an unrelated valid session or render raw URL error descriptions.

SDK references:
[signUp](https://supabase.com/docs/reference/javascript/auth-signup),
[resend](https://supabase.com/docs/reference/javascript/auth-resend),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
These describe intended integration, not implemented registration.

## Independent UX changes

- Reproduced duplicate synchronous Login submits: **two SDK calls** before the
  fix. A synchronous ref lock now admits one request, disables submit and Demo
  while pending, and restores controls after rejection. Inputs remain available.
- Demo text is exactly:
  - RU: «В деморежиме используются учебные данные; изменения не сохраняются»
  - KZ: «Демо режимінде оқу деректері қолданылады; өзгерістер сақталмайды»
- The zero-membership hint states that creating a point and invitations are not
  available. Refresh calls only existing GET `/me`, deduplicates pending refetch,
  and never assigns membership. A later server assignment can unlock the UI.

## PR #14 comparison

The approved base already contains session generation and the confirmed
A→B→A/late401 protections. Read-only comparison against
`fix/seller-auth-unicode:28960f21e13c9c38077bf68b7bb5449eb9aa824d`
found additional stale-signOut generation checks and a preflight identity check
before `getSession` in PR #14. They are not imported automatically. This task
does not claim the entire PR is included. Captain can commission a focused
comparison/integration separately; Backend/Unicode contracts remain unchanged.

Publication fetch also found `fix/seller-cabinet-reliability:fd21874` with
customer recovery and the additional stale-signOut safeguards. Its RU/KZ changes
add customer-recovery keys in a different section from this task's copy; this
task does not touch its AuthProvider/layout/customer/API files or shared fixtures.
`feature/unified-visual-3d-d:3765ddb` changes global/public styles, and
`backend/ai-runtime-diagnostics:33cb37a` changes backend diagnostics.
All were compared read-only; no automatic integration. The approved base remains
`07374399`, so those independent changes are not claimed as part of this Draft.

## Verification matrix and limits

| Category | Status / evidence |
| --- | --- |
| Login/logout/protected/session refresh/A→B→A/late401 | Existing regressions plus new Auth readiness unit/browser tests |
| Zero memberships | Seven seller routes, RU/KZ, no foreign data, explicit refresh, logout, subsequent owner session |
| Demo | Exact labels and no auth/API/money writes checked |
| Keyboard/mobile | Browser acceptance at 360/390/768/1440; Tab/Enter, no horizontal overflow |
| Invalid email/double submit/unconfirmed login | Browser constraints and synthetic SDK HTTP rejection; not a live Auth acceptance |
| Signup/password mismatch/weak password/duplicate email/resend/callback links | **Blocked**: registration flow not approved or implemented |
| Real Supabase login/email delivery | **Not run**: no approved test credentials/flow; public settings read is not login |
| Voice/Ledger/Analytics/public | All available regression commands below passed |
| Physical Android / live Gemini | Separate [acceptance checklist](qa/ANDROID_VOICE_ACCEPTANCE.md); **Blocked**, not replaced by Chromium |

Only the two test files `e2e/voice-integration.acceptance.ts` and
`e2e/voice-integration.playwright.config.ts` were selectively copied, after review,
from own QA commit `c1ea88aba2775a6c7d5eaebdd7fd0f9863832561` (PR #28).
They exercise customer creation, sale, identical-key retry after lost response,
repayment, history, summary and Analytics 7/30 against canned HTTP snapshots.
No production code, branch merge or PR #28 modification is involved; this is not
a server-idempotency proof or live money acceptance.

New browser tests use the production App and real Supabase SDK with local
synthetic HTTP. No real customer/audio/financial writes. Existing screenshot
tests accept an optional `QADAM_SCREENSHOT_ROOT` so a full regression can run
without overwriting the designer's tracked images; the default is unchanged.

## Commands

Run from `apps/web` (Windows: `npm.cmd` / `npx.cmd`):

```powershell
npm ci
npm run check:api
npm run typecheck
npm run lint
npm test -- --no-file-parallelism
npm run build
npm run format:check
npx vitest run --config vitest.microphone.config.ts
npm run test:e2e -- --config e2e/auth-onboarding.playwright.config.ts
npm run test:e2e -- --config e2e/microphone.playwright.config.ts
$env:QADAM_SCREENSHOT_ROOT = "./test-results/registration-screenshots"
npm run test:e2e -- --config e2e/analytics.playwright.config.ts
Remove-Item Env:QADAM_SCREENSHOT_ROOT
npm run test:e2e -- --config e2e/qa.playwright.config.ts --trace off
npm run test:e2e -- --config e2e/voice-integration.playwright.config.ts
git diff --check
```

Observed results for this branch on 2026-10-16:

| Check | Result |
| --- | --- |
| npm ci | PASS, lockfile unchanged |
| check:api / typecheck / lint / build / format:check / diff --check | PASS |
| Full unit/component | **254/254**, 18 files, serial |
| Strict microphone/lifecycle component gate | **35/35**, including 8 extra lifecycle acceptance cases; overlaps 27 default cases |
| Auth onboarding browser | **7/7**, production App + real SDK + synthetic HTTP |
| Voice microphone browser | **18/18**, generated/fake Chromium audio, not physical Android |
| Standard Seller/Analytics/public browser | **24/24**, including screenshot writers |
| Existing Auth/Customers QA browser | **21/21**, includes 8 Seller cases also in the standard suite |
| Customer → money retry → repayment → history/summary → Analytics | **1/1**, synthetic server snapshots; original Idempotency-Key/body preserved |

No skipped/inverted failing acceptance checks were added. The first new
double-submit regression reproduced two SDK calls before the UI lock fix.
Initial new test typing/formatting errors were corrected; the final commands
above passed. New 360/1440 empty-state screenshots were visually inspected.
All generated PNGs are local ignored test artifacts; old tracked PNGs unchanged.

Inherited npm installation findings: 3 dev-dependency audit findings (1 moderate,
2 critical); package/lock were not updated in this task. Build reports the existing
large 3D chunk and an empty Auth chunk when public configuration is absent;
the isolated browser suites supply synthetic public configuration and execute the
real SDK. Neither build nor those fixtures certify live Supabase login.

Do not reuse the current HTTPS server for synthetic tests. Dedicated test
servers use isolated ports and `reuseExistingServer: false`.

## Publication

Verified code `54a78322495ebdf13fd339dbdbecde61bcda7f88` published successfully;
local/remote HEAD matched. [Open Draft PR #31](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/31)
targets `integration/voice-preview-061`, GitHub mergeable=true, merged=false.
Final docs-only checkpoint: see [seller handoff](handoffs/seller-web.md);
`git log -1 --format=%H` returns the exact latest hash.
Pending: onboarding agreement, live signup/email/browser validation, physical
Android. No deployment, backend/CORS/Supabase change or merge is part of this task.
