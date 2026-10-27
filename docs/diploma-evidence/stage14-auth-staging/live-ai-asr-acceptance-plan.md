# Frozen live acceptance specification

[14-case packet](live-ai-asr-test-cases.json), [LF checksum](live-ai-asr-test-cases.sha256).
Source a42c72d7. New developer-authored synthetic examples, frozen before first
execution; not merchant speech, blind holdout or model accuracy. Older frozen
datasets, including Stage1, unchanged.

| Level | Scope | Stage14 result |
|---|---|---|
| Offline response validation |12 extraction doubles, duplicate JSON, fact fallback |14/14,0 provider calls |
| Actual text generation |Same12 prompts plus factual question |NOT RUN |
| ASR |Two consented recordings per RU/KZ/mixed with frozen human transcripts |NOT RUN; no invented audio |
| User-facing flow |Real staging Auth → API draft → human confirmation → SQL/readback |NOT RUN; previous synthetic E2E historical |

Offline pass verifies supplied payload validation, not generation quality.
S14-10 deliberately supplies1500 payment on1000 sale: clear it. S14-06 payment
stays null, not0. S14-09 needs two synthetic Алия candidates in one business and
explicit selection. S14-07/08 require open-sale selection. Draft/DB behavior is
covered by fresh PostgreSQL tests, not inferred from the extraction-only script.

After approval: identify SHA/provider/model/config, provision NEW synthetic
businesses under owner's permission, record SQL baseline, deliberately send each
case, compare fields/evidence/clarifications, verify zero ledger delta before
human confirmation. Test manual fallback on invalid/quota/timeout/ambiguous
response. Confirm only desired synthetic writes; readback and same-key retry
must show one operation. customer_query is not a trusted customer UUID.

Record every attempted call/error, sanitized field results, latency and reported
usage. Field/full exact match includes failures; HTTP200 alone is insufficient.
ASR: capture model/device/browser/MIME/duration/bytes, consent and reference;
normalize Unicode NFC/case/punctuation identically, retain number tokens. Report
S/D/I and corpus-weighted WER separately by language plus amount/customer accuracy.
Empty reference is invalid, not zero WER. No retry for a favorable result.
Physical microphone acceptance remains independent of synthetic automation.
