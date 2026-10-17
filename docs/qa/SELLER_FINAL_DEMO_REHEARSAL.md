# Seller final demo rehearsal — 2026-10-17

Base synchronized on resumption: main `9845b91b64d388c54312d2a8a75000218c7774af`.
Recovery is reviewed
separately in `fix/seller-customer-recovery-safe`; it is not deployed by this task.
Registration is separate Draft PR #31, synchronized at
`6f808677c067cc00fb6b6b9eb26384f68c3d1e38`; callback/live email remain Blocked.

Published addresses: [Qadam web](https://qadamx-taraz.vercel.app),
API `https://qadamx-taraz.onrender.com/api/v1`.
Own read-only HTTP probes before the saved checkpoint: web root **200**, health **200**,
OpenAPI **200 / 0.6.2**, public venues **200**, returning MART, Кайкармет and
Ауыл Береке. These are reachability/contract observations, not browser, Auth,
3D, process-SHA or persistence acceptance. Historical captain evidence is in
MAIN_RELEASE_20261017.md and MODELS_PRODUCTION_ACCEPTANCE.md and is not counted
as our new testing.

This is an operator-ready rehearsal plan, not a completed production acceptance.
The resumed task repeats local suites and reviews this matrix; it does not repeat
those hosted probes or send any live writes. Record a new timestamp, deployment
commit and actual result beside each live step when the captain runs it.

## Rehearsal matrix

The status column concerns the complete published/live action. Local automated
evidence is stated separately. Exact current-run counts/commands are in the seller
handoff. Synthetic financial snapshots do not independently prove backend
accounting or server idempotency.

| # | Action | Expected | Actual / evidence | Status | Live backend needed | Safe fallback |
|---|---|---|---|---|---|---|
| 1 | Open published Qadam | HTTPS public page is reachable | Own HTTPS GET root200; visual browser rehearsal not performed | PASS HTTP / BLOCKED visual | Public hosting | Clearly labelled local preview |
| 2 | Show public 3D | Three correct conceptual models and usable controls | Current local public E2E exercises WebGL-disabled fallback, not the three production models | BLOCKED live 3D/device | Public API/assets | Accessible venue cards and previews |
| 3 | Select venue and shop | Matching shop route/identity | Own live venues GET returns three names; local generic fixture tests route navigation at360/390/768/1440 | BLOCKED full live path | Yes, public GET | Labelled fixture shop |
| 4 | Show catalogue and send training inquiry | Correct product data and confirmed receipt | Local public fixture checks catalogue, validation and RU/KZ; rejects POST deliberately | BLOCKED live inquiry | Yes; agree training destination first | Fill form and show validation without submission |
| 5 | Sign in to Seller | Supabase session and protected route | Synthetic SDK/HTTP Auth suites only; no training password used | BLOCKED live Auth | Yes, Supabase + /me | Explicit Demo, never fake real login |
| 6 | Select permitted point | Only /me memberships | Synthetic A/B, business switch and revoked access checks | BLOCKED live access | Yes | Synthetic allowed memberships |
| 7 | Create/select training customer | Keyed POST; confirmed receipt or safe unknown recovery | Captain late-K1 regression reproduced red; corrected recovery regression evidence in handoff | BLOCKED production recovery | Fix review/deploy and approved training write | Synthetic recovery; existing approved customer read-only |
| 8 | Record RU/KZ phrase | Explicit capture, MIME supported, ≤30 seconds, stop/cancel cleanup | Real Chromium MediaRecorder with generated fake device only | BLOCKED physical Android | Recording local; no backend yet | Manual text or consented local file |
| 9 | Play/pause then explicitly send to AI | Playback before upload; one explicit request | Fake-device browser/component checks, synthetic AI HTTP boundary | BLOCKED physical audio / paid AI | Yes for AI; separate consent/budget | Generated local audio, clearly mocked transport |
| 10 | Review draft/clarifications | No invented amount; explicit confirmation | Voice tests cover stub draft, missing fields, late/cancelled response and failure fallback | BLOCKED live model | Yes; separate paid-call approval | Manually checked input |
| 11 | Confirm3000 ₸ sale /1000 ₸ received | One operation, total300000/received100000 minor | One synthetic UI journey asserts exact body, duplicate-submit lock and same-key/body money retry | BLOCKED live money | Separate financial-write approval required | Synthetic journey only |
| 12 | Show debt2000 ₸ | Server snapshot200000 minor | Same journey displays canned server balance | BLOCKED live balance | Yes | Explicit synthetic snapshot |
| 13 | Repay500 ₸ | Separate operation50000 minor; sales unchanged | Same journey asserts repayment payload and distinct operation key | BLOCKED live money | Separate financial-write approval required | Synthetic repayment |
| 14 | Show remaining1500 ₸ | Correct server balance150000 minor | Same journey displays canned remaining/received values | BLOCKED live balance | Yes | Explicit synthetic snapshot |
| 15 | History, Summary, Analytics7/30 | Both entries, totals,24-hour chart, reload/scope isolation | Synthetic journey + Analytics tests cover periods, errors/retry and business switch | BLOCKED fresh live evidence | Yes | Clearly labelled synthetic report |
| 16 | Demo and RU/KZ | Training label; no server writes; responsive UI | Local Seller/Demo tests assert labels/language/no writes at four widths | BLOCKED published browser observation | No for explicit Demo | Local explicit Demo |
| 17 | Logout and foreign-point denial | Clear private UI; ignore old responses; deny foreign IDs | Synthetic Auth A/B/A epoch, late401 and business isolation tests | BLOCKED fresh live evidence | Yes | Synthetic A/B regression |

## Operator sequence and gates

Before the demonstration, the captain supplies the reviewed deployed web commit,
API version, approved account/point and permissions for training writes. Keep
credentials out of this document. Assign one presenter and one observer. The
observer records only request IDs, operation/customer IDs permitted for the test,
expected amounts and PASS/FAIL/BLOCKED; do not capture tokens or personal fields.

For a rehearsal without those prerequisites, run the synthetic money journey
and recovery suite from `apps/web` using the commands in the seller handoff.
Announce the synthetic API before showing it. For a failed live step, stop and
use its labelled fallback; never silently switch to Demo and describe it as live.
For an unknown save outcome, stop the write sequence and check the original key.
If only a presentation is needed, open explicit Demo and navigate without writes.

Use approved training accounts and one agreed customer/point. Before any real
write record starting server totals; compare deltas rather than assuming an empty
business. Do not publish customer data, tokens, passwords or audio. Do not
retry an unknown customer request with a fresh key. Use the saved request status;
`not_observed` is not proof that a late worker cannot commit.

Before live steps7/11/13 obtain captain approval for the training writes and
confirm the reviewed Recovery code is deployed. Before physical recording obtain
speaker consent and device availability; before AI obtain separate paid-call
approval/budget. Preserve any agreed recording privately, never in Git. No paid
AI, shared database writes, migrations or Vercel/Render/Supabase changes occurred
in this task.

Registration callback requires exact URL, redirect allowlist and agreed
mechanism/landing page plus email-delivery acceptance. It is not silently enabled
in this main-based Recovery branch. Physical Android/GPU/microphone remains
Blocked without a device. Do not describe this checklist as a completed live
end-to-end demonstration.
