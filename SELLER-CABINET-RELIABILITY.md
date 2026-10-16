# Seller cabinet reliability

## Scope and baseline

Work is on `fix/seller-cabinet-reliability`, based on
`origin/integration/seller-analytics-061`. The integration branch did not
already contain the customer-creation recovery UI. PR #19 described a
backend-first approach; PR #22 defines the idempotent customer-create API and
receipt lookup. The supplied backend is now running API 0.6.2 (backend commit
`4e983b42a2a0466d2fc07e4de09becf87a8ef7d5`). Its published OpenAPI was
compared with the PR #22 0.6.2 contract at `e441401`; they match exactly. The
updated `openapi.json` and generated `generated.ts` also have the exact PR #22
blob hashes (`eefad96e…` and `336d089b…`). The integration snapshot had 0.6.1,
so both checked-in files are now current with the published backend.

Existing seller screens and responsive styling were retained; this change is
not a visual redesign. No backend, Voice, 3D, or Flutter code was changed.

## Changes

- Added recovery using the PR #22 contract: one persisted idempotency key per
  attempt, a body fingerprint rather than persisted customer details, receipt
  lookup before sending and after an uncertain response, and safe same-key
  retry only with the original input. A `not_observed` receipt is presented as
  an unknown outcome, never as proof that creation failed. The client does not
  send a create request when the recovery endpoint is unavailable.
- Scoped durable intent storage by API base, authenticated user, and business;
  legacy intents are migrated without changing their key or body fingerprint.
- Shared the page recovery coordinator with the `CustomerPicker` form and made
  the create action re-read its durable intent before choosing a key. This
  closes the reviewed cross-form path that could otherwise send a second key
  after an unknown picker result. A regression verifies the same key is reused.
- Added duplicate-submit protection and clear Russian and Kazakh messages.
- Applied the required Unicode code-point input-limit validation.
- Carried only the stale logout/session-response protections needed for
  A → B → A, rather than re-merging the full older PR #14 branch. For
  integration with PR #31, retain these protections alongside PR #31's
  `signUp`, `resendConfirmation`, registration in-flight guard, and confirmation
  marker behavior; do not replace either whole `auth.tsx` with the other branch.
- Expanded local mocked regressions for recovery, reload, timeout/lost response,
  `CustomerPicker`, Auth A → B → A transitions, and the mobile route matrix.

## Verification

Recovery/customer-write browser checks use mocks; no authenticated live
recovery or customer-data request was made.

- The deployed `/health` returned HTTP 200 and `/openapi.json` reported 0.6.2.
  Its OpenAPI matches PR #22's published OpenAPI exactly; generated type blob
  hash matches the PR #22 generated file. Unauthenticated `/api/v1/me` returned
  HTTP 401; no live customer write was attempted.
- `npm test -- --maxWorkers=1 --minWorkers=1`: **213/213 passed**.
- `npx vitest run src/test/qa-customers-regression.test.tsx`: **32/32 passed**,
  including the reviewed picker-unknown → page-form same-key retry.
- `npm run test:e2e -- --config e2e/qa.playwright.config.ts`: **22/22 passed**.
  This includes intercepted auth/API workflows and seller navigation/overflow
  checks at 360, 390, 768, and 1440 px, plus customer search, inquiries and
  mobile menu behavior.
- `npm run build`: passed.
- `npm run generate:api` regenerated frontend types from the live OpenAPI 0.6.2.
- `npm run check:api`: passed against the updated 0.6.2 OpenAPI; generated
  types include the optional POST `Idempotency-Key`, the required recovery GET
  header, and the `completed | not_observed` response union.
- `npm run lint`, `npm run typecheck`, Prettier check, and `git diff --check`:
  passed.

An earlier default-parallel unit run failed five tests (timeouts and dependent
UI expectations); after serializing the run, the complete current suite passed.
The default-parallel mode was not rerun; no test was skipped in the serial run.

## Remaining blockers

The backend rollout blocker is cleared. Live acceptance still requires a
configured frontend auth environment and an approved training account/session
with the two training points plus a known foreign test point. This checkout has
no Vite/Supabase environment configured; the only live identity probe returned
401. Until that access is available, no customer creation or common-database
mutation was attempted. The requested live create/lost-response/reload,
CustomerPicker, A/B, and foreign-point checks remain pending.

PR #31 overlaps in `apps/web/src/app/auth.tsx`. Its registration behavior is
not merged into this branch; integration must combine both sets of guards,
preserving stale logout/getToken fencing and PR #31's registration methods and
in-flight protection. Integration review also recorded a reproduction of the
cross-form duplicate-key risk; this branch now shares the recovery hook on the
Customers page and has a regression for the original sequence.

The production build also emits the existing large-chunk warning for the 3D
controls bundle; the 3D area was out of scope.

The branch is pushed, but the available GitHub integration is read-only and the
browser is not signed in, so this session cannot create the Draft PR. The
comparison page is ready at
<https://github.com/foxfordkz-cyber/qadamx-taraz/compare/integration/seller-analytics-061...fix/seller-cabinet-reliability?expand=1>.
