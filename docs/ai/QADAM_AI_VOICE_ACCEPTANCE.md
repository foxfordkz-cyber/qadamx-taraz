# AI/voice acceptance — Stage 1, 2026-11-11

## Verified scope and limits

This stage corrects failure handling, not model quality. No live Gemini/OpenAI
request, fallback to a paid provider, physical microphone recording or provider
billing lookup was performed. Real provider extraction accuracy is **not measured**.
The main-based build does not inherit the native Windows branch's local Whisper
or model configuration. They must not be advertised as published functionality.

The reported quota text came from `AnalysisError`: HTTP 429 or the compatibility
code `AI_QUOTA_EXCEEDED` selected a categorical “quota exhausted” translation.
The server maps a provider HTTP 429 to that code/HTTP 503. Neither establishes
whether the provider rejected request frequency, quota, billing or a model-specific
limit. The safe diagnostics logger records stage/status/model/request ID without
private text/audio or keys; a hosting owner must correlate these with provider logs.
No such production diagnostic evidence was available in this task.

## Implemented behaviour

- RU/KZ message states that request frequency or quota may be the cause and the
  exact cause is unconfirmed. It promises retention only on the current page.
- Text/file and existing editable values remain in component memory on failure.
  Switching user/business unmounts the form. Reload does not provide a durable
  audio/text archive; do not imply offline persistence.
- Valid Retry-After seconds/HTTP dates become a safe integer response header;
  raw provider messages/headers are never forwarded. CORS exposes Retry-After.
- Existing HTTP 503 / `AI_QUOTA_EXCEEDED` compatibility and error JSON envelope
  are retained. Frontend also supports a direct HTTP 429.
- Prepare/retry/clarify respect the deadline. Editing input or choosing manual
  mode does not erase the wait. Timer expiry only enables a button, never sends.
- No new monetary write, provider fallback, rate-limit bypass or automatic
  retry is added. Manual finance remains available. Backend still validates every write.
- Existing request cancellation, bounded analysis and stale-account result
  suppression are covered by regression tests.

## Acceptance boundaries

| Boundary | Evidence | Interpretation |
| --- | --- | --- |
| RU/KZ/mixed text → canned draft → editable form | voice-adaptation regression | Synthetic provider, not language model evaluation |
| 429/503 → Retry-After → manual mode / explicit retry | test_retry_after, retry-after.test, ai-rate-limit Chrome acceptance | Controlled provider/HTTP faults, no paid calls |
| Record/stop/pause/cancel/playback/file constraints | microphone/voice component suites | Synthetic browser media, not physical devices |
| No configured AI → actual API error → manual input | stability-postgres acceptance | Real local FastAPI; no AI answer claimed |
| Confirm → real SQL ledger | stability-postgres acceptance | Isolated synthetic business; unrelated to speech accuracy |
| Physical Android/iPhone/microphone and live model | Not Run | Requires authorized devices, environment and budget |

Actual command outcomes and final commit/PR are recorded in
[QADAM_CRITICAL_BUGFIX](../qa/QADAM_CRITICAL_BUGFIX.md).
Synthetic fault screenshots: [RU desktop](../qa/evidence/critical-stability-20261111/ai-rate-limit-ru-desktop.png)
and [KZ mobile viewport](../qa/evidence/critical-stability-20261111/ai-rate-limit-kz-mobile.png).

## Next stage gate

After Stage 1 review, use `feature/qadam-ai-voice-reliability` for an authorized
Audio → transcript → extraction → editable draft → explicit confirmation acceptance.
Keep deterministic fixtures separate from live provider results. Obtain the
provider's actual error category before changing quotas/model/billing; never
infer it from the UI or spend quota to diagnose without permission.
