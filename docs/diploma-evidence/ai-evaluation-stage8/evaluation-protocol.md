# Stage 8 preregistered offline protocol v1

Official topic: «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»

Freeze this protocol, generation script, JSONL, CSV and their SHA-256 manifest in Git
before importing/running either extraction implementation against the new corpus.
No production tuning is permitted after inspection of these held-out results in this stage.
Keep every original gold label; disagreements go in a separate review log.

Compare pre-Stage7 ai.py at ae43dc25543ab261511c8b5f5982c7dfe8112da8 with
Stage7 b84b4c70b58c21465705f1dc8c3ca31657054fce, integrated unchanged.
Replay identical authored provider responses, one provider call per case, text source
authoritative, locale ru/kk/auto for RU/KK/mixed, same Python/dependencies, no network.
This compares server validation, not provider models/prompts or ASR.

Target 120 examples: ten categories, each four RU, four KK, four mixed. Include coherent
transactions, missing fields, corrections, context/identity ambiguities, repeated amounts,
informal input, non-transactions and twelve malformed structured responses.
All names, businesses and amounts are synthetic. No real merchant data or audio.

Expected annotations: transaction kind, total/received/repayment integer tiyn or null,
spoken canonical customer query, eligible customer references within the active synthetic
business, required clarification fields, draft/rejection outcome and error category.
Candidate resolution in offline scoring is an explicitly labeled deterministic projection
of the existing literal case-insensitive substring/tenant lookup, not proof of identity.
Its SQL parity must be tested separately. Never associate a foreign-business reference.

Metrics (exact field match, null included):

- Kind: all schema-valid gold cases, including non-transactions.
- Sales total and receipt: gold sale cases only, separately.
- Repayment amount: gold repayment cases only.
- Customer query and candidate-set correctness: cases with an intended or injected
  customer query; report each separately, not a claimed real-person identity score.
- Clarification set and full outcome+field match: all gold draft cases; additionally report
  all-case full match with malformed responses explicitly separated.
- Invalid-output rejection: gold malformed cases only.
- False output acceptance: malformed cases returned as a draft / malformed count.
- False output rejection: gold draft cases returned unavailable / gold draft count.
- Unsafe-ready rate: gold requires clarification, is unknown or rejects output, but actual
  result is a sale draft with valid monetary fields and no required clarification /
  all gold non-ready cases. A ready draft still NEVER writes money.
- Conservative loss: gold field cleared to null or extra clarification, separately from
  unsafe-ready, wrong non-null values and outright rejection.

Report denominators, per-language/per-category totals, per-case original/improved output,
paired outcome groups, improved/regressed IDs, raw invalid error code and provider calls.
No statistical superiority/generalization claim. Do not optimize gold after seeing scores.
Retain repeated-number ambiguity even when its safer abstention reduces exact match.

Independence limit: new, constructed held-out inputs are created after Stage7 was fixed,
not by modifying Stage7 cases. The same Codex author has prior knowledge of Stage7 and
its weaknesses; no blind author, independent annotator or real-world sample exists.
Category choices are task-driven and fault injection is artificial. These limitations
prevent calling the benchmark unbiased independent model-performance evidence.

Integration acceptance separately exercises real local HTTP/JWT/PostgreSQL, user
confirmation, idempotency, reversal, Stage1 factual validation, Research 7/30, risk,
feedback and tenant boundaries. Stub provider fixtures cannot establish live AI quality.
Live inference is disabled until separate authorization; WER is unmeasured without
consented audio and reference transcripts.
