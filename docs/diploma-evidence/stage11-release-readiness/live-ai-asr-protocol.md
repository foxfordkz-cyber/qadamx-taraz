# Real AI / ASR acceptance — fixed, opt-in protocol

Status: **Blocked / Not Run**. Authorized paid ceiling for Stage11: **$0.00**,
actual provider requests: **0**. No new audio collected. Previous October18 budgets
do not authorize this evaluation.

The existing guarded Stage9 runner was executed in **dry-run only**. It freezes
18 text inputs, system prompt/schema/source hashes and timeout25s in
[live-dry-plan.json](live-dry-plan.json). Exact provider/model fields remain unapproved.
The template's OpenAI provider is a planning choice, not a verified accessible model.
It cannot authorize execution with empty model, zero reserve or missing approval.
No current provider availability/price/performance is claimed.

## Fixed design before owner approval

- Text batch: those exact18 known synthetic cases, six per RU/KZ/mixed stratum.
  Do not change prompts or delete failures after seeing responses.
- Optional audio batch: two predeclared cases/language (six recordings), same text;
  obtain speaker consent and reference transcript, private path/hash and duration
  before fixing a new manifest. A human must record; no fake microphone.
- OpenAI path estimate:18 text calls +6 ASR +6 extraction =**30 provider requests**.
  Additional retries/fallback/devices are **not included or authorized**. Gemini
  native audio uses different request accounting and may parse-retry; approve its
  worst-case bound separately. Browser clicks are not the cost unit.
- Captain must enter exact provider model revision, ASR revision, project access,
  approved positive budget/reserve (including worst-case tokens/audio), expiry and
  billing limit. The owner reviews current provider pricing separately.
- No billable execution until a matching plan-hash approval exists. Run serially,
  no paid retry just to improve a score; stop on limit/unavailability/unknown cost.
  Compare before/after validators using the same recorded response, not fresh
  unrelated provider generations. These are known cases, not blind model evaluation.

## Operator procedure

1. Complete realAuth checklist and synthetic business permission. Capture deployed
   SHAs, contract, baseline authoritative balances; never use an unrelated live shop.
2. Lock manifest and consented reference audio; rerun dry plan; approve *that* hash.
   Source change or changed prompt requires a new approval. Use server-only keys.
3. One text draft at a time. Record request ID, provider/model revision, language,
   prompt hash, status, latency via monotonic clock, retries, usage and error code.
   Keep raw outputs in restricted local storage; publish only redacted synthetic data.
4. Observe draft with missing payment/ambiguous customer: no invented zero or selected
   debt. Confirm money only after human review and separate financial-write permission.
5. Audio: HTTPS physical permission → record → stop/playback → explicit send.
   Record device/OS/browser/MIME/duration; microphone denial/manual fallback also logged.
6. Compare ASR transcript to independently checked reference using word and character
   error rate (state normalization, preserve negations/currency; empty reference=NA).
   Separately score extraction on reference text and recognized text. Do not label
   end-to-end extraction failures all as ASR failures or vice versa.
7. Report kind/amount/payment/customer/clarification/full-match numerators and
   denominators by language; include unavailable/invalid cases, attempts and failures.
   Report success-only latency AND all-attempt latency p50/p95 with sample count.
   Small correlated samples are not population accuracy or performance evidence.
8. Reconcile explicit saved transactions against ledger; no auto-confirm, automatic
   duplicate retry or compensating money writes. Close/logout and review logs.
9. Reconcile estimated usage to provider billing; budget reserve is not actual spend.
   Retain consent privately, honor deletion terms, do not commit audio/tokens.

Existing CLI (apps/api) for preparation only:
`python -m tools.stage9_eval.live --manifest ../../docs/diploma-evidence/ai-evaluation-stage9/live-manifest.template.json --output ../../tmp/new-dry-plan`.
Stage11 did not invoke `--execute`. A dry plan cannot prove live API compatibility.
