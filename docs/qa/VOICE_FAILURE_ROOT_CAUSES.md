# Voice QA: root causes and integration gate

Stage A, 2026-10-16. **7 confirmed causal groups explain 13 component + 6 E2E failures.**
These are findings against the unchanged combined AudioInput, not 19 independent defects,
not fixes, and not physical microphone results. Production implementation belongs to
participant #4, Aidana; this change contains documentation only.

## Inspected revisions and ownership

- Tested QA snapshot: `feature/voice-playback-cancel:63802e663582bc4cb30eaf4744407288b5386a3c`.
- Production/base: `integration/local-combined-check:58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`.
- Owner source: `feature/aidana-ai-assistant:880d7137f39648f0bbce355369ee3e755d981f02`.
- [PR #21](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21) and
  [PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20): open Draft,
  both target combined at the base above, both individually mergeable at inspection.
- Initial fetch/prune succeeded; own `pull --ff-only origin feature/voice-playback-cancel`:
  Already up to date; worktree clean before analysis. Full refs and ancestry:
  [PR comparison](VOICE_PR20_PR21_COMPARISON.md).

`git ls-tree -r --name-only origin/feature/aidana-ai-assistant -- apps/web` returns no files.
The latest owner commit modifies root `src/features/voice/{Sale,VoiceInput}.jsx`,
`recorder.js` and tests, but also root `backend/ai.py`, `backend/app.py`, `src/api.js`,
styles and documentation. It is not the agreed apps/web adaptation.
Its common ancestor with combined is `ced32e7aa8e737a0cbc5318715ad02bdc98a89d4`.
No PR was returned for that head; PR #20 has three coordination comments from bekzatwr,
no owner readiness reply/review; PR #21 has no comments at inspection.
The [role assignment](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20#issuecomment-6215571848)
already names Aidana as executor. The new `frontend/aidana-public-showcase:7d23500a6e45e71ad19725c322b6bfb1ba243bf0`
is a root public/backend change, not a voice adaptation.

At the initial inspection this was **Blocked: awaiting Aidana apps/web adaptation commit**.
The pre-publication fetch and comment recheck changed that status:
Aidana explicitly supplied ready apps/web commit **8dc6f895e3eead0de954c3374a6d4cc50d432588**
in [PR21 comment](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21#issuecomment-6216105740)
and [Draft PR #23](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/23).
Its parent/base is `integration/seller-analytics-061:13248851fd2b2a502aff211a506f71e85c2b0ab1`,
API 0.6.1 with Analytics; the task-approved combined base is still 58d4eb4, API 0.6.0 without
Analytics UI. **Base selection for Stage B is awaiting captain confirmation**, requested in
this task; no base substitution, integration or production edit was performed.

The bounded diff against the owner's actual parent has 16 paths: seven voice production
files, the seven canonical QA files, one new eight-case voice-adaptation test, and ledger
handoff. Six QA files are byte-identical to PR21; the seventh only changes expected-failure
inversion/comments/suite label to ordinary tests, preserving assertions. No backend,
OpenAPI/generated, Auth/router/shared UI, ledger/summary/Analytics/public or global styles
change relative to that parent. Sale changes input/AI attempt coordination and keyed context;
the save/useWrite methods remain unchanged. Owner-reported 35/35 and 242/242 are **not our
test results**. Our 22/13 and 12/6 above remain the actual pre-adaptation baseline.

## Fresh measurements

All commands below run from `apps/web` in the dedicated QA worktree, Windows,
Node 24.21.0 / npm 11.19.0 / Vitest 3.2.7. Tests and fixtures were not changed.
Component doubles replace browser media boundaries only and render the real AudioInput.
Browser tests use the real Chromium/MediaRecorder with a generated fake device and synthetic
Auth/API; actual Chromium command-line fake-device flags are checked before capture.
No human audio, live credentials or financial writes are involved.

| Category                                            | Fresh result                                                              | Interpretation                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Strict microphone component                         | **22 passed / 13 failed**, 35 cases, exit 1                               | Ordinary assertions, no inverted/skip/todo cases               |
| Synthetic microphone E2E                            | **12 passed / 6 failed**, 18 cases, exit 1; retries 0, skipped 0, flaky 0 | Failures occur after healthy setup; no infrastructure failures |
| Default unit/component                              | **164 ordinary passed + 5 expected failures**, 14 files, exit 0           | Vitest's 169 total includes five inherited `it.fails` cases    |
| Seller/integration regression                       | **13/13 passed**, retries 0                                               | Scoped baseline, not Analytics or live acceptance              |
| check:api / typecheck / lint / build / format:check | **PASS**, lint 0 warnings                                                 | Existing empty auth / large 3D chunk warnings remain           |
| Live Backend/Auth                                   | Not run                                                                   | Public connectivity probes only                                |
| Physical Android                                    | **Blocked**                                                               | Fresh adb enumeration: 0 authorized, 0 unauthorized/offline    |
| Live Gemini                                         | **Blocked / not run**                                                     | No agreed adapted build, physical device or usable preview     |

```powershell
npx.cmd vitest run --config vitest.microphone.config.ts --reporter=default --reporter=json --outputFile=test-results/voice-rca-unit.json
$env:PLAYWRIGHT_JSON_OUTPUT_FILE = 'test-results/voice-rca-e2e.json'
npx.cmd playwright test --config e2e/microphone.playwright.config.ts --output test-results/voice-rca-e2e --reporter=line,json
Remove-Item Env:PLAYWRIGHT_JSON_OUTPUT_FILE
```

The new output paths preserve previous reports and all tracked screenshots. Raw JSON and
synthetic error contexts remain ignored local artifacts. The appendix below preserves the
actual assertion and test stack frames in Git, with workspace prefixes removed.
This is enough to reproduce after changing accounts without publishing machine paths or audio.
Strict component run started `2026-10-16T13:02:16.324Z`; browser run started
`2026-10-16T13:02:36.165Z`. All reports refer to the same tested source snapshot above.

Additional fresh commands: `npm.cmd run check:api`, `npm.cmd run typecheck`,
`npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run format:check`,
`npm.cmd test -- --no-file-parallelism`. Seller baseline:
`npm.cmd run test:e2e -- seller.spec.ts integration-design.spec.ts --output test-results/voice-rca-seller --trace off`
with `CI=1` temporarily set and then restored. No screenshot-writer suites were run.
Dependencies/lock and tests are unchanged; the existing lock-installed environment was reused,
`npm ci` was not repeated for this documentation-only stage. Full reinstall and all Stage B
gates remain required for the future integrated build; no new live acceptance is claimed here.

## Grouping rule

A group identifies one missing UI capability, lifecycle invariant, terminal-event path or
validation gate. Different viewport instances and two bounds of the same absent gate do not
create new root causes. RC-03 covers lack of capture invalidation when current intent changes;
it includes disabled, replacement and fallback entry points. It does not imply a generation
counter alone will fix cleanup: the owner must wire those transitions too.
Recorder `error` and track `ended` are kept separate (RC-05/06): they are independent event
sources; adding one handler does not fix the other. RC-04 is separate from stale callbacks:
even perfect generation checks would still allow the second unwanted microphone request.
This is an evidence-based grouping, not a claim that seven independent patches will suffice.

| ID    | Confirmed cause                                                             | Component failures           | E2E failures                           | Priority / owner  |
| ----- | --------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- | ----------------- |
| RC-01 | Selected audio has no preview/player                                        | —                            | Playback; viewport 360, 390, 768, 1440 | P2 / Aidana       |
| RC-02 | No discard/cancel transition or control                                     | VP-01, VP-02, VP-03          | Cancel during recording                | P1 / Aidana       |
| RC-03 | Capture lifetime tied only to mounted component, not current attempt/intent | MIC-01, MIC-02, VP-04, VP-08 | —                                      | P1 / Aidana       |
| RC-04 | Stop prematurely returns the shared action to Record                        | VP-05                        | —                                      | P1 / Aidana       |
| RC-05 | Async recorder error has no terminal failure handling                       | MIC-04, VP-07                | —                                      | P1 / Aidana       |
| RC-06 | Unexpected track ending has no interruption handling                        | VP-06                        | —                                      | P1 / Aidana       |
| RC-07 | Recorded-file handoff bypasses size/nonempty validation                     | MIC-05a, MIC-05b             | —                                      | P2 / Aidana       |
| Total | **7 groups**                                                                | **13**                       | **6**                                  | No P0 established |

P1 denotes capture continuing/restarting against current intent or a stale/failed recording
being accepted by the form. No test proves a financial write or an unauthorized upload.
P2 denotes missing review UX or a file rejected later by the existing backend guard.

### RC-01 — no selected-audio preview

- Source: `AudioInput.tsx` render, lines 81–103; `Sale.tsx` selected file, lines 172–178
  (all source paths here are under `apps/web/src/features/voice`).
- Action / minimal repro: open Sale using the synthetic fixture, select generated WAV;
  repeat with width 360/390/768/1440.
- Expected: a local player is available before explicit Prepare; playback can be controlled.
- Actual: `audio[controls]` is absent. All five cases stop at the first visibility assertion.
- Cause: AudioInput only renders file input/Record/Stop/status; Sale stores File and displays
  its name. Neither creates a preview element or playback state.
- Fix owner: Aidana. Verification: the exact five E2E names in the appendix must complete.
  Pause, replay, Delete, URL cleanup, keyboard and localized controls remain downstream
  **Unconfirmed**, not five additional proved playback defects.

### RC-02 — no cancellation path

- Source: `AudioInput.tsx` render 94–101 and `stop()` 20–25; `onstop` 61–69 publishes File.
- Action / repro: request permission and try Cancel (VP-01); record and try Cancel (VP-02);
  Stop while final event is pending and try Cancel (VP-03); real fake-device capture then
  locate Cancel in E2E.
- Expected: distinct discard action, including requesting/recording/stopping, preserves
  manual input and suppresses delivery of the discarded recording.
- Actual: no accessible `Отменить запись` button in any of those states.
- Cause: there is only a recording boolean and a Stop-to-publish path; no cancel action.
- Fix owner: Aidana. Verification: VP-01/02/03 and cancel E2E, including their currently
  unreached queued-event/track/text/no-upload assertions.
- Boundary: no post-cancel callback was actually delivered in these failing cases. A
  post-cancel leak is **Unconfirmed**; the missing control is the proved cause.

### RC-03 — current capture is never invalidated when intent changes

- Source: `AudioInput.tsx` refs/effect 15–37, permission continuation 49–56,
  `onstop` 61–69, picker 88–91 and disabled render 87/95.
- Action / repro: (a) leave permission unresolved, set parent disabled, resolve it;
  (b) disable during recording; (c) Stop A, start B, deliver captured A `onstop`;
  (d) leave permission unresolved, select fallback file, then grant the old permission.
- Expected: obsolete attempts are invalid; release their streams, retain new input/capture,
  do not publish the old File or start the obsolete recorder.
- Actual: (a)/(d) one recorder is constructed when zero is expected; (b) track stop count
  is zero; (c) old onFile fires once during the new recording.
- Cause: `alive` is only cleared on unmount. It stays true across disabled/fallback/new
  capture, no effect reconciles disabled with active resources, and no attempt identity
  gates promise/event continuations. The pending-start lock is not a lifetime guard.
- Fix owner: Aidana. Verification: MIC-01/02 and VP-04/08 as ordinary passing tests.
  MIC-02 fails before its later onFile assertion; its cleanup failure is proved, its later
  callback result is not independently observed. VP-04 proves stale delivery, not that
  old cleanup stops B's tracks (that later assertion is unreached).

### RC-04 — Stop exposes Record before finalization

- Source: `AudioInput.tsx stop()` 20–25 and shared button handler 97–99.
- Action / repro: start capture; dispatch two successive clicks to the same Stop DOM node
  while the first recorder's asynchronous stop event is still queued.
- Expected: one permission request/recorder; second Stop is inert while stopping.
- Actual: `getUserMedia` called twice instead of once.
- Cause: `setRecording(false)` immediately relabels/rebinds the same button to `start()`;
  the start lock was already released. No stopping state prevents re-entry.
- Fix owner: Aidana. Verification: VP-05; keep VP-04 to cover callbacks separately.
  This is a duplicate capture request, **not** a duplicate AI or money submission.

### RC-05 — recorder runtime error is ignored

- Source: `AudioInput.tsx start()` 55–78; handlers only for data/stop, synchronous catch
  cannot catch a later recorder error; `onstop` does not distinguish failed capture.
- Action / repro: start, emit recorder error (MIC-04); or error → final data → stop (VP-07).
- Expected: release tracks/timer, leave recording state, show interruption, discard failed data.
- Actual: MIC-04 sees zero track stops; VP-07 receives one File after the error.
- Cause: no `onerror`/error listener, failed flag or terminal-failure cleanup path.
- Fix owner: Aidana. Verification: MIC-04 and VP-07. Timer/UI assertions after MIC-04's
  first failure remain unreached; do not claim permanent leakage beyond the measured interval.

### RC-06 — loss of a capture track is ignored

- Source: `AudioInput.tsx` stream installation 54–73; no `ended` listeners.
- Action / repro: start with two synthetic tracks, set one ended and dispatch its ended event.
- Expected: discard interrupted attempt and release the remaining track, display interruption.
- Actual: the second track's stop spy has never been called.
- Cause: no handler connects unexpected track termination to cleanup. `stop()` and unmount
  cleanup handle deliberate shutdown only.
- Fix owner: Aidana. Verification: VP-06, including later final-data/alert assertions.
  Those later assertions are currently unreached. No physical permission revocation was tested.

### RC-07 — recorder output skips file-boundary validation

- Source: `AudioInput.tsx onstop` 61–69 vs file-picker size guard at 90.
- Action / repro: deliver one recorded chunk of 8 MiB + 1 byte, Stop/finalize; repeat with
  no nonempty chunks.
- Expected: no `onFile` for either invalid recording.
- Actual: one File reaches the parent in both cases.
- Cause: `onstop` unconditionally constructs and publishes File; skipping empty chunks
  does not prevent constructing an empty File. Picker upper-bound validation is a different path.
- Fix owner: Aidana. Verification: MIC-05a/b, preserving existing exact 8 MiB picker acceptance.
  Contract: [AI_INTEGRATION](../../packages/contracts/AI_INTEGRATION.md), 8 MiB/30 seconds;
  backend content validation remains unchanged. No unsupported-MIME defect was proved.

## Hypotheses that are not extra confirmed defects

| Hypothesis                                              | Evidence / classification                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Blob/ObjectURL leak                                     | **Unconfirmed**: current component never creates a preview URL; tests stop before URL assertions              |
| Pause/replay/delete/focus/44px/KK controls broken       | **Unconfirmed** downstream of RC-01, not separate observed failures                                           |
| Late callback after Cancel                              | **Unconfirmed** until RC-02 allows cancellation; late callback after replacement is proved by VP-04           |
| Late callback/permission after unmount                  | Existing ordinary component cases and native route-unmount E2E pass; no general unmount defect established    |
| All track cleanup broken                                | False generalization: Stop, timer, route/unmount cleanup pass; only the entry paths above fail                |
| Unsupported MIME/denial fallback broken                 | Ordinary component MIME selection/fallback and native denial E2E pass                                         |
| Automatic upload or duplicate Prepare                   | Not reproduced: native Stop/timer no-upload and double explicit Prepare E2E pass; no financial writes allowed |
| Android timing, sound quality, real browser permissions | **Unconfirmed / Blocked**, desktop fake-device evidence cannot establish these                                |
| Owner root app has the same runtime defects             | **Unconfirmed**: static review only; no standalone owner runtime tests in this task                           |

Recorder method state changes and asynchronous completion are distinct in the
[W3C recording draft](https://www.w3.org/TR/2026/WD-mediastream-recording-20260316/#dom-mediarecorder-stop).
Its error path can deliver final data/stop; the fixture deliberately models that ordering.
Track `stop()` and an externally triggered `ended` event are distinct in
[Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/#dom-mediastreamtrack-stop).
The fixture's stop changes readyState without emitting ended. These sources support the
boundary model; they do not substitute for a real device test.

## Gate for Stage B and physical acceptance

Ready owner commit 8dc6f895 is now available; first resolve the explicit base question above.
Then fetch/recheck that base, inspect the actual diff, create a new verification worktree/branch
and include agreed owner changes plus one copy of the unique QA files. Do not merge root
src/backend or PR #20/#21 wholesale. See the [transfer strategy](VOICE_PR20_PR21_COMPARISON.md).
Do not reinterpret failed acceptance as passing or remove assertions to improve the count.
Remove individual expected-failure inversions only when the owner implementation passes.

After that integration, repeat the full instructed unit/build/API/E2E/format suite and
Auth (login/logout/persistence/A→B→A/late401/business), isolated Ledger
(3000/1000/debt2000/repaid500/debt1500/history/summary/idempotency) and Analytics
(7/30, daily/hourly, financial refresh, reload/business) checks.
This Stage A branch does not contain the Analytics UI from PR #16/#18; its previous
results cannot be claimed as a new integration result. Do not write money to shared DB.

Fresh public probes on 2026-10-16 returned **HTTP 530 for both** previously published URLs:
frontend `https://crucial-funky-marion-barcelona.trycloudflare.com/login` and API
`https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1/health`.
Earlier HTTP 200 reports are historical. The cause of 530 was not diagnosed; availability
is not established now. No tunnel/backend restart, CORS change or preview replacement occurred.
Physical acceptance is blocked by both no available Android device and unreachable preview.
No backend-agent verified-build handoff is sent because no Stage B build exists yet.

### Captain's Android checklist — after the preview owner publishes the verified build

Record build SHA, approved HTTPS URL, phone model, Android/Chrome versions, date, permission
behavior, actual MIME/size, PASS/FAIL/BLOCKED and error text (no tokens, personal audio or IDs).

1. Open the approved HTTPS frontend; verify secure origin, sign in with a privately supplied
   educational account and select its allowed educational shop.
2. Allow microphone, record a short consented RU phrase and a KZ phrase separately.
3. Stop → Play → Pause → Replay; verify sound locally, not just filename.
4. Cancel during capture and Stop→Cancel; re-record. No old clip/active microphone remains.
5. Delete ready clip; verify no automatic AI upload from Stop/timer/Play/Cancel/Delete.
6. Check the 30-second cap, supported MIME, file upload, repeated denied permission,
   text/manual fallback, mobile keyboard/navigation and route cleanup.
7. In a separately authorized live AI check, explicitly Prepare once; inspect draft and
   errors. Do not confirm a financial write without captain authorization.
8. Report **Physical microphone**, **Live Gemini** and **Synthetic Playwright** separately.
   Do not publish real audio without the speaker's explicit consent.

## Exact failure mapping and diagnostic excerpts

The generated appendix below comes from this Stage A rerun, not the previous report.
Each failed test maps to one primary cause; later assertions are not counted as observations.

### All 19 failing cases

| Kind / exact test title                                                                                           | Primary cause | Actual first failure                                                                                               | Test stack location                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Component: MIC-01: must not start a late permission stream after the parent becomes disabled                      | RC-03         | AssertionError: expected [ Recorder{ stream: { …(1) }, …(7) } ] to have a length of +0 but got 1                   | at apps/web/src/test/microphone-known-gaps.test.tsx:39:43                                                                               |
| Component: MIC-02: becoming disabled during capture must release tracks and discard the clip                      | RC-03         | AssertionError: expected "spy" to be called 1 times, but got 0 times                                               | at apps/web/src/test/microphone-known-gaps.test.tsx:58:28; at apps/web/src/test/microphone-known-gaps.test.tsx:57:23                    |
| Component: MIC-05a: must reject a recorded clip larger than 8 MiB before onFile                                   | RC-07         | AssertionError: expected "spy" to not be called at all, but actually been called 1 times                           | at apps/web/src/test/microphone-known-gaps.test.tsx:81:31                                                                               |
| Component: MIC-05b: must not forward an empty recording as an audio file                                          | RC-07         | AssertionError: expected "spy" to not be called at all, but actually been called 1 times                           | at apps/web/src/test/microphone-known-gaps.test.tsx:95:31                                                                               |
| Component: MIC-04: recorder error must release microphone tracks and duration timer                               | RC-05         | AssertionError: expected "spy" to be called 1 times, but got 0 times                                               | at apps/web/src/test/microphone-known-gaps.test.tsx:109:28; at apps/web/src/test/microphone-known-gaps.test.tsx:108:23                  |
| Component: VP-01: cancelling a pending permission releases its eventual stream without starting                   | RC-02         | TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Отменить запись" | at cancel (apps/web/src/test/microphone-lifecycle.acceptance.tsx:18:29); at apps/web/src/test/microphone-lifecycle.acceptance.tsx:33:21 |
| Component: VP-02: cancel releases all tracks/timer and ignores already queued data/stop                           | RC-02         | TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Отменить запись" | at cancel (apps/web/src/test/microphone-lifecycle.acceptance.tsx:18:29); at apps/web/src/test/microphone-lifecycle.acceptance.tsx:51:21 |
| Component: VP-03: Stop then Cancel before asynchronous onstop discards the clip                                   | RC-02         | TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Отменить запись" | at cancel (apps/web/src/test/microphone-lifecycle.acceptance.tsx:18:29); at apps/web/src/test/microphone-lifecycle.acceptance.tsx:75:21 |
| Component: VP-04: an old callback cannot publish over a newer recording generation                                | RC-03         | AssertionError: expected "spy" to not be called at all, but actually been called 1 times                           | at apps/web/src/test/microphone-lifecycle.acceptance.tsx:104:29                                                                         |
| Component: VP-05: double Stop cannot start another recording while stop is pending                                | RC-04         | AssertionError: expected "spy" to be called 1 times, but got 2 times                                               | at apps/web/src/test/microphone-lifecycle.acceptance.tsx:118:35                                                                         |
| Component: VP-06: device/permission loss releases remaining tracks and never publishes a partial clip             | RC-06         | AssertionError: expected "spy" to be called at least once                                                          | at apps/web/src/test/microphone-lifecycle.acceptance.tsx:133:37                                                                         |
| Component: VP-07: error followed by final data/stop cannot publish failed audio                                   | RC-05         | AssertionError: expected "spy" to not be called at all, but actually been called 1 times                           | at apps/web/src/test/microphone-lifecycle.acceptance.tsx:152:29                                                                         |
| Component: VP-08: choosing a fallback file invalidates a pending permission attempt                               | RC-03         | AssertionError: expected [ Recorder{ stream: { …(1) }, …(7) } ] to have a length of +0 but got 1                   | at apps/web/src/test/microphone-lifecycle.acceptance.tsx:171:41                                                                         |
| E2E: preview delete/replacement/navigation releases resources and preserves RU/KZ input at 360px @acceptance-gap  | RC-01         | Error: expect(locator).toBeVisible() failed                                                                        | at apps/web/e2e/microphone.acceptance.ts:708:25                                                                                         |
| E2E: preview delete/replacement/navigation releases resources and preserves RU/KZ input at 390px @acceptance-gap  | RC-01         | Error: expect(locator).toBeVisible() failed                                                                        | at apps/web/e2e/microphone.acceptance.ts:708:25                                                                                         |
| E2E: preview delete/replacement/navigation releases resources and preserves RU/KZ input at 768px @acceptance-gap  | RC-01         | Error: expect(locator).toBeVisible() failed                                                                        | at apps/web/e2e/microphone.acceptance.ts:708:25                                                                                         |
| E2E: preview delete/replacement/navigation releases resources and preserves RU/KZ input at 1440px @acceptance-gap | RC-01         | Error: expect(locator).toBeVisible() failed                                                                        | at apps/web/e2e/microphone.acceptance.ts:708:25                                                                                         |
| E2E: selected audio can be listened to before submitting (currently absent)                                       | RC-01         | Error: expect(locator).toBeVisible() failed                                                                        | at apps/web/e2e/microphone.acceptance.ts:589:25                                                                                         |
| E2E: recording can be cancelled and discarded separately from Stop (currently absent)                             | RC-02         | Error: expect(locator).toBeVisible() failed                                                                        | at apps/web/e2e/microphone.acceptance.ts:650:26                                                                                         |

### Captured assertion / stack excerpts

Workspace prefixes, ANSI colors, repetitive rendered DOM and dependency frames are omitted.
Assertions and test frames below are copied from the actual JSON reports. Raw reports stay local.

#### RC-03 — MIC-01: must not start a late permission stream after the parent becomes disabled

```text
AssertionError: expected [ Recorder{ stream: { …(1) }, …(7) } ] to have a length of +0 but got 1
    at apps/web/src/test/microphone-known-gaps.test.tsx:39:43
```

#### RC-03 — MIC-02: becoming disabled during capture must release tracks and discard the clip

```text
AssertionError: expected "spy" to be called 1 times, but got 0 times
    at apps/web/src/test/microphone-known-gaps.test.tsx:58:28
    at apps/web/src/test/microphone-known-gaps.test.tsx:57:23
```

#### RC-07 — MIC-05a: must reject a recorded clip larger than 8 MiB before onFile

```text
AssertionError: expected "spy" to not be called at all, but actually been called 1 times
    at apps/web/src/test/microphone-known-gaps.test.tsx:81:31
```

#### RC-07 — MIC-05b: must not forward an empty recording as an audio file

```text
AssertionError: expected "spy" to not be called at all, but actually been called 1 times
    at apps/web/src/test/microphone-known-gaps.test.tsx:95:31
```

#### RC-05 — MIC-04: recorder error must release microphone tracks and duration timer

```text
AssertionError: expected "spy" to be called 1 times, but got 0 times
    at apps/web/src/test/microphone-known-gaps.test.tsx:109:28
    at apps/web/src/test/microphone-known-gaps.test.tsx:108:23
```

#### RC-02 — VP-01: cancelling a pending permission releases its eventual stream without starting

```text
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Отменить запись"
    at cancel (apps/web/src/test/microphone-lifecycle.acceptance.tsx:18:29)
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:33:21
```

#### RC-02 — VP-02: cancel releases all tracks/timer and ignores already queued data/stop

```text
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Отменить запись"
    at cancel (apps/web/src/test/microphone-lifecycle.acceptance.tsx:18:29)
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:51:21
```

#### RC-02 — VP-03: Stop then Cancel before asynchronous onstop discards the clip

```text
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Отменить запись"
    at cancel (apps/web/src/test/microphone-lifecycle.acceptance.tsx:18:29)
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:75:21
```

#### RC-03 — VP-04: an old callback cannot publish over a newer recording generation

```text
AssertionError: expected "spy" to not be called at all, but actually been called 1 times
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:104:29
```

#### RC-04 — VP-05: double Stop cannot start another recording while stop is pending

```text
AssertionError: expected "spy" to be called 1 times, but got 2 times
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:118:35
```

#### RC-06 — VP-06: device/permission loss releases remaining tracks and never publishes a partial clip

```text
AssertionError: expected "spy" to be called at least once
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:133:37
```

#### RC-05 — VP-07: error followed by final data/stop cannot publish failed audio

```text
AssertionError: expected "spy" to not be called at all, but actually been called 1 times
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:152:29
```

#### RC-03 — VP-08: choosing a fallback file invalidates a pending permission attempt

```text
AssertionError: expected [ Recorder{ stream: { …(1) }, …(7) } ] to have a length of +0 but got 1
    at apps/web/src/test/microphone-lifecycle.acceptance.tsx:171:41
```

#### RC-01 — preview delete/replacement/navigation releases resources and preserves RU/KZ input at 360px @acceptance-gap

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('audio[controls]')
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
    at apps/web/e2e/microphone.acceptance.ts:708:25
```

#### RC-01 — preview delete/replacement/navigation releases resources and preserves RU/KZ input at 390px @acceptance-gap

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('audio[controls]')
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
    at apps/web/e2e/microphone.acceptance.ts:708:25
```

#### RC-01 — preview delete/replacement/navigation releases resources and preserves RU/KZ input at 768px @acceptance-gap

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('audio[controls]')
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
    at apps/web/e2e/microphone.acceptance.ts:708:25
```

#### RC-01 — preview delete/replacement/navigation releases resources and preserves RU/KZ input at 1440px @acceptance-gap

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('audio[controls]')
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
    at apps/web/e2e/microphone.acceptance.ts:708:25
```

#### RC-01 — selected audio can be listened to before submitting (currently absent)

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('audio[controls]')
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
    at apps/web/e2e/microphone.acceptance.ts:589:25
```

#### RC-02 — recording can be cancelled and discarded separately from Stop (currently absent)

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Отменить запись', exact: true })
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
    at apps/web/e2e/microphone.acceptance.ts:650:26
```
