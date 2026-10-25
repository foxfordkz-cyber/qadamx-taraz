# Optional live AI / ASR readiness — zero execution

Stage 9 executes no paid requests and collects no recordings. Live accuracy, WER,
ASR latency, actual cost and human agreement remain unmeasured.

The Stage 9 wrapper is `apps/api/tools/stage9_eval/live.py`. It reuses Stage 8's
single-use exact-plan approval, bounded sequential requests, private local outputs
and no-retry behavior, with four Stage 9 runtime source hashes and the exact Stage 8
baseline loaded separately. The default Stage 8 runner still refuses to label
changed runtime code as Stage 7. Its only tooling extension is an explicit optional
pair of comparison functions; application financial code is unaffected.

## Plan, models and budget

[Disabled manifest](live-manifest.template.json): 18 known synthetic text probes,
six per language. This is operational smoke/regression testing, not a blind new
research sample. Exact model and transcription model fields are empty.
Authorized budget and reserve are **0 USD**. Previous presentation budgets do not
authorize this experiment.

Before execution the owner chooses available exact provider/model versions, reviews
current token/audio prices and bounded input/output allowance, and approves a fresh
plan hash and expiry. No provider availability, price or actual billing was checked
during this offline stage. Repository model strings are code branches, not claims
of a current immutable model version.

The dry plan exports actual system prompt, structured schema, text/locale inputs,
adapter source hash and Stage 9 source hashes. OpenAI extraction caps output at
2048 tokens, Gemini at 4096; existing adapter-specific settings are preserved.
For audio, OpenAI uses one transcription and one extraction request; Gemini uses
one generateContent call. The same observed output is replayed offline through both
validators, not obtained twice from the paid provider.

Default maximum is 18 text requests. Any audio extension needs separately consented
files and a new explicit request/budget cap. For example six OpenAI audio probes
would add 12 request slots; this is request arithmetic, not authorization or a price.
Reserve × request slots must fit approved budget. This procedural guard is not a
vendor-enforced spending quota. Billing remains null until actual billing evidence.

## Safe preparation

From apps/api, with a NEW output directory:

```powershell
.venv/Scripts/python.exe -m tools.stage9_eval.live --manifest ../../docs/diploma-evidence/ai-evaluation-stage9/live-manifest.template.json --output ../../tmp/stage9-live-review
```

Default mode constructs no provider and reads no keys. Inspect plan.json.
Model/rates/approval remain unset; do not manufacture approval for the owner.

Only after separate explicit approval, use a private manifest and approval file:

```powershell
# NOT executed in Stage 9:
.venv/Scripts/python.exe -m tools.stage9_eval.live --manifest ../../tmp/stage9-private/manifest.json --approval ../../tmp/stage9-private/approval.json --output ../../tmp/stage9-approved-run --execute
```

Approval contains allow_paid=true, fresh UUID approval_id, approved_by, exact
plan_sha256, future expires_at_utc and, for audio, allow_consented_audio=true.
Source changes invalidate the plan. Approval is consumed atomically, including
failed runs; it is a local operator safeguard, not cryptographic consent or a
distributed budget service. Keys come only from the authorized local environment,
never from Git, chat or the manifest.

## Audio, errors and evidence

No authorized audio exists. Future audio must have consent reference, reference
transcript, MIME and SHA-256, under ignored tmp/stage8-private-audio (inherited
guarded path). Supported extensions WAV/MP3/OGG/WebM/M4A/MP4/FLAC; existing decoder
enforces ≤8 MiB and ≤30 seconds and normalizes mono 16 kHz PCM.
Do not publish real recordings or private transcripts.

First provider timeout/error stops the batch; failed attempted item and remaining
Not Run IDs are retained. There is no paid automatic retry/fallback or parallel
generation. HTTP/adapter validation errors keep existing safe codes.
Preflight errors before upload are not inference measurements.

Text field exact match, per-language errors, request latency and audio WER must be
reported separately. WER uses case-folded Unicode word edit distance only against an
approved reference for actual audio. Request latency excludes user correction and
financial saving. Retain failures and missing model/billing metadata.
Cloud model changes and nondeterminism limit reproducibility.

Only raw JSON text/bytes permit duplicate detection. Stage 9 rejects duplicates in
HTTP envelopes and inner extraction text before normalization. Already-parsed objects
are refused by the strict boundary; no claim is made about information removed
inside the provider before its HTTP response.

For genuinely independent research use the separate human annotation protocol and
a newly frozen dataset, not these already exposed 18 known probes.
