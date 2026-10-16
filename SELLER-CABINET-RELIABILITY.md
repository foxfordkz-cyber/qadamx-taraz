# Seller cabinet reliability

## Scope and baseline

Work is on `fix/seller-cabinet-reliability`, based on
`origin/integration/seller-analytics-061`. The integration branch did not
already contain the customer-creation recovery UI. PR #19 described a
backend-first approach; PR #22 defines the idempotent customer-create API and
receipt lookup. The integration snapshot uses the earlier API contract, and
rollout of the recovery endpoints has not been confirmed.

Existing seller screens and responsive styling were retained; this change is
not a visual redesign. No backend, Voice, 3D, or Flutter code was changed.

## Changes

- Added recovery using the PR #22 contract: one persisted idempotency key per
  attempt, a body fingerprint rather than persisted customer details, receipt
  lookup before sending and after an uncertain response, and safe same-key
  retry only with the original input. A `not_observed` receipt is presented as
  an unknown outcome, never as proof that creation failed. The client does not
  send a create request when the recovery endpoint is unavailable.
- Connected the recovery state and duplicate-submit protection to both the
  customers page and the customer form opened from `CustomerPicker`; added
  clear Russian and Kazakh messages.
- Applied the required Unicode code-point input-limit validation.
- Carried only the missing Auth protections needed for stale logout/session
  responses, rather than re-merging the full older PR #14 branch.
- Expanded local mocked regressions for recovery, reload, timeout/lost response,
  `CustomerPicker`, Auth A → B → A transitions, and the mobile route matrix.

## Verification

All recovery/browser checks use mocks; no live recovery backend was contacted.

- `npm test -- --maxWorkers=1 --minWorkers=1`: **212/212 passed**.
- `npm run test:e2e -- --config e2e/qa.playwright.config.ts`: **22/22 passed**.
  This includes intercepted auth/API workflows and seller navigation/overflow
  checks at 360, 390, 768, and 1440 px, plus customer search, inquiries and
  mobile menu behavior.
- `npm run build`: passed.
- `npm run check:api`: passed; generated API types match the checked-in OpenAPI.
- `npm run lint`, `npm run typecheck`, Prettier check, and `git diff --check`:
  passed.

The default parallel unit-test run initially had five failures under worker
contention (three timeouts and two dependent UI expectations). The complete
suite passed on a single worker; no test was skipped.

## Remaining blocker

Backend rollout of the PR #22 recovery endpoints is unconfirmed. Therefore,
live acceptance, including verification against a deployed 0.6.2 backend, is
intentionally deferred until the backend agent confirms rollout. The production
build also emits the existing large-chunk warning for the 3D controls bundle;
the 3D area was out of scope.

The branch is pushed. A Draft PR could not be created from this session because
the available GitHub integration is read-only and the browser is not signed in.
The comparison page is ready at
<https://github.com/foxfordkz-cyber/qadamx-taraz/compare/integration/seller-analytics-061...fix/seller-cabinet-reliability?expand=1>.
