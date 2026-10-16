# AudioInput Playback & Cancel — tests and owner review

2026-10-16. **Captain selected participant #4 as the sole production adaptation executor.
Codex owns tests and review only.** No production implementation is claimed by this branch.

## Git and coordination

- Repository: https://github.com/foxfordkz-cyber/qadamx-taraz
- Base: `integration/local-combined-check:58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`.
- Branch/worktree: `feature/voice-playback-cancel`, `work/qadam-voice-playback-cancel`.
- [Draft PR #21](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21) → integration/local-combined-check.
- Reviewed owner source: `feature/aidana-ai-assistant:880d7137f39648f0bbce355369ee3e755d981f02`.
- Selected QA source: [PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20),
  `test/mobile-microphone-acceptance:39a730e63e43bb8487ed2f9afb1ead7762737314`.
- [Initial overlap notification](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20#issuecomment-6215397726);
  [confirmed division of work](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20#issuecomment-6215571848).

Section 3 of the task prohibits competing implementations while owner work overlaps.
The captain subsequently confirmed: “Адаптацию выполняет участник №4; Codex готовит тесты и review”.
The assignment is resolved; no additional permission is needed for these tests.
The dependency is now an exact owner commit adapted to unified apps/web, not another approval to start production work here.

Initial audit/publication commits: `03226ff6f59a6eeae2338c8e5d000657b5400a82`,
`652a7d4d8a77286356a210afea4dc78a8ee6d316`, pushed successfully, local/remote equality verified.
Verified tests/review commit **`fedb4df6d44946dbc5172e4faf39e54c58f95e90`** was pushed successfully;
fetch/prune and own-branch pull --ff-only reported Already up to date, local/remote HEAD matched.
The subsequent docs commit records publication only. Current HEAD is in PR #21 and `git log -1 --format=%H`.
Only this branch is pushed. PR #19, main and other branches remain untouched; no merge/rebase/force.

## Review of the two implementations

Owner source is an older root application (`src/`, `backend/`), sharing ancestor
`ced32e7aa8e737a0cbc5318715ad02bdc98a89d4` with combined. It is not a patch against apps/web.
Do not merge its entire tree or copy the root API, session storage or financial logic.

| Area | Combined 58d4eb4 | Owner 880d713 | Requirement for the owner adaptation |
| --- | --- | --- | --- |
| Preview | AudioInput returns File, Sale shows filename | VoiceInput has native audio controls; Sale owns URL | Same selected File for preview and explicit Prepare; Play/Pause/replay, duration, RU/KZ |
| Cancel/delete | Only Stop, which publishes File | dispose, micRequest invalidation, file removal | Cancel requesting/recording/stopping; no stale callbacks; preserve text |
| Resource cleanup | Timer/tracks on Stop/unmount, alive flag | release/dispose + URL effect cleanup | Pause playback, revoke each URL, stop all tracks, detach listeners, guard every attempt |
| Submission | Explicit Prepare only | Stop-and-analyse plus listen-first actions | No upload from Stop/timer/Play/Cancel/Delete/unmount |
| Recorder | Three explicit MIME candidates, 30s timeout | More MIME fallback, pause/device/meter, 29s headroom | Preserve approved MIME/contract; avoid unrelated UI/protocol expansion |
| Shared architecture | Supabase/runtime/useWrite/shared i18n | Standalone root API/storage/mostly Kazakh strings | Adapt only minimal input coordination; no second app or financial rewrite |

### Review findings and acceptance gates

1. **P1 integration incompatibility: Stop-to-analysis must not be transplanted.**
   Owner [Sale.jsx line 35](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/880d7137f39648f0bbce355369ee3e755d981f02/src/features/voice/Sale.jsx#L35)
   calls parse from onReady when analyseRecording is set. This is source-observed behavior in the owner's
   broader feature, not a claim that its original requirements were wrong. The new task explicitly requires
   a separate submission action. Our browser tests assert zero draft/financial POST before Prepare.

2. **P2 adaptation requirement: playback cleanup needs explicit evidence.**
   Owner [Sale.jsx line 23](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/880d7137f39648f0bbce355369ee3e755d981f02/src/features/voice/Sale.jsx#L23)
   revokes object URLs, but there is no explicit audio-element pause in that cleanup.
   Do not treat revoke as a verified playback-stop result. New browser acceptance retains a reference to the
   actual element and checks paused plus URL revocation after delete/navigation. This has not been executed
   against the owner's standalone app; it is an unverified integration requirement.

3. **P2 adaptation requirement: unexpected stream ending.**
   Owner recorder has onerror/onstop but no track-ended handler in the inspected source.
   Verify loss of a track/permission releases remaining tracks and surfaces interruption without publishing
   a partial clip. VP-06 reproduces this gap in combined; it does not establish the owner's runtime result.

4. **P1 confirmed combined races:** VP-04 (late old onstop during a newer capture), VP-05 (double Stop starts
   another recording), VP-07 (error then final data/stop publishes File), VP-08 (late permission after fallback
   selection starts capture) fail against the unchanged actual AudioInput. Per-attempt generation must guard
   permission promises, all callbacks and timers; cleanup of an old capture must never stop a newer one.

Owner source already contains useful closed/failed/released and micRequest guards. Adapt those ideas to
existing AudioInput/Sale and shared RU/KZ; do not write a second parallel implementation.
Old root tests were read, not executed. No findings above claim a live Android or backend reproduction.

## Test files delivered

Five files selected from PR #20 without merging its history:

- `apps/web/src/test/microphone-fixtures.tsx`: browser-boundary doubles, now event-capable tracks with readyState.
  Track.stop deliberately does not dispatch ended; explicit device/permission-loss events do.
- `apps/web/src/test/microphone-acceptance.test.tsx`: 22 ordinary baseline microphone cases.
- `apps/web/src/test/microphone-known-gaps.test.tsx`: five inherited expected failures in default baseline;
  strict config makes them ordinary failures. Remove inversion individually when the owner fixes each.
- `apps/web/e2e/microphone.acceptance.ts`: native Chromium/fake-device checks plus expanded acceptance.
  Both former skipped playback/cancel cases now run as **ordinary tests**. No skips or test.fail markers.
- `apps/web/e2e/microphone.playwright.config.ts`: independent loopback server, no unknown server reuse,
  actual fake-device command-line check before getUserMedia, separate fake-UI allow/deny projects,
  external traffic/financial writes blocked, no audio/video/trace/screenshot capture.

Two new files:

- `apps/web/src/test/microphone-lifecycle.acceptance.tsx`: eight ordinary red acceptance cases.
  The explicit filename keeps this separate from default baseline, not hidden as passed/skipped.
- `apps/web/vitest.microphone.config.ts`: explicit strict gate, includes all 35 microphone component cases
  and sets QADAM_MIC_STRICT_KNOWN_GAPS=1. No expected-failure inversion in this command.

| ID | Desired regression |
| --- | --- |
| VP-01 | Cancel pending permission; release a late granted stream without starting |
| VP-02 | Cancel active recording; stop all tracks/timer; discard queued data/stop without error |
| VP-03 | Stop then Cancel before asynchronous onstop; do not publish |
| VP-04 | Old onstop after replacement capture cannot publish or affect its tracks |
| VP-05 | Double Stop cannot initiate a second capture while stopping |
| VP-06 | Track loss releases all remaining resources; no partial File |
| VP-07 | Recorder error followed by data/stop cannot publish failed audio |
| VP-08 | File fallback invalidates pending permission, preserving the selected file |

Browser additions exercise explicit Play/Pause/replay and keyboard controls; deletion, URL replacement,
navigation cleanup, text preservation, RU/KZ, reduced motion, 44px targets and overflow at 360/390/768/1440.
A new double-Prepare case holds the synthetic response to verify one multipart request and the busy guard.
The assertions beyond missing preview/cancel are prospective: they cannot be called verified until UI exists.

## Commands and interpretation

From `apps/web`, Windows npm.cmd/npx.cmd:

```powershell
npm.cmd ci
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --no-file-parallelism
npm.cmd run build
npm.cmd run format:check

# STRICT gate: exit 1 is the current real product result, not a passing baseline.
npx.cmd vitest run --config vitest.microphone.config.ts --reporter=default --reporter=json --outputFile=test-results/microphone-unit-strict.json
npx.cmd playwright test --config e2e/microphone.playwright.config.ts

# Existing scoped browser baseline, without tracked screenshot writers.
# Set CI=1 temporarily and restore its previous value after the command.
npm.cmd run test:e2e -- seller.spec.ts integration-design.spec.ts
git diff --check
```

Existing npm test retains the five inherited .fails cases. A green exit there is **not microphone acceptance**.
The strict commands must all pass after owner adaptation; do not change expectations merely to turn them green.
No old QADAM_MIC_ACCEPTANCE_GAPS opt-in is needed: browser gap tests are always ordinary tests now.
If the owner changes only labels/internal props, reconcile the test harness with the approved public UX while
preserving behavior assertions. No alternate production component may be injected to make this suite pass.

## Verification results

Fresh baseline before test transfer: npm ci/check:api/typecheck/lint/build/format passed;
142/142 unit and 13/13 scoped seller/integration E2E passed.
Post-transfer results on the unchanged production baseline:

| Check | Actual result |
| --- | --- |
| check:api, typecheck, lint, build, format:check | PASS; typecheck/lint/format repeated after final test refinements |
| Full default unit/component | 164 ordinary passed + 5 inherited expected failures, 14 files; exit0, Vitest total169 includes those5 |
| Final targeted default microphone | 22 ordinary passed + 5 expected failures; exit0 |
| Final strict component gate | **22 passed / 13 failed**, 35 cases, exit1; no skipped/inverted cases |
| Native synthetic microphone E2E | **12 passed / 6 failed / 0 skipped / 0 flaky**, exit1; actual fake-device process flags checked |
| Scoped existing seller/integration E2E | 13/13 passed before transfer; production unchanged |
| git diff --check / protected-path inspection | PASS before publication |

Strict component failures are five inherited MIC gaps plus all eight VP scenarios above.
VP-01/02/03 fail because Cancel is absent. VP-04 publishes an old File; VP-05 requests capture twice;
VP-06 does not stop the remaining track; VP-07 publishes after error; VP-08 starts the stale permission stream.
These are assertion failures after healthy setup, not import/typecheck/runner failures.
Browser failures: absent preview in the playback case and four viewport cases, absent Cancel in the capture case.
Assertions after those missing controls (pause/replay/URL cleanup/focus/localized controls) are not yet runtime verified.
All eleven previous normal browser scenarios plus the new double-Prepare scenario passed.
Only synthetic API/Auth was used and no financial write was allowed. Full default screenshot-writer and QA suites
were not repeated; this report does not claim every repository E2E passed.

Reports are ignored local `apps/web/test-results/microphone-unit-strict.json` and
`apps/web/test-results/microphone/results.json`. They contain synthetic diagnostics; no actual voice.
Build preserves the empty-auth/large-3D warnings. npm ci reports three inherited audit findings;
dependencies were not upgraded and no audit fix was run.

## Physical and live limitations

Physical Android **Blocked**: fresh authorized adb enumeration returned zero devices (no IDs saved).
The final fetch found new HTTPS documentation in
`integration/seller-analytics-061:13248851fd2b2a502aff211a506f71e85c2b0ab1`.
The [captain's preview handoff](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/13248851fd2b2a502aff211a506f71e85c2b0ab1/docs/HTTPS_FRONTEND_PREVIEW.md)
provides [frontend /login](https://crucial-funky-marion-barcelona.trycloudflare.com/login).
Our fresh read-only HTTP checks returned frontend HTML200, HTTPS API health200 and GET /me preflight200
with allow-origin exactly matching this frontend. Thus **HTTPS availability is no longer blocked**.
No browser login or permission request was performed by these probes; TLS/HTTP availability does not establish
device, media, authentication or AI acceptance. These are temporary tunnels; recheck before device acceptance.
Loopback secure context and fake audio do not qualify as a physical Android test.
Real prompts, hardware capture, sound quality, mobile keyboard/screen reader, calls/background/screen-lock,
and physical playback remain unverified. No personal audio captured/published.
Authenticated live Backend/AI verification was not run; the read-only public health/preflight probes above
are the only live checks. Synthetic HTTP does not prove real Gemini or database behavior.

Existing OpenAPI 0.6.0, generated.ts, multipart audio XOR text/locale, 8 MiB / 30-second server cap,
Supabase, financial functions, router, public UI, package/lock and all production files are unchanged.
Only participant #4 adapts the production scope. Await that exact commit, refresh Git, review its bounded diff,
run the strict gates plus full checks, then remove fixed expected failures. No automatic merge.

## Initial remote/PR snapshot

| Branch | HEAD |
| --- | --- |
| main | 8c932dd49b8defa8456fd3b7015ed7828ddae3b7 |
| integration/team-mvp | 3d009dc86c93debcab05dedda530b7d1fe62a304 |
| integration/local-combined-check | 58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76 |
| feature/seller-design-integration | c9e099e2ce2b0d5c25552542f72b9b369f5d7b5b |
| feature/seller-analytics | ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1 |
| fix/seller-auth-unicode | 28960f21e13c9c38077bf68b7bb5449eb9aa824d |
| test/mobile-microphone-acceptance | 39a730e63e43bb8487ed2f9afb1ead7762737314 |
| feature/aidana-ai-assistant | 880d7137f39648f0bbce355369ee3e755d981f02 |

PR #11/#14 → team-mvp; #16/#17/#19/#20 → combined; #18 → livestock-https; #13 → backend/livestock.
All open Draft at inspection. PR search returned no PR for the owner feature branch.
No old PR was merged and no PR base/head was retargeted.
The final fetch also found `backend/customer-post-recovery:737a559ca5120639ecdd5b3d99fdfdfb574700c8`
and a mobile update; those remain separate tasks. PR18's new commit changes documentation only, with no voice,
ledger or summary source delta from its preceding HEAD. Combined base58d4eb4 and owner880d713 remain unchanged.
