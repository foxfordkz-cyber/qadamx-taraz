# Fresh challenge and known regression results

## Independence and task boundary

The challenge was frozen at `9946ce34c996d1dd7027ec19e1fef2a85a6a01eb`
before execution. `challenge-freeze.json` verifies dataset and protocol hashes.
The author had seen earlier implementations and failures. No independent human
reviewer participated, so “fresh challenge” does **not** mean blind independent
scientific evaluation. Exact text overlap with frozen Stage 7/8 is checked; shared
language patterns and eleven aligned semantic families remain a limitation.

Clean text and authored raw provider replies are inputs to the existing
post-provider extraction/grounding pipeline. These results do not measure live
text-to-transaction model performance. No audio/ASR or paid calls occurred.

## First execution (retained)

Actual paired raw cases: [challenge-first/cases.jsonl](challenge-first/cases.jsonl).
Exact source hashes and counts: [summary](challenge-first/summary.json).
Both runs use the same frozen cases/replies; the baseline loader uses Git Stage 9
source rather than an invented “before” model. No production source changed in
Stage 10, so preservation rather than improvement is expected.

| Measure | Stage 9 | Stage 10 first run |
|---|---:|---:|
| Transaction type | 33/33 | 33/33 |
| Sale total exact match | 27/27 | 27/27 |
| Receipt exact match | 27/27 | 27/27 |
| Repayment amount | 3/3 | 3/3 |
| Customer query | 15/15 | 15/15 |
| Allowed customer candidate set | 15/15 | 15/15 |
| Clarification fields | 33/33 | 33/33 |
| Complete semantic result | 33/33 | 33/33 |
| Invalid structured reply rejected | 9/9 | 9/9 |
| Complete result including rejection | 42/42 | 42/42 |
| Unsafe-ready result | 0/33 | 0/33 |
| Invalid reply accepted | 0/9 | 0/9 |

RU 14/14, KK 14/14, mixed 14/14; each includes eleven semantic and three malformed
records. Improved IDs: none. Regressed IDs: none. Do not call 42/42 an independent
LLM accuracy or pool it with older datasets. The PostgreSQL parity cases verify
the projection against production customer matching and missing-field logic;
they are another test layer on the same 33 inputs, not 33 more observations.

The committed-tool replay is recorded separately in `challenge-final/` and must
retain exactly the same per-case outputs. It additionally provides per-category
summaries without changing any gold labels.

Replay source: `49832f828c890fb5346eaa0de06baf849bc3f4b0`. All 42 full raw case
records match the first execution exactly; both implementations remain 42/42,
zero improved/regressed IDs. The final category summaries and source hashes are
in [challenge-final/summary.json](challenge-final/summary.json).

## Known development regressions remain visible

The 120 Stage 8 cases are now an exposed regression set. Stage 9's evaluator
replays the saved Stage 8 baseline and the candidate on identical fixtures;
see `regression-stage9/` and full-test-results.md for this stage's execution.
Do not run the old Stage 8 source guard and silently relabel Stage 9 as Stage 7.

S8-080 (KK) and S8-084 (mixed): `мың` occurs independently and inside `екі мың`.
The current grounding refuses a unique total and retains the explicit payment,
whereas frozen gold expects total 100000 tiyn and unknown payment because of the
contradiction. Both paths require clarification. They remain exact-match errors;
no case-specific bypass or silent zero/ready-to-save result is added.

Stage 7 S7-090 remains a separate known mismatch. Stage 1 is a separate factual
validation task with its own frozen 42 constructed cases. Their results are
reported separately in full-test-results.md; none represents merchant data.

## What the browser/SQL layer establishes

Draft generation, invalid JSON fallback, read-only factual assistance and Research
leave the journal unchanged. Explicit confirmation creates the intended operation.
A lost operation response is resolved by the same key/body without another row;
a lost customer response resolves through the request-result endpoint without
another POST. These conclusions come from real local API/SQL assertions, not from
the extraction exact-match metric. Live providers and shared infrastructure remain
outside this evidence.
