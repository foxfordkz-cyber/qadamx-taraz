# Stage 7 frozen multilingual extraction corpus

Dataset: QADAM-EXTRACTION-SYNTHETIC-100-v1.
Source: `apps/api/tests/fixtures/extraction_stage7.json`.
Freeze/hash manifest: `extraction_stage7_freeze.json` in the same directory.

100 authored synthetic utterances, not merchant conversations, recordings or survey participants. Groups: 20 full sales, 20 partial sales, 20 explicit-credit/missing-information cases, 20 repayments, 20 ambiguous/contradictory/non-transaction/invalid-provider cases. RU, KK and mixed input are recorded per case. Numerals include words, decimals, ordinary/NBSP/narrow spaces and thousand expressions.

Every row freezes text, language, category, expected transaction fields, expected clarification requirements, and **one authored provider response**. Some responses are intentionally faulty (scale, status, invented customer, duplicate JSON). They are controlled fault injections, not outputs collected from a live LLM. The same response is replayed to both implementations. This evaluates the production **post-provider extraction boundary**, not speech recognition or end-to-end language understanding.

Gold annotations describe the requested transaction and conservative clarification when a field is not established. Customer gold is the spoken canonical **name query**, not a database UUID. Names are fabricated fixtures. Description quality is outside the numerical metrics; production draft tests separately check missing descriptions. Repayments always require explicit sale selection.

The corpus and annotations were created/frozen before running the before/after comparison or editing production extraction. Freeze commit records the ordering in Git. They are development/evaluation cases authored by the implementer, not a blind independent test set. No training, participant recruitment or real model-performance claim is made.

Do not change gold to improve scores. Corrections require a separately versioned dataset and retained results on this original version. Frozen Stage 1 assistant corpus is unrelated and unchanged.
