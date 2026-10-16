# AudioInput Playback & Cancel — coordination and implementation handoff

Date: 2026-10-16. **Implementation blocked pending selection of a single executor.**
This is a preparation record, not a claim that playback/cancel is implemented.

## Approved base and isolated branch

- Repository: https://github.com/foxfordkz-cyber/qadamx-taraz
- Base: `integration/local-combined-check`, `58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`.
- Working branch: `feature/voice-playback-cancel`.
- Separate worktree: `work/qadam-voice-playback-cancel`.
- PR #20 source: `test/mobile-microphone-acceptance:39a730e63e43bb8487ed2f9afb1ead7762737314`.
- Captain authorized minimal AudioInput changes, subject to the explicit coordination condition below.
- No branch/PR merge, rebase, force push or change to PR #19.

## Required owner coordination

Section 3 of the new task says: “Если обнаружено пересечение активных изменений, останови редактирование общих файлов до согласования исполнителя.”

The required fetch found a new owner commit:
`feature/aidana-ai-assistant:880d7137f39648f0bbce355369ee3e755d981f02`,
following `b91a9c6db1eceec8e155ecd628f22e700db9b195`.
It changes the same recorder/playback/cancel workflow. No owner reply or review selecting one executor was present in PR #20 at inspection.

Owner @sarsenbaevaaidana07 was notified with the concrete comparison and two executor options:
[coordination comment in PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20#issuecomment-6215397726).
A confirmation was also requested from the user. Neither elapsed time nor a requested review is approval.
Until assignment is confirmed, production voice files must stay untouched.
The captain's general permission does not remove the explicit active-overlap condition.

## Source comparison

Owner source is an older root application (`src/`, `backend/`), with common ancestor
`ced32e7aa8e737a0cbc5318715ad02bdc98a89d4`, not the unified `apps/web` application.
Do not merge/copy its entire tree.

| Area | Combined base | Owner 880d713 | Adaptation required after assignment |
| --- | --- | --- | --- |
| Playback | AudioInput only returns File; Sale displays filename | VoiceInput renders native audio controls and ready badge; Sale owns object URL | Use current recorded Blob/File, explicit Play/Pause/replay, duration when available, RU/KZ; no autoplay/upload |
| Delete | No delete/preview control | onRemove clears file; effect revokes URL | Stop playback, clear parent selected audio, revoke URL; preserve text |
| Cancel | Stop always publishes File | dispose marks capture closed; micRequest invalidates permission attempt | Explicit cancel during requesting/recording/stopping; stale callbacks cannot publish |
| Lifecycle | alive/unmount and synchronous start lock only | recorder release/dispose, failed/closed flags, request identity | Per-attempt generation for all callbacks, timer, late permission/error/stop; release tracks/listeners |
| Stop vs upload | Stop passes File; only Prepare sends multipart | Has “stop and analyse” and separate “listen first”; analyseRecording can trigger parse in onReady | Keep Stop/timer/Play/Cancel/Delete/unmount network-free; upload only existing explicit Prepare |
| MIME/timer | WebM/Opus, MP4, Ogg/Opus; 30-second timeout | Additional WebM/default fallback; pause/meter/device controls; 29-second headroom | Preserve existing contract/MIME; no unapproved device/meter/AI changes |
| RU/KZ | shared useLedgerText | Mostly inline Kazakh UI | Extend existing dictionary; no parallel locale/state framework |
| Finance/Auth | shared Supabase/runtime/useWrite | Separate root API, storage and financial implementation | Do not transplant root API, backend, financial or session logic |

Reviewed owner files: `src/features/voice/{VoiceInput.jsx,recorder.js,Sale.jsx,Sale.dom.test.js}`.
Presence of owner tests/source is not evidence that they pass in unified apps/web.
Root branch's apparent deletions compared with combined are a different baseline, not an integration patch.

## Proposed narrow implementation boundary

After executor approval only:

1. `apps/web/src/features/voice/AudioInput.tsx`: existing component extended with capture identity,
   intentional discard, safe stop/error/ended/unmount cleanup, preview and cancel/delete controls.
   Every asynchronous callback must check its own capture identity; invalidating one must never release another capture's resources.
2. `apps/web/src/features/voice/Sale.tsx`: minimal selected-file/capture-busy coordination.
   The same selected File must drive preview and explicit submission. Preserve manual text on cancel/delete,
   invalidate recording when input/context changes, keep existing parse lock and multipart body.
   Do not touch money calculations, save(), useWrite, backend or AI protocol.
3. `apps/web/src/features/ledger/i18n.ts`: only the required recording/preview RU/KZ labels and statuses.
   If layout needs styles, use a dedicated scoped voice stylesheet; no redesign.
4. Necessary component/browser tests plus seller handoff/report. Keep PR #20 itself unchanged.

One local capture lifecycle should cover idle/requesting/recording/stopping/ready/error;
playback derives playing/paused from the current audio element, uploading from the existing parent parsing state.
Do not create a second financial/AI state machine.
Revoke each created object URL on replacement/delete/unmount, pause detached playback, remove listeners.
Error cleanup must suppress final data/stop from failed captures. Cancel must be intentional, not shown as an error.
A logical cancel cannot dismiss an unresolved browser permission prompt; it must release any eventual stream immediately.

## Contract boundary

Current combined OpenAPI: API 0.6.0. Existing `POST /api/v1/businesses/{business_id}/drafts`
accepts multipart text OR audio, with locale. Audio cap 8 MiB / 30 seconds; server validates actual contents.
The active browser Sale sends the selected locale ru/kk and lets the browser set multipart boundary.
Keep the original MIME; no frontend transcoding. Explicit Prepare is the only audio submission path.
Existing parseLock prevents duplicate concurrent Prepare requests. Financial confirmation remains a separate action.
No Backend/OpenAPI/generated.ts/package/lock/Auth/router/public/financial changes are part of this preparation.

## Regression transfer plan

Select only the five test/helper/config files from PR #20; do not merge its entire branch.
Their capture setup requires verified Chromium fake-device flags and blocks external traffic.
Keep native synthetic permission-denied separate from fake-UI allow.

After implementing, playback/cancel browser cases must become ordinary always-run tests,
not skipped acceptance gaps. Any fixed component `.fails` case becomes ordinary `it`.
Do not delete assertions, reinterpret unexpected pass as success, or hide remaining gaps.

Required additions: Stop→Cancel before onstop; late old data/stop/error after new recording;
permission cancel then new request; double start/stop; all tracks ended; stream ending/error;
delete/replacement/unmount URL revocation and pause; Play/Pause/replay; text preservation;
file fallback; missing MediaRecorder/unsupported MIME/permission denial; 30-second timer;
zero requests for all capture/preview actions; one explicit multipart request on double submit;
RU/KZ, keyboard/focus/aria-live and widths 360/390/768/1440 with reduced motion.

PR #20 historical results: 22 ordinary component cases plus 5 expected failures,
11 synthetic browser cases plus 2 skipped missing UI cases. Its strict runs exposed
5 component and 2 browser failures. These are prior results, not this task's verification.
Outstanding on unchanged base: late grant after disabled, disabled active recording, empty/oversized
recorded File, recorder-error cleanup; missing cancel/playback. None is marked fixed here.

## Checks and continuation commands

Run from `apps/web` (Windows uses npm.cmd/npx.cmd):
```powershell
npm.cmd ci
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --no-file-parallelism
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run format:check
git diff --check
```

After selected test transfer, additionally use the dedicated microphone config and existing QA config.
Default E2E contains screenshot writers to tracked docs paths: preserve designer files, use a deliberately
scoped baseline run while implementation is blocked, and report the exact scope.
No mock/synthetic result establishes physical microphone, live AI or database behavior.

Fresh checks on this unchanged application baseline, in the new worktree:

- npm ci: PASS; package/lock unchanged. npm reports 3 inherited audit findings (1 moderate, 2 critical); no audit fix/upgrade performed.
- check:api, typecheck, lint (0 warnings), build, format:check: PASS.
- Unit verified: **142/142 passed, 12 files**; no new playback/cancel tests included or claimed.
- Synthetic E2E verified: **13/13** via `npm.cmd run test:e2e -- seller.spec.ts integration-design.spec.ts`
  with temporary CI=1 (no reuse of unknown server). Existing widths 360/390/768/1440 covered.
  This is a scoped baseline, not full default/QA/microphone E2E and not a check of the proposed new controls.
- Build retains empty-auth and large-3D-chunk warnings. No public auth env was installed in this worktree.
- git diff --check and documentation/protected-path inspection: PASS before commit.
- Remaining missing playback/cancel/lifecycle behaviors are unchanged; historical PR #20 failures are listed above,
  not rerun or relabeled as passing. Source/test files from PR #20 are not yet imported.

## Android / HTTPS

Physical Android acceptance: **Blocked** unless a real authorized device and a reachable HTTPS frontend preview
are available. A localhost secure context or HTTPS API alone is insufficient.
No microphone permission, personal audio, uploads, login, live AI or financial writes are performed by this audit.
Fresh authorized adb enumeration: **0 devices, 0 authorized, 0 unavailable**; device IDs were not output/saved.
No HTTPS frontend preview was supplied or found in the reviewed integration documents.
Previous task's API health check is historical; no live Backend verification was repeated here.
Need captain/owner assignment, then HTTPS frontend + API/CORS + real device and speaker consent for physical acceptance.

## Git snapshot after initial fetch

| Remote branch | HEAD |
| --- | --- |
| main | 8c932dd49b8defa8456fd3b7015ed7828ddae3b7 |
| integration/team-mvp | 3d009dc86c93debcab05dedda530b7d1fe62a304 |
| integration/local-combined-check | 58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76 |
| feature/seller-design-integration | c9e099e2ce2b0d5c25552542f72b9b369f5d7b5b |
| feature/seller-analytics | ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1 |
| fix/seller-auth-unicode | 28960f21e13c9c38077bf68b7bb5449eb9aa824d |
| test/mobile-microphone-acceptance | 39a730e63e43bb8487ed2f9afb1ead7762737314 |
| feature/aidana-ai-assistant | 880d7137f39648f0bbce355369ee3e755d981f02 |

PR #11/#14 → integration/team-mvp; #16/#17/#19/#20 → integration/local-combined-check;
#18 → integration/livestock-https; #13 → backend/livestock. All open Draft and mergeable at initial inspection.
No PR for head feature/aidana-ai-assistant was returned by the repository PR search.
Do not merge PR #14 again, or assume other branches' features are part of this base.

## Publication of the completed preparation

Audit commit: `03226ff6f59a6eeae2338c8e5d000657b5400a82`, pushed successfully to
`origin/feature/voice-playback-cancel` with equal local/remote HEAD.
[Draft PR #21](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21) targets the exact base above;
mergeable at the first published audit HEAD. This subsequent documentation commit records publication only.
The current exact HEAD is available via `git log -1 --format=%H` and in the PR description.
No executor confirmation had arrived before publication; implementation remains blocked by section 3.
