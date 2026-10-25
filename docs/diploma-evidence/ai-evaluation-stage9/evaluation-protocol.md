# Stage 9 preregistered engineering regression protocol

Official topic: «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»

Base: 08fd3eef541c6ab47f1d44e79d38778eefd2c784. Branch:
feature/diploma-stage9-extraction-hardening. No paid calls, push, deploy or shared DB.

Before production edits, replay Stage 8's 120 frozen records and Stage 7's 100
records with existing commands. Save raw results and hashes in this directory,
then commit them. Baseline Stage 8 full match must equal 104/120, Stage 7 99/100.
Stage 1/7/8 gold and their original evidence stay unchanged.

Stage 9 is development on known Stage 8 errors. Its frozen-set score is a regression
comparison, NOT a newly independent held-out estimate. Supplementary adversarial
tests exercise general grammar, duplicate keys, nested objects, negations, uncertainty,
customer boundaries and ledger invariants. Keep their counts separate.

Proposed changes: strict JSON decode before any lossy adapter normalization; retain
current private/public schema boundaries and provider error behavior. Correct only
source-supported grammar gaps: positive receipt forms, bounded RU/KK name endings,
explicit zero-payment clauses and explicit full-cash clauses. Keep unknown values,
source ambiguity, explicit seller confirmation, membership and ledger rules.

For all 12 Stage 8 regressions save exact input, gold, before/after values and cause.
Necessary uncertainty (e.g. unknown payment or repayment sale selection) remains.
Never fill a field solely from a provider label, customer database or sale amount.

Paired comparison uses identical provider_raw, input, locale and tenant fixture.
Metrics reuse Stage 8's published denominators: type 108, sale/receipt 84,
repayment 12, customer 63, clarification 108, malformed 12, all 120.
Report unsafe-ready, malformed acceptance, conservative regressions and language IDs.
A ready draft is not a financial record. Do not report raw-validator accuracy as
adapter protection without HTTP-transport regression tests.

Baseline loader must verify exact source from Git and isolate old grounding code;
do not accidentally evaluate both methods using the newly changed grounding module.
Retain initial failures. Run complete backend/frontend and relevant real local
Chrome/API/PostgreSQL acceptance, with no skips hidden as all-green.

Independent human annotation is preparation only: no reviewers, participants, consent
or agreement statistics exist until actually supplied. Live protocol/runner is dry
by default and requires fresh explicit owner approval; previous presentation budgets
do not authorize this experiment. WER and live latency remain unmeasured.
