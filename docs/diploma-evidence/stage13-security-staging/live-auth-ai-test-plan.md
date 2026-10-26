# Live provider acceptance plan — NOT RUN

No paid requests or live Supabase changes are authorized in Stage13. Offline
fixtures preserve production verification/routes but do not certify real providers.
Default live call budget is **0** until the captain explicitly approves the exact
provider, model, account, inputs, call count and money cap. No historical budget
from microphone presentation testing is reused.

## Supabase gate and matrix

Owner must provide an approved separate test project and two consented test
accounts, exact HTTPS frontend and callback URLs, destination, redirect allowlist,
PKCE/implicit decision and configured issuer/audience. Credentials go into the
approved secret channel, not this document. The app currently fixes registration
callback to `https://qadamx-taraz.pages.dev/auth/callback`; arbitrary staging
registration is refused. Separate approval/implementation is needed, not an env
override. Preserve existing allowlist entries and production Auth behavior.

For the approved environment record URL, source SHA, browser, API version, UTC:
login → /me → business memberships → reload/session restoration → expiry/refresh
→ invalid signature/issuer/audience rejected → owner A cannot access owner B
business/entity/feedback → A→B→A ignores old responses → logout clears UI and
subsequent protected access fails. Do not log JWTs or export browser storage.
Registration/resend/callback tests require additional email permission; login-only
success does not certify email confirmation or callback handling.

## Text AI gate

Choose exactly ONE primary provider/model after confirming account availability
and current price. Record exact model returned, model configuration, source SHA
and request timeout. Proposed bounded pilot for approval: 12 synthetic prompts,
4 RU / 4 KZ / 4 mixed; maximum 12 primary calls, no automatic paid retries or
fallback calls. This proposal is not permission; captain supplies the currency cap.
Include partial/full/unknown payments, repayment, ambiguous customer, contradictory
amounts and invalid request, with gold annotations frozen before any calls.
Use the existing frozen corpus without changing labels; results are on developer-
exposed synthetic cases, not independent merchant accuracy.

Store sanitized per-case transaction type, amounts in integer minor units, customer
association, clarification needs, schema/duplicate-key validation, error category,
latency, token usage and billed cost if reported. No fabricated zero-cost outcomes.
Record failed/time-out calls in denominators. HTTP 200 is not semantic correctness.
Report field/full exact-match and latency p50/p95 with sample-size limitations,
not an unsupported population claim. Verify 503/manual fallback and that no ledger
row appears before explicit authorized confirmation. Raw responses require privacy
review; no secrets or real customer names in published evidence.

## ASR gate

Propose a separately approved, capped set (not part of the 12 text calls): two
consented or synthetic recordings per RU/KZ/mixed language, max 6 ASR calls and
no paid retries. Exact provider/transcription model and additional budget must be
approved. Record MIME/container/codec, duration, bytes, device and language hint;
honor current API formats, 30-second and 8 MiB limits. Synthetic speech must be
labelled and never substituted for physical microphone acceptance.

Freeze human-checked reference transcripts before calls. Publish raw transcript
comparison only with consent; specify Unicode/case/punctuation normalization and
tokenization identically for reference and hypothesis. WER = (substitutions +
deletions + insertions) / reference word count. Report both per-case counts and
corpus-weighted WER per language; do not average language percentages blindly.
Empty references require a separate failure category, not division by zero.
Also assess numeric/customer correctness after extraction; a low WER alone does
not prove safe amounts. Record errors/timeouts and manual fallback. Physical
Chrome/Safari/Android/APK acceptance remains separate and unperformed here.
