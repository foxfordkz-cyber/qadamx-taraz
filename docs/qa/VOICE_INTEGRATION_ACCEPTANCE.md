# Voice integration acceptance — Stage B

2026-10-16. Independent QA/review of Aidana's shared `apps/web` adaptation.
**Synthetic acceptance PASS; physical Android and live Gemini BLOCKED.**
This report is not a deployment or permission to merge.

## Exact source and ownership

| Ref | Verified SHA |
| --- | --- |
| Approved base `integration/seller-analytics-061` | `13248851fd2b2a502aff211a506f71e85c2b0ab1` |
| Aidana ready commit, Draft PR #23 | `a1e5252478eec61d85607b41557ff584b52cfe17` |
| Scoped import commit | `36d58cc775cac5c8e0f024e0a9fb49d069354b70` |
| Verified build and new integration test | `c1ea88aba2775a6c7d5eaebdd7fd0f9863832561` |
| Verification head branch | `test/voice-integration-acceptance` |
| Draft PR base | `integration/seller-analytics-061` |

The user explicitly approved this base in place of the older combined branch.
Separate worktree: `work/qadam-voice-integration-check`.
[Owner's final readiness](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21#issuecomment-6216296886)
identifies the final label/error-markup commit; the earlier `8dc6f895` is not the final tested source.

Only 16 agreed owner files were restored from that exact SHA; no branch merge/cherry-pick,
old root app, backend, or unrelated work was imported. Production voice is byte-identical
to Aidana's source. QA did not implement production playback/cancel.
The later documentation commit leaves the verified application/test code unchanged.
Obtain the current documentation HEAD with `git log -1 --format=%H`.

Published [Draft PR #28](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/28),
base/head as above, GitHub mergeable=true. Initial report HEAD
`2a5a5bbec5fa5606e23490a0b85ba5bf9d644d27` was pushed successfully and matched remote.
This publication note is docs-only; no deployment or merge was performed.

The approved base and owner HEAD were checked again after tests. Fresh fetch also found
captain's `integration/voice-preview-061:0737439915c17e8d8f20cddcbe9e75bebede9b46`
(code merge `7f511ddc8f3dc0a6fc1550566b9ead9abbfb98ce`).
Its `apps/web/src`, `apps/api`, contracts and voice files match this build.
That branch was inspected, not merged or modified. Its additional deployment documentation
does not change our approved PR base.

## Files and duplicate-test decision

Imported unchanged from the owner:

- Production: `apps/web/src/features/voice/{AudioInput.tsx,AudioPreview.tsx,Sale.tsx,audioContract.ts,i18n.ts,recorder.ts,voice.css}`.
- QA: `apps/web/src/test/{microphone-acceptance.test.tsx,microphone-fixtures.tsx,microphone-known-gaps.test.tsx,microphone-lifecycle.acceptance.tsx,voice-adaptation.test.tsx}`.
- QA configuration: `apps/web/vitest.microphone.config.ts`, `apps/web/e2e/{microphone.acceptance.ts,microphone.playwright.config.ts}`.
- Owner's handoff: `docs/handoffs/ledger-web.md`.

Added by this verification:

- `apps/web/e2e/voice-integration.acceptance.ts`: real UI journey with isolated contract-shaped responses.
- `apps/web/e2e/voice-integration.playwright.config.ts`: synthetic environment on port 4201, no server reuse, traces/video/screenshots off.
- This report and updated `docs/handoffs/seller-web.md`.

Stage A reports are preserved in [PR #21](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21):
[7 root causes / all 19 failing assertions](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/ae98f263b69cf06466ecc0ddca54f547c7cafb2b/docs/qa/VOICE_FAILURE_ROOT_CAUSES.md)
and [PR20/21 ancestry and file comparison](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/ae98f263b69cf06466ecc0ddca54f547c7cafb2b/docs/qa/VOICE_PR20_PR21_COMPARISON.md).
PR21 was the canonical QA source because it contained the unique 8 lifecycle and 5 browser
cases in addition to PR20 coverage. Aidana already incorporated that source.
The tests are included once; PR20/21 are not merged again. PR23 and this verification PR
also overlap: the captain should choose one production integration path, not import both blindly.

Protected-path diff against base is empty for backend, OpenAPI/generated, app/shared/Auth,
ledger/summary, Seller/Analytics, public storefront/inquiry, 3D/assets, package/lock and global
styles. The only production CSS added is the owner's `features/voice/voice.css`.
Existing screenshots and shared preview processes were not changed. PR19 and customer
recovery were not touched.

## Own test results

All counts below are our executions on this worktree, not results copied from the captain
or owner. Default and strict suites overlap by 27 tests; their union is 250 unique cases.
Browser suites below overlap by the 8 existing seller cases: 61 passed executions,
53 unique cases, excluding diagnostic reruns.

| Category | Result | Boundary |
| --- | --- | --- |
| `npm ci` | PASS | Existing lockfile, no dependency change |
| `check:api`, `typecheck`, `lint`, `build`, `format:check`, `git diff --check` | PASS | Final new test also typechecked/linted/formatted |
| Default unit/component | **242/242**, 17 files | Serial Vitest; mock SDK/HTTP boundaries |
| Strict microphone | **35/35**, 3 files | 22 baseline + 5 MIC + 8 VP, ordinary assertions |
| Native Chromium microphone E2E | **18/18** final serial run | Actual MediaRecorder/playback, generated fake audio device; intercepted Auth/API |
| Seller + integration design + Analytics | **21/21** | Demo / synthetic HTTP; widths 360/390/768/1440 |
| Existing browser QA | **21/21** | Auth/customer isolation, synthetic SDK/API responses |
| New customer → money → Analytics journey | **1/1** | Real app actions, canned API 0.6.1 snapshots |
| Own public HTTPS probes | **frontend 200, health 200** | Read-only availability only, not Auth/DB acceptance |
| Live Backend/Auth/DB writes | **Not performed in this verification** | Captain's separate results are not ours |
| Physical Android Chrome / microphone / OS permission UI | **BLOCKED** | ADB: 0 authorized, 0 offline/unauthorized devices |
| Live Gemini / real RU/KZ voice | **BLOCKED** | No physical device, approved live AI run or human recording used |

The normal E2E command was run with explicit config and file selection.
Three existing screenshot-writer scenarios were intentionally not executed:
`screenshots.spec.ts`, `public-design.spec.ts`, and the capture-only Analytics case.
They write into tracked designer artifact directories. No assertions were weakened or
tests marked skip/todo; functional Seller/Analytics tests ran, and public source remained
unchanged. This is not a claim that every default E2E file was rerun.

### Diagnostic attempts and remaining uncertainty

- First native suite: **17 pass / 1 fail**, the unchanged 30-second auto-stop check timed
  out at its 36-second visibility deadline while other checks/builds ran concurrently.
  The failure snapshot already showed the ready recording. This does not prove the
  cause was machine load. Exact isolated rerun: **1/1 PASS**; full serial rerun:
  **18/18 PASS**, same source/assertions/timeouts, retries=0. Retain this as an observed
  timing flake to monitor; no production defect was established by the reruns.
- The new money test initially expected an em dash for null average in an empty shop.
  Existing agreed UI renders **«Нет продаж»**. Only this new expectation was corrected
  after inspecting AnalyticsPage; the final journey passed. Production was unchanged.
- Owner's one pre-existing E2E expectation update preserves typed fallback text after
  recording. It matches the agreed requirement; audio XOR text multipart, explicit
  Prepare, and zero unexpected money-write assertions remain.
- Corrected microphone failures are ordinary tests; no `it.fails`, skip, or todo is used
  to make this gate green. Historical strings “currently absent” / `@acceptance-gap`
  in test names are retained source labels, not current failure status.
- Existing npm audit findings: **3 development dependency findings** (1 moderate,
  2 critical) in Vitest/@vitest/mocker/Tinypool. No force-upgrade was attempted.
  The exact report is local `apps/web/test-results/voice-verification-audit.json`.
  Build retains large 3D-chunk and unconfigured-auth empty-chunk warnings.
- Customer POST recovery, PR14's remaining independent safeguards, and physical device
  acceptance remain separate work. No changes to their contracts or behavior here.

## Root-cause closure from Stage A

| Cause | Evidence after owner's adaptation | Current synthetic status |
| --- | --- | --- |
| RC01: missing preview/playback controls | Native Play/Pause/Replay; delete/replacement/navigation URL cleanup at 4 widths | PASS |
| RC02: missing Cancel | VP01/02/03 and native record/cancel; stop→cancel is terminal | PASS |
| RC03: stale capture ownership | MIC01/02, VP04/08; disabled/unmount/late permission/onstop cannot revive a capture | PASS |
| RC04: idle before final stop callback | VP05; stopping stays busy, repeated Stop cannot start another recorder | PASS |
| RC05: recorder errors not handled | MIC04/VP07; UI recovers, tracks released, no invalid upload | PASS |
| RC06: ended audio tracks ignored | VP06; interruption surfaces without success | PASS |
| RC07: empty/oversized recorded blob accepted | MIC05 empty/over-limit plus MIME/file boundaries | PASS |

The former 13 component + 6 browser failures are covered by passing assertions now.
No remaining reproducible voice assertion failure in the final runs. The timing
observation above remains disclosed. Native MIME/permission tests run in desktop Chromium
with fake-device flags, not an Android microphone or Gemini.

## Auth / Ledger / Analytics evidence

- Existing unit/browser tests cover login/logout, restored session, account/shop isolation,
  late successful responses, and A→B→A with a late 401 (including Analytics).
- New UI test creates one synthetic customer using the real form/CustomerPicker.
  It primes both Analytics periods with zero data, fills a manual sale 3000 ₸ / 1000 ₸,
  and synchronously clicks Confirm twice. While the first response is held, exactly one
  POST is observed and retry is disabled.
- Test fixture records the canned sale then aborts its response. UI shows unknown,
  never success, and does not send a replacement operation. Explicit retry has exactly
  the same key and serialized body; the fixture returns the same operation.
- Summary shows 3000 / 1000 / debt 2000. Actual `useWrite` invalidation refreshes the
  previously cached Analytics 7 and 30 views; no test-side cache invalidation is used.
- UI repayment 500 uses a fresh operation key and the original sale ID. History contains
  one sale and one repayment; Summary and Analytics show 3000 / 1500 / debt 1500.
  Charts expose 30 daily and 24 hourly entries. Reload preserves authenticated access;
  changing to another allowed shop shows its zero snapshot, then switching back recovers
  the correct shop's values. Exactly three money HTTP requests (sale, retry, repayment)
  and one customer POST occur.
- This verifies frontend request/UX/cache behavior only. The canned server stores no real
  data and cannot establish server atomicity, durable idempotency, JWT validation or
  financial correctness in PostgreSQL.

## Reproduction

Run from `apps/web`, Node/npm versions from the checked-in project requirements.
On Windows use `npm.cmd` / `npx.cmd` if PowerShell script execution is restricted.
Run the browser suites serially and preserve their separate output folders.

```powershell
npm ci
npm run check:api
npm run typecheck
npm run lint
npm test -- --no-file-parallelism
npm run build
npm run format:check
npx vitest run --config vitest.microphone.config.ts
npx playwright test --config e2e/microphone.playwright.config.ts --output test-results/voice-verification-mic-serial
npm run test:e2e -- --config e2e/analytics.playwright.config.ts seller.spec.ts integration-design.spec.ts analytics.spec.ts --grep-invert "capture genuine desktop/mobile Analytics" --output test-results/voice-verification-seller-analytics
npm run test:e2e -- --config e2e/qa.playwright.config.ts --trace off --output test-results/voice-verification-qa
npx playwright test --config e2e/voice-integration.playwright.config.ts --output test-results/voice-verification-money-final
git diff --check
```

If Chromium is absent, install it with `npx playwright install chromium`.
JSON reports were written locally with `PLAYWRIGHT_JSON_OUTPUT_FILE` to
`test-results/voice-verification-{mic,mic-serial,timer-isolated,money,money-final,seller-analytics,qa}.json`;
strict unit output is `voice-verification-unit.json`.
No personal audio, tokens, browser sessions or live-data screenshots were persisted.

## Backend handoff and physical acceptance

Pass the verified code SHA **c1ea88aba2775a6c7d5eaebdd7fd0f9863832561**, base
**13248851fd2b2a502aff211a506f71e85c2b0ab1**, and owner
**a1e5252478eec61d85607b41557ff584b52cfe17** to the backend agent through the existing PR18
GitHub conversation. Final documentation HEAD and Draft PR are recorded there on publication.

Captain's newer [restored preview report](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/0737439915c17e8d8f20cddcbe9e75bebede9b46/docs/VOICE_HTTPS_RESTORED.md)
reports deployment of the same production code under a different integration commit.
Our own read-only probes at approximately 18:59 Asia/Qyzylorda returned 200 from:

- [Frontend login](https://negotiations-exist-newman-ohio.trycloudflare.com/login).
- [API health](https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1/health).

Older crucial/kelkoo quick-tunnel addresses no longer resolved. Do not reuse them.
Current links are temporary; confirm with the captain before device acceptance.
No preview, API, tunnel, CORS, Supabase, DB, migration or Storage configuration was changed
by this QA work. Do not automatically switch an existing deployment to this verification branch.

Backend/preview owner should confirm the served source, HTTPS API base, exact CORS origin,
public-only frontend configuration, authenticated `/me`, allowed business scope, and current
AI endpoint contract. Device testing must use an approved training account and point.
Obtain credentials privately. No new money writes to shared DB without a separate approval.

Physical Android checklist (currently BLOCKED):

1. Record model, Android version, Chrome version, tested HTTPS origin and served code SHA.
2. Open login over HTTPS; sign in to the training account and choose its allowed point.
3. Check permission allow; record a short consented RU/KZ phrase (up to 30 seconds).
4. Stop → Playback → Pause → Replay. Note actual supported MIME and non-empty clip.
5. Check Cancel during recording, Stop→Cancel, repeat record, Delete, route exit.
6. Verify permission denial and revoked permission; text, file upload and manual entry remain usable.
7. Select a permitted audio file; listen/delete it; verify no upload before explicit Prepare.
8. With separate AI-test approval, explicitly Prepare → inspect Gemini draft. Without it,
   leave Live Gemini BLOCKED. Recording/playback must never create a financial operation.
9. Check mobile navigation/forms at the device width. Manual financial confirmation is a
   separate action and requires its own shared-DB authorization.
10. Record Physical microphone PASS/FAIL/BLOCKED, Live Gemini PASS/FAIL/BLOCKED and Synthetic
    Playwright PASS/FAIL separately; keep audio private unless the speaker explicitly consents.

Do not restart shared services, change backend/CORS or import customer recovery to perform
this checklist. Handoff is an acceptance request, not a claim of deployment completion.
