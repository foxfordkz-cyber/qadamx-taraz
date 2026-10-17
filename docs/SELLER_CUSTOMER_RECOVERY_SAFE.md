# Seller Customer Recovery — safe integration

2026-10-17. Branch `fix/seller-customer-recovery-safe`, based on main
`07197bec0a8ac331714eea3036f3af6eac939e7e` in a separate worktree.
Selected source: `fix/seller-cabinet-reliability`
`9a3c8687e59d70fa5d4fdbb99695af538a068791`. No merge of that branch.
Backend, OpenAPI, generated types, financial rules, Voice and public modules
are unchanged. The existing API 0.6.2 [contract](../packages/contracts/CUSTOMER_RECOVERY_API.md)
is authoritative.

## Defect and evidence

The old hook unconditionally removed its storage key on success. After form A
unmounted, its delayed K1 response could delete a newer form's pending K2.
The captain's `docs/reviews/recovery-late-review.test.tsx.txt` was copied into
`apps/web/src/test/recovery-late-review.test.tsx` without changing its assertions.
On the selectively imported old implementation it failed: expected the K2 marker,
received `null`. With the coordinator it passes as an ordinary regression test.
Only formatting changed in the copied test. Local before/after logs are ignored
under `apps/web/test-results/recovery`; they are not live backend evidence.

## Architecture and invariants

- One coordinator is shared by CustomerPicker and Customers forms for the same
  API base, authenticated session epoch, user and business. Every mounted form
  has its own operation owner; parent observers do not keep an unmounted form's
  request alive. Runtime/Auth generation invalidates old A → B → A callbacks.
- Durable scope includes normalized API base, user and business, but not epoch,
  allowing a new authenticated session to recover via GET. Storage contains only
  `{key, bodyHash}`. Names, contact, note, request body and JWT are never persisted.
- A short native Web Lock serializes marker claim/read/compare-and-clear across
  tabs. No HTTP request holds a lock. Missing Web Locks, unavailable storage,
  invalid scope or a corrupt marker blocks creation rather than using a weaker
  fallback. HTTPS/localhost and a supporting browser are required.
- A completed response clears only the exact key AND body hash, under the lock,
  with a current mounted owner. A stale K1 response cannot remove K2. Changes
  from another tab cancel the old operation and adopt the current marker.
  External removal is not proof of completion: a mounted coordinator retains its
  unresolved intent until a receipt confirms it.
- The immutable input is captured before asynchronous work. Validation uses the
  existing Unicode code-point limits and the gateway's trim/default binding.
  SHA-256 covers canonical fields; old scoped v1 hashes are recognized without
  replacing their key/hash. A retry requires the exact original canonical body.
- Every initial POST uses a random Idempotency-Key. Existing intent → GET first;
  only explicit user submission can POST. No automatic POST retry, keyless
  fallback, new key after 409 or inference from one customer-list response.
  `not_observed` retains the key because an earlier worker may still commit.
- A 20-second total operation deadline covers lock wait, hashing and network
  work. AbortSignal plus operation ownership guards ignore transports that
  deliver a late result despite cancellation. Network loss/503 can trigger one
  read-only lookup within that deadline; a receipt confirms success, otherwise
  the outcome remains unknown.
- 400/401/403/404/409/422/429 reject the current POST but retain its intent:
  that rejection cannot disprove an earlier same-key attempt in another tab.
  The user can check status or retry the same body/key; there is no reset button
  that silently creates a replacement operation. Local validation runs before
  claiming a new intent.
- On reload only the marker survives; mount performs GET, never POST. Repeating
  requires re-entering the original fields. While mounted, fields remain in
  private memory across unknown results. Completing one form does not select a
  customer in another form or erase that form's later unsent draft.
- Legacy keys without API origin are blocked in place. No GET/POST, automatic
  migration, removal or attachment to the current server occurs. Captain must
  establish the original API and receipt before a separate approved recovery.

UI states are idle, saving, checking, complete, rejected and unknown, plus explicit
unavailable/storage/legacy/browser-capability blocks. RU/KZ copy distinguishes an
unknown outcome from a confirmed failure; support request IDs remain available.

## Files

Production:

- `apps/web/src/features/seller/{customer-recovery.ts,queries.ts,Customers.tsx,index.ts}`
- `apps/web/src/shared/api/{bindings.ts,gateway.ts}`
- `apps/web/src/shared/i18n/{ru.ts,kk.ts}`

Tests:

- `apps/web/src/test/{recovery-late-review.test.tsx,customer-recovery-coordinator.test.tsx,customer-recovery-forms.test.tsx,web-locks.ts}`
- `apps/web/src/test/{qa-customers-regression.test.tsx,qa-fixtures.tsx,screens.test.tsx,setup.ts}`
- `apps/web/e2e/{customer-recovery.acceptance.ts,customer-recovery.playwright.config.ts,qa-fixtures.ts}`

Documentation: this report, `docs/DECISIONS.md`, `docs/handoffs/seller-web.md`
and `docs/qa/SELLER_FINAL_DEMO_REHEARSAL.md`.

## Reproduction commands

From the repository root:

```powershell
git branch --show-current
git status --short
git log -1 --format=%H
cd apps/web
npm.cmd ci
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --no-file-parallelism
npm.cmd run build
npm.cmd run format:check
npx.cmd vitest run --config vitest.microphone.config.ts
npx.cmd playwright test --config e2e/customer-recovery.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/qa.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/voice-integration.playwright.config.ts --trace off
$env:QADAM_SCREENSHOT_ROOT = './test-results/recovery-screenshots'
npx.cmd playwright test --config e2e/analytics.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/auth-onboarding.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/microphone.playwright.config.ts --trace off
git diff --check
```

Local development uses `npm.cmd run dev -- --port 5173 --strictPort` with public
settings in an ignored `.env.local`; use an available dedicated port. The E2E
configs launch their own local servers with synthetic Auth/API data and do not
reuse a live preview. Preserve other participants' tracked screenshots.
Current run totals and publication status are in the [seller handoff](handoffs/seller-web.md).

## Limits and next acceptance

The browser tests exercise native Chromium Web Locks and two real tabs with
synthetic HTTP; unit tests use an explicit lock shim. Neither proves server
idempotency. Server guarantees come from the existing API contract and captain's
separate backend acceptance. No exactly-once claim applies across new keys,
different origins/authors, keyless legacy requests or manual removal of all
browser storage followed by a fresh load. A retained 4xx/legacy intent can need
captain reconciliation; do not manually clear it to bypass the safeguard.

Fresh production login/DB writes/paid AI/physical Android were not performed.
The [17-step rehearsal](qa/SELLER_FINAL_DEMO_REHEARSAL.md) separates local synthetic
evidence from blocked live actions. Registration remains separate Draft PR #31
at `6f808677c067cc00fb6b6b9eb26384f68c3d1e38`; callback/email need exact approved
Supabase redirect settings. This task performs no merge into main or deployment.
