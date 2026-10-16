# Android Voice acceptance — captain checklist

Prepared 2026-10-16. **Physical Android: BLOCKED** — no authorized device
available to this agent (`adb devices`: 0 authorized / 0 offline).
**Live Gemini: NOT RUN / BLOCKED**, tracked separately from recording/playback.
Synthetic Chromium and fake-microphone results do not certify an Android device.

## Preview observation (read-only)

- Frontend: https://negotiations-exist-newman-ohio.trycloudflare.com/login — HTTPS 200.
- API: https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1/health — HTTPS 200.
- OPTIONS `/api/v1/me` with the exact frontend Origin and Authorization
  request header — 200, matching Access-Control-Allow-Origin and allowed header.
- Supplied preview build: `7f511dd`; this is the captain's deployment identifier,
  not proof that the new registration-readiness branch is deployed.
- No preview, cloudflared, backend, shared Supabase, CORS or DB process/configuration
  was changed. Temporary tunnel URLs may expire; recheck before physical testing.
- This verifies reachability/preflight only, not authenticated API requests,
  microphone permission, SMTP, Gemini or database writes.

## Before starting

Use a captain-approved **training account and training point**. Confirm that the
speaker agrees to the recording and, separately, to any AI upload. Do not use real
customer names, debts or other personal data. Do not publish audio, tokens,
passwords, full network logs or screenshots containing real accounts.

Open Chrome's site information for the exact HTTPS origin. Confirm it is secure,
then use the app's existing Voice screen. Do not install certificates, change
shared service settings or bypass browser permission prompts. Record supported
MediaRecorder MIME and the actual recorded Blob type if available through an
approved debugging session; absence of such access is **Not observed**, not PASS.
Uploaded files can be processed only after explicit seller action.

Fill this run header once; every row below inherits it:

| Field | Actual |
| --- | --- |
| Date/time/tester | To be filled |
| Phone manufacturer/model | To be filled |
| Android version | To be filled |
| Chrome version | To be filled |
| Exact frontend commit/build | To be confirmed by captain |
| Frontend origin / API origin | Recheck URLs above |
| Teaching account/point alias (no credentials) | To be filled |
| Speaker consent / AI upload consent | Yes / No, separately |
| MediaRecorder available / supported MIME / actual Blob MIME | To be observed |

## Physical test record

For each row fill **PASS / FAIL / BLOCKED**, actual behavior, and error +
reproduction steps. Current status for every row is **BLOCKED: no physical device**.

| # | Action and expected result | Status | Actual / error / reproduction |
| --- | --- | --- | --- |
| 1 | Open HTTPS preview in Android Chrome. No insecure-context warning; usable mobile layout. | BLOCKED | — |
| 2 | Sign in with training account. Real session survives reload; no credential logging. | BLOCKED | — |
| 3 | Select assigned training point. No foreign memberships; switch uses the selected point. | BLOCKED | — |
| 4 | Allow microphone when requested. Capture starts only after permission; observe indicator and MIME support. | BLOCKED | — |
| 5 | Record a short Russian training phrase. Timer works; additionally let a new recording reach 30 seconds and confirm automatic stop. | BLOCKED | — |
| 6 | Stop → Playback → Pause → Replay. Audible local recording, correct pause/restart, no automatic AI upload. | BLOCKED | — |
| 7 | Cancel while recording. No usable canceled clip or AI request; microphone indicator clears. | BLOCKED | — |
| 8 | Delete a completed recording. Player/file selection clears; no stale audio can be sent. | BLOCKED | — |
| 9 | Record a short Kazakh phrase. Stop/playback contains the new phrase, not the deleted clip. | BLOCKED | — |
| 10 | Navigate away while recording, then return. No late preview/upload; old recorder cannot overwrite the new screen. | BLOCKED | — |
| 11 | Verify microphone released after stop, cancel, delete, navigation and logout; record again successfully. | BLOCKED | — |
| 12 | Deny microphone in site settings, reopen. Clear error, manual/file fallback stays usable; restore permission and retry. | BLOCKED | — |
| 13 | Upload an approved training audio file. Supported MIME accepted, unsupported/oversized file rejected; preview replace/delete works. No auto-send. | BLOCKED | — |
| 14 | Use manual text/form entry with no microphone. Mobile keyboard/navigation usable; no microphone dependency. | BLOCKED | — |
| 15 | Only with explicit permission, send the training audio/text to AI. Exactly one request; pending/error/retry behavior clear. | BLOCKED | Live Gemini separate |
| 16 | Verify transcript and clarifications against spoken training phrase. Edit the draft; reject incorrect recognition. | BLOCKED | Live Gemini separate |
| 17 | Verify AI creates only a draft; no finance POST before a separate seller confirmation. Stop before a real money save unless separately authorized. | BLOCKED | No money-write authorization |

For a failure record the row number, inherited run header, exact steps, expected
vs actual behavior, visible error and whether retry/navigation changed it. Share
only sanitized evidence. A browser emulator or uploaded file alone cannot turn
the physical microphone rows into PASS.

## Separate outcome

- HTTPS reachability/CORS: **PASS for the read-only probes above**, observed
  2026-10-16; recheck before the device session.
- Synthetic frontend regression: see [Auth audit](../SELLER_REGISTRATION_AUDIT.md)
  and [seller handoff](../handoffs/seller-web.md) for this branch's actual counts.
- Physical Android: **BLOCKED**, awaiting device/operator and training credentials.
- Live Gemini: **NOT RUN / BLOCKED**, awaiting explicit approved input/consent and
  working authenticated preview. No real audio or customer information uploaded.
- Registration/email confirmation: separate onboarding approval remains pending;
  the checklist can use an existing approved training account.
