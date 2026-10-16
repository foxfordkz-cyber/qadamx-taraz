# PR #20 vs #21: exact QA overlap and safe transfer

2026-10-16 Stage A. Recommendation: **use Draft PR #21 as the primary voice QA source**.
Both PRs start from the same still-current base; #21 preserves all #20 microphone scenarios
and adds strict lifecycle/browser coverage. This recommends a file source, not a merge.
No shared branch was merged, squashed, cherry-picked or retargeted.

## Ref and PR snapshot after fetch/prune

| Ref                                                  | Exact HEAD                               | Relation to combined                                |
| ---------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| main                                                 | 13248851fd2b2a502aff211a506f71e85c2b0ab1 | Updated during audit; 14 ahead                      |
| integration/team-mvp                                 | 3d009dc86c93debcab05dedda530b7d1fe62a304 | Ancestor, 20 behind                                 |
| integration/local-combined-check                     | 58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76 | Approved base                                       |
| feature/seller-design-integration                    | c9e099e2ce2b0d5c25552542f72b9b369f5d7b5b | Ancestor, 18 behind                                 |
| feature/seller-analytics                             | ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1 | 5 ahead, not included in combined                   |
| fix/seller-auth-unicode                              | 28960f21e13c9c38077bf68b7bb5449eb9aa824d | Diverged at team-mvp; combined-only 20 / fix-only 4 |
| test/mobile-microphone-acceptance (#20)              | 39a730e63e43bb8487ed2f9afb1ead7762737314 | 4 ahead                                             |
| feature/voice-playback-cancel (#21, tested snapshot) | 63802e663582bc4cb30eaf4744407288b5386a3c | 4 ahead before this documentation update            |
| feature/aidana-ai-assistant                          | 880d7137f39648f0bbce355369ee3e755d981f02 | Combined-only 52 / owner-only 3, ancestor ced32e7   |
| integration/seller-analytics-061 (#18)               | 13248851fd2b2a502aff211a506f71e85c2b0ab1 | 14 ahead including merge ancestry                   |

PR #20 and #21: open Draft → `integration/local-combined-check:58d4eb4`.
PR #18: open Draft → `integration/livestock-https:ca51bbf9bcf1a5e5379b7b8ced147e4114e01434`.
PR #16: open Draft → combined; PR #14: open Draft → team-mvp.
All five individually mergeable at inspection. This does not mean #20 and #21 can both
be integrated without conflicts or duplicated tests. #20 requested review from
`sarsenbaevaaidana07`; no readiness reply. #21 has no comments. #18 captain comments
describe prior live HTTPS/Auth, not a voice adaptation. #14/#16 have no comments.

Fresh changes elsewhere: `backend/customer-post-recovery:e4414012ff4dd749ed154a4d767f8eff1225fae2`
adds API/customer recovery migration/contracts/generated types; this remains a separate task.
`feature/mobile-livestock-api:1a93469f26a93fb12b7adb7158a1800009f0d257` adds iOS/mobile work.
`frontend/aidana-public-showcase:7d23500a6e45e71ad19725c322b6bfb1ba243bf0` is root
public/backend work. None updates combined or supplies agreed apps/web voice adaptation.
PR #18 includes Analytics and API 0.6.1 changes; this QA branch remains combined API 0.6.0.
No automatic integration or assertion of compatibility with those untested changes.

**Pre-publication update:** origin/main advanced from `8c932dd` to `13248851` during this audit;
combined and both QA heads remained unchanged. New `feature/unified-visual-3d:e5ef1de`
changes explore/shared styling, remains separate and was not transferred.
Aidana has now explicitly published **fix/voice-playback-lifecycle:8dc6f895e3eead0de954c3374a6d4cc50d432588**,
[Draft PR23](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/23) → integration/seller-analytics-061:13248851.
New ready comments appeared in both PR20 and PR21; the earlier no-reply observation above
is historical. Her bounded adaptation already selects all seven PR21 QA files once:
six are byte-identical, known-gaps only removes inversion and adjusts comments/suite label.
This independently supports choosing PR21 as the canonical QA source; do not import those
seven files again on top of PR23. Verify them in place instead.
PR23 has seven production voice paths, eight test/config paths (including its additional test)
and one ledger handoff; parent-relative backend/contracts/financial modules are unchanged.
Its base/API/Analytics differ from the explicitly approved combined baseline, so captain
confirmation of the Stage B base was requested before creating a verification branch.
Owner results are not attributed to this audit. Stage A tests still refer to QA63802e6.

## Ancestry and source provenance

```text
58d4eb4 (combined)
  +-- 513c527 -> 86c9881 -> e976bf7 -> 39a730e   PR20
  +-- 03226ff -> 652a7d4 -> fedb4df -> 63802e6   PR21 tested source
```

`git merge-base PR20 PR21` = `58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`;
`git rev-list --left-right --count PR20...PR21` = `4 4` at those frozen heads.
Neither PR is an ancestor of the other. PR21's `fedb4df6d44946dbc5172e4faf39e54c58f95e90`
selectively introduced the five test/helper/config paths from PR20, then extended them.
It did not preserve PR20 ancestry through merge/cherry-pick.
PR20 first introduced component/helper cases in `86c98813dfbb9bb7b128b205cc00bafc218194fa`,
browser/config in `e976bf7465055ae604291c91b3b380e8b3b0b635`.

## File/test decisions

Paths in this table are relative to `apps/web` unless starting with `docs/`.

| File/Test                                                | PR #20                                                    | PR #21                                          | Match                                                                                                    | Decision                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| src/test/microphone-acceptance.test.tsx                  | 22 ordinary cases                                         | Same 22                                         | Same test titles/behavior coverage; 3 status checks now match recording text instead of all status nodes | Use #21 once; permits future Ready status without weakening recording check                                                       |
| src/test/microphone-known-gaps.test.tsx                  | 5 known cases                                             | Same 5                                          | Titles identical, suite label updated to owner implementation pending; one status check narrowed         | Use #21 once; keep strict mode and remove .fails only on actual fixes                                                             |
| src/test/microphone-fixtures.tsx                         | Browser-boundary harness                                  | Extended harness                                | Same recorder/promise helpers; tracks now EventTargets with readyState/onended                           | Use #21 once; required by VP-06; do not duplicate module                                                                          |
| e2e/microphone.playwright.config.ts                      | Dedicated server/allow-deny projects                      | Same                                            | **Byte-identical**, Git blob `0213cbe884921a9bd7c047f80ad01e04db2504d2`                                  | Exactly one config                                                                                                                |
| e2e/microphone.acceptance.ts: original 11 ordinary cases | Native capture/timer/denial/MIME/file/size/errors/unmount | All retained                                    | Titles identical; common service instrumentation extended                                                | Keep once from #21                                                                                                                |
| e2e/microphone.acceptance.ts: original 2 gap cases       | Playback/cancel opt-in, skipped by default                | Both ordinary and always run; fuller assertions | Same leaf titles, describe renamed, behavior strengthened                                                | Use #21; do not restore old opt-in skip                                                                                           |
| src/test/microphone-lifecycle.acceptance.tsx             | Absent                                                    | VP-01…VP-08, 8 ordinary cases                   | Unique                                                                                                   | Keep #21                                                                                                                          |
| vitest.microphone.config.ts                              | Absent                                                    | Explicit all-35 strict gate                     | Unique                                                                                                   | Keep #21; runs five known cases without .fails inversion                                                                          |
| e2e/microphone.acceptance.ts: double Prepare             | Absent                                                    | 1 ordinary case                                 | Unique                                                                                                   | Keep held-response assertion: one explicit multipart while pending                                                                |
| e2e/microphone.acceptance.ts: viewport cases             | Absent                                                    | 4 instances at 360/390/768/1440                 | Unique                                                                                                   | Keep all four, no duplicate file/version                                                                                          |
| docs/MOBILE_MICROPHONE_ACCEPTANCE.md                     | Historical matrix/report                                  | Absent                                          | Unique document, overlaps concepts                                                                       | Preserve by immutable #20 link or selectively carry as labelled history; outdated HTTPS/role status must not override current RCA |
| docs/VOICE_PLAYBACK_CANCEL.md                            | Absent                                                    | Owner review and expanded test report           | Unique document                                                                                          | Keep; current RCA supersedes historical measurements where stated                                                                 |
| docs/handoffs/seller-web.md                              | Own microphone handoff appended                           | Own playback/review handoff prepended           | Same existing base retained; different sections                                                          | Reconcile chronologically once; preserve provenance and current status                                                            |
| docs/qa/VOICE_FAILURE_ROOT_CAUSES.md and this comparison | Absent                                                    | New Stage A documentation                       | Unique                                                                                                   | Keep with current QA handoff; no production changes                                                                               |

Count of unique intended microphone scenarios: **35 component + 18 E2E**.
Do not add #20's 27 component or 13 browser cases to #21's totals.
Default #21 unit discovery runs 27 microphone cases, five inverted; strict config additionally
loads eight lifecycle cases and makes all 35 ordinary. The new E2E additions are 1+4, not
five independent confirmed bugs: the viewport cases all stop at the same missing preview.

## Exact overlap, conflict and output analysis

The following blob IDs compare frozen PR20:39a730e and PR21:63802e6. All five files were
absent at the common base. Read-only `git merge-file --stdout ours base theirs` used
temporary copies under ignored `test-results/voice-rca-diff`, not the index/worktree source.
Nonzero results below are diagnostic conflicts, not a performed Git merge.

| Common path                             | PR20 blob prefix | PR21 blob prefix | Three-way text comparison                                                   |
| --------------------------------------- | ---------------- | ---------------- | --------------------------------------------------------------------------- |
| e2e/microphone.acceptance.ts            | 249247e36d5d     | fd41f7ef4322     | Add/add, 11 conflict hunks                                                  |
| e2e/microphone.playwright.config.ts     | 0213cbe88492     | 0213cbe88492     | Identical, 0 conflicts                                                      |
| src/test/microphone-acceptance.test.tsx | 38be5100a0ae     | 86646be657a8     | Add/add, 3 conflict hunks                                                   |
| src/test/microphone-fixtures.tsx        | 28702e2d3c3f     | eafbfcd65e4e     | Add/add, 1 conflict hunk                                                    |
| src/test/microphone-known-gaps.test.tsx | c247f9e8fc03     | 9659e6373e2f     | Add/add, 2 conflict hunks                                                   |
| docs/handoffs/seller-web.md             | e1fdfa3b714f     | 43d4735db7a6     | **0 text conflicts** at these heads; still requires semantic reconciliation |

Only one literal content-identical common file: the Playwright config. Helper and test
files are derived copies, not byte-identical. The initial reports share scope, commands,
MIC names and Android matrix; their filenames differ and do not produce a path conflict.
Do not call the handoff a textual conflict: the actual three-way result is clean.
Git's final integration result can change if either base/head moves; rerun before transfer.

- Same test filenames and repeated leaf names mean renaming one copy to keep both would
  execute duplicate cases and inflate totals. Keep canonical paths.
- Both configs use port 4191 and `reuseExistingServer:false`. Concurrent runs from two
  worktrees on this computer compete for that port; serialize them or approve a separate port.
- Default output is `test-results/microphone` and `test-results/microphone/results.json`.
  Separate worktrees isolate filesystem paths; sequential runs in one worktree overwrite
  earlier reports unless explicit unique outputs are supplied.
- Both microphone configs disable screenshot/video/trace. There is **no tracked screenshot
  output collision** from these suites. Error contexts/reports can collide, as above.
- `microphone.acceptance.ts` is intentionally not `*.spec.ts`; normal and QA Playwright
  configs do not accidentally collect it. The lifecycle `.acceptance.tsx` needs the explicit
  strict Vitest config. This distinction must stay visible in CI/reporting.

## Safe transfer recommendation — not executed

1. Obtain ready Aidana apps/web commit and refresh all refs. Inspect scope and dependencies.
   Block if it still targets old root src/backend or changes AI/financial contracts.
2. Create an isolated verification branch/worktree from the freshly agreed integration base.
   Determine whether any canonical QA paths are already present and compare them first.
3. Select exactly the **seven QA source/config files from PR21** listed above. Preserve one
   copy of inherited #20 cases; do not also merge PR20 or duplicate its test directory.
   Adapt test selectors only to explicitly agreed UX changes, documenting the reason.
4. Carry the current RCA/review and one reconciled seller handoff; preserve PR20 report as
   historical evidence via its immutable commit link. Do not mark #20 merged/close it here;
   captain can decide its disposition after verified transfer.
5. Apply only the agreed owner adaptation, inspect every conflict manually; if architecture
   conflicts arise, return actionable review to Aidana instead of implementing production.
6. Run strict microphone plus full project/isolated Auth/Ledger/Analytics regression on that
   actual combined tree. Report unique cases, remaining failures and live limits separately.
7. Publish only the new agreed verification branch as Draft. Preview owner/backend agent
   receives exact verified SHA/base/owner SHA and updates HTTPS separately after captain review.

Why #21: equal base freshness, all #20 behavior retained, extra eight lifecycle and five
browser cases, always-on acceptance, one strict gate. #20 has no unique executable
microphone test absent from #21. Its historical docs remain useful provenance.

Source inventory of shared test names follows; it is generated from current reports and
compared to the original PR20 source, not inferred from counts alone.

## Shared leaf-name inventory

The four-file source diff changes no original leaf names or parameter arrays. The known-gap
describe title changed, so full suite-qualified names differ, while the five leaf names remain identical.

| Component leaf name (PR20 → PR21 retained)                                                                                                 | Default behavior in both                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| does not ask permission or emit a file before an explicit user action                                                                      | Ordinary                                  |
| keeps recording and file selection disabled while the parent is busy                                                                       | Ordinary                                  |
| selects the first supported MIME among ["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"] and emits only the stopped recording | Ordinary                                  |
| selects the first supported MIME among ["audio/mp4","audio/ogg;codecs=opus"] and emits only the stopped recording                          | Ordinary                                  |
| selects the first supported MIME among ["audio/ogg;codecs=opus"] and emits only the stopped recording                                      | Ordinary                                  |
| falls back to file input when no recorder MIME is supported                                                                                | Ordinary                                  |
| falls back without a permission request when MediaRecorder is absent                                                                       | Ordinary                                  |
| falls back when mediaDevices is unavailable, as in an unsupported/insecure context                                                         | Ordinary                                  |
| keeps file fallback after permission/device failure NotAllowedError                                                                        | Ordinary                                  |
| keeps file fallback after permission/device failure NotFoundError                                                                          | Ordinary                                  |
| keeps file fallback after permission/device failure NotReadableError                                                                       | Ordinary                                  |
| does not request permission twice while the first permission prompt is pending                                                             | Ordinary                                  |
| releases a late permission stream after unmount without starting or emitting                                                               | Ordinary                                  |
| stops at 30 seconds and releases tracks without emitting before the stop event                                                             | Ordinary                                  |
| cancels the duration timer after an explicit stop                                                                                          | Ordinary                                  |
| cleans up active recorder, tracks and timer on unmount and suppresses late callbacks                                                       | Ordinary                                  |
| accepts an uploaded audio file of 8388607 bytes without starting capture                                                                   | Ordinary                                  |
| accepts an uploaded audio file of 8388608 bytes without starting capture                                                                   | Ordinary                                  |
| rejects an uploaded audio file one byte above 8 MiB without a callback                                                                     | Ordinary                                  |
| releases the granted stream if recorder constructor fails                                                                                  | Ordinary                                  |
| releases the granted stream if recorder start fails                                                                                        | Ordinary                                  |
| keeps the permission-error fallback readable in Kazakh                                                                                     | Ordinary                                  |
| MIC-01: must not start a late permission stream after the parent becomes disabled                                                          | Expected failure; ordinary in strict mode |
| MIC-02: becoming disabled during capture must release tracks and discard the clip                                                          | Expected failure; ordinary in strict mode |
| MIC-05a: must reject a recorded clip larger than 8 MiB before onFile                                                                       | Expected failure; ordinary in strict mode |
| MIC-05b: must not forward an empty recording as an audio file                                                                              | Expected failure; ordinary in strict mode |
| MIC-04: recorder error must release microphone tracks and duration timer                                                                   | Expected failure; ordinary in strict mode |

| Browser leaf name (PR20 → PR21 retained)                                                                                  | Difference                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| real desktop Chromium fake-device recording stops, sends actual MIME multipart only after Prepare, and never writes money | Ordinary in both; no coverage removed                       |
| real recorder automatically stops at the 30-second browser timer and releases its generated audio track                   | Ordinary in both; no coverage removed                       |
| unsupported recorder MIME fails before requesting a device and keeps file/text fallback                                   | Ordinary in both; no coverage removed                       |
| real file picker sends generated WAV bytes and KK locale as multipart, with no text or financial write                    | Ordinary in both; no coverage removed                       |
| an oversized upload is rejected in the browser without calling the API                                                    | Ordinary in both; no coverage removed                       |
| synthetic API 415 preserves the chosen audio and manual amounts without retry or money writes                             | Ordinary in both; no coverage removed                       |
| synthetic API 422 preserves the chosen audio and manual amounts without retry or money writes                             | Ordinary in both; no coverage removed                       |
| synthetic API 503 preserves the chosen audio and manual amounts without retry or money writes                             | Ordinary in both; no coverage removed                       |
| synthetic API 504 preserves the chosen audio and manual amounts without retry or money writes                             | Ordinary in both; no coverage removed                       |
| leaving Sale while recording releases tracks and does not submit an abandoned recording                                   | Ordinary in both; no coverage removed                       |
| synthetic Chromium microphone denial leaves text, audio-file and manual entry available                                   | Ordinary in both; no coverage removed                       |
| selected audio can be listened to before submitting (currently absent)                                                    | Opt-in skip in #20 → ordinary in #21; additional assertions |
| recording can be cancelled and discarded separately from Stop (currently absent)                                          | Opt-in skip in #20 → ordinary in #21; additional assertions |
