# Live provider / ASR readiness — not executed

Status: dry planning and offline tests complete. **0 paid provider requests,
0 authorized recordings, WER unmeasured, live latency unmeasured.**
The earlier presentation budgets are not authorization for this Stage 8 experiment.

## Fixed design and pending owner decisions

Default plan: 18 synthetic text inputs, six RU / six KK / six mixed, selected IDs
in [live-manifest.template.json](live-manifest.template.json). The same observed
provider output is replayed through both validators, so comparison never doubles
paid calls. This small sample is a feasibility experiment, not a final accuracy study.

Optional later audio stratum: six consented recordings (two per language) of the
selected synthetic phrases. Record speaker consent, device/microphone, sample rate,
reference transcript and content hash separately. No real customer names or balances.
No audio exists in Stage 8; the tool's synthetic WER arithmetic tests are not ASR results.

Provider choice is explicit, one provider per plan. Exact model/version and, for OpenAI
audio, transcription model must be confirmed by the owner and written into the manifest.
The shipped fields are deliberately empty. Repository model-name branches describe
current adapter code, not a verified available model, price or reproducible provider snapshot.
Changing provider, model, prompts, samples, budget or audio changes plan SHA and requires
a new approval. To compare providers, use separate plans and report that different factor.

## Exact configuration and adapters

Tool: `apps/api/tools/stage8_eval/live.py` at 92aba501844d777fd7a2175b8a7e72a82ffb09bf.
The [dry plan](live-dry-plan.json) exports full SYSTEM_PROMPT, OpenAI semantics,
output schema, exact text/locale inputs, provider source hash and generation settings.
Do not reconstruct prompts from this abbreviated description.

- OpenAI: existing adapter, sequential transcription then extraction for audio;
  text extraction uses Responses, max_output_tokens 2048, store false, background false.
  Its model-specific reasoning branch is preserved. No provider tools or DB access.
- Gemini: existing generateContent adapter with JSON schema, temperature 0,
  maxOutputTokens 4096 and the existing model-specific thinking branch.
- Tool calls generate once with retry=false. It does not invoke provider fallback
  or the application parsing-retry loop. Timeout is at most 25 seconds per item.
- Text uses ru/kk/auto. Audio is normalized by the existing 30-second / 8 MiB guard
  to mono 16 kHz; WAV, MP3, OGG, WebM, M4A/MP4, FLAC paths are allowed.
- OpenAI adapter output has already been decoded/re-encoded. The duplicate-key
  limitation in [error analysis](error-analysis.md) must be fixed/reviewed before
  claiming complete end-to-end malformed-output protection.

## Cost and authorization

Current authorized budget is **0 USD**. No current vendor prices or billed spend
were verified. Before execution, owner reviews input/output/audio rates for exact
models and sets a conservative reserve per provider request and max budget.

Planned reservation = request slots × reserve_usd_per_request, constrained to ≤
max_budget_usd. Text is one slot; OpenAI audio is two slots (ASR + extraction).
Default 18 text items reserve 18 requests; adding six OpenAI audio items would require
30 request slots, a new maximum and a new approval. Gemini audio is one slot each.

This cap is a procedural allowance based on owner-supplied rates, **not a
provider-enforced spending quota or billing proof**. Configure any hard vendor quota
separately through its authorized owner. Actual cost remains null without billing.
Never substitute the reserve for billed cost.

A local approval file (never commit it) must contain:

```json
{
  "allow_paid": true,
  "approval_id": "<fresh UUID, once only>",
  "approved_by": "<authorized owner>",
  "plan_sha256": "<hash of exact reviewed plan>",
  "expires_at_utc": "<future ISO8601 UTC expiry>",
  "allow_consented_audio": false
}
```

This is an operator interlock, not cryptographic evidence that an owner consented.
Do not generate an approval on the owner's behalf. Every execution consumes its
UUID atomically even on failure; do not delete/reuse reservation files to repeat calls.

## Dry run (safe, no keys needed)

From apps/api:

```powershell
.venv/Scripts/python.exe -m tools.stage8_eval.live --manifest ../../docs/diploma-evidence/ai-evaluation-stage8/live-manifest.template.json --output ../../tmp/stage8-live-review
```

The output directory must be new and under the worktree's ignored tmp/.
Inspect plan.json, then obtain approval. Do not execute this next command during Stage 8:

```powershell
# ONLY after separate, explicit approval of the exact local plan and budget:
.venv/Scripts/python.exe -m tools.stage8_eval.live --manifest ../../tmp/stage8-private/manifest.json --approval ../../tmp/stage8-private/approval.json --output ../../tmp/stage8-live-approved-run --execute
```

Provider keys are supplied through local process environment by the authorized owner,
never the manifest, approval, Git or chat. The CLI does not read .env by default.
Dry execution does not construct a provider or access its keys.

## Privacy, failures and reporting

Audio must be inside ignored tmp/stage8-private-audio with consent reference,
reference transcript, SHA-256 and MIME. Missing/changed/oversized/invalid audio
aborts before its upload. Never publish recordings or raw outputs without review.
Only synthetic input is permitted; if unexpected sensitive output appears, stop
and keep it private. No financial endpoint is called by this runner.

Successful/failed provider attempts are persisted locally after each item. The
first timeout/provider/parsing error stops the batch; remaining IDs are Not Run.
There are no automatic paid retries or parallel requests. Authorization/preflight
errors may abort before any provider attempt; retain their console error with the
plan and do not label them a measured inference.

Log adapter output (synthetic experiment only), plan/source hashes, field scores,
attempt status/error code and monotonic request duration. Never log keys, tokens,
headers or real merchant records. Interrupted/cancelled process runs require manual
review of the consumed approval and partial output before any new authorization.
One-use files are local safeguards, not a globally distributed budget system.

Latency is provider generation round trip, including ASR for OpenAI audio, excluding
user input/correction/financial saving. It is not a UI task-time measure. Keep failures
in attempted denominators and list unrun cases. WER uses case-folded Unicode word
tokens and edit distance against the approved reference, only for actual audio.
Report text field accuracy, audio field accuracy and ASR WER separately, by language.
Cloud model aliases, infrastructure, decoding and elapsed dates limit reproducibility
even with identical plans. No live metrics can currently be supplied.
