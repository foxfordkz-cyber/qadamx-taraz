# Stage 9 — extraction hardening and research preparation

Official diploma topic: «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»

Date: 2026-10-25. Local branch: `feature/diploma-stage9-extraction-hardening`.
Verified base: `08fd3eef541c6ab47f1d44e79d38778eefd2c784`.
Baseline/protocol freeze: `fe4e73f5723c46d6b308c6b1115327d881611db9`.
Implementation/test commit: `fa73fe4999c0201626643be7eaf9d2667dc328ef`.
Evidence commit is the subsequent local documentation commit; retrieve it with
`git log -1 --format=%H -- docs/diploma-evidence/ai-evaluation-stage9/README.md`.

## Observed outcome

Strict raw JSON now rejects duplicate keys before OpenAI loses them through
normalization. Bounded receipt/name corrections fix all twelve earlier regressions.
Known synthetic Stage 8 corpus: **104/120 → 118/120**, fourteen improvements,
zero new regressions; two remaining cases are reported, not relabeled.
This is known-set engineering evidence, **not live LLM/ASR accuracy**.

Final backend: **723 passed** with dedicated PostgreSQL; frontend: **639 passed**;
local Chrome/API/PostgreSQL: **8 passed**, retries 0. Earlier failures and their
resolution are retained. Stage 1 and Stage 7 regressions remain unchanged.
No provider calls, human participants, shared database writes, merge, push,
PR #100 change or deployment.

## Evidence index

| Artifact | Purpose |
|---|---|
| [Implementation report](implementation-report.md) | Exact runtime/tool scope and compatibility |
| [Duplicate JSON analysis](duplicate-json-analysis.md) | Two loss points, strict boundaries, safe object-only policy |
| [Twelve-regression analysis](regression-analysis.md) | Every input, gold, before/after and safety judgement |
| [Comparison results](comparison-results.md) | Metric denominators, language counts and remaining failures |
| [Frozen protocol](evaluation-protocol.md) | Committed before runtime changes |
| [Baseline freeze](baseline-freeze.json) | LF hashes, original evidence protection |
| [Final raw results](results-final/summary.json) | Exact committed source, per-case CSV/JSONL alongside |
| [Integration report](integration-test-report.md) | Actual commands, failures, SQL/browser coverage |
| [Reproduction](reproduction.md) | Safe local commands and isolated databases |
| [Annotation protocol](independent-annotation-protocol.md) | Blind reviewers, privacy, disagreements, freeze procedure |
| [Gold schema](annotation-gold.schema.json) | New annotation format; no API contract change |
| [Live readiness](live-ai-readiness.md) | Disabled plan, consent/budget/approval gates, no paid run |
| [Dry plan](live-dry-plan.json) | Known probes, exact source/prompt/schema, zero authorized budget |
| [Contribution register](contributions.md) | Own changes and preserved modules |
| [Logs](logs/) | Initial failures and final checks |
| [Extraction flow](extraction-flow.mmd) | Editable Mermaid |
| [Annotation flow](annotation-flow.mmd) | Editable research procedure, not completed human work |

The sample/disagreement/provider CSV registers contain headers only.
There are zero independent human annotations. First working-tree results and exact
commit replay are both retained; [verification](evidence-verification.json) confirms
identical case outputs and source hashes.

## Browser evidence

All images are automated local Chrome screenshots of synthetic test data.
They do not establish physical microphone, live provider, production Supabase or
real merchant acceptance. The screenshots display an explicit OFFLINE fixture name.

- [New receipt + customer ambiguity](screenshots/stage9-receipt-customer-choice.png):
  2715 ₸ total, 915 ₸ received; customer selection remains required.
- [Malformed OpenAI fallback](screenshots/stage9-openai-duplicate-fallback.png):
  input retained, manual entry available, no financial write.
- [Unknown payment, KZ mobile](screenshots/unknown-payment-kk-390.png).
- [Research RU desktop](screenshots/research-sql-ru-1440.png) /
  [KZ mobile](screenshots/research-sql-kk-360.png).
- [Persisted feedback](screenshots/feedback-sql-ru-1280.png).
- [Workflow SQL snapshot](workflow-sql.json) and
  [explicit confirmation delta](screenshots/sql-confirmation.json).

## Stage 10 recommendation

Obtain independent bilingual reviewers and freeze genuinely unseen examples under
the prepared protocol. Add validated import of that blind set. Only with fresh
explicit authorization and consent, run a small bounded live provider/ASR pilot;
record model identity, failures, latency, WER and actual billing separately.
Investigate repeated-number span disambiguation without tuning to the two remaining
known IDs. Do not claim production readiness from these local tests.
