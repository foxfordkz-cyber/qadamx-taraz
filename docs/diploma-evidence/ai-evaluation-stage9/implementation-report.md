# Stage 9 implementation report

Official diploma topic: «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»

Source baseline: `08fd3eef541c6ab47f1d44e79d38778eefd2c784`.
Separate worktree/branch: `feature/diploma-stage9-extraction-hardening`.
The pre-edit baseline and protocol were committed as
`fe4e73f5723c46d6b308c6b1115327d881611db9`.
The final replay's exact implementation commit and four runtime hashes are in
[results-final/summary.json](results-final/summary.json).

## Production scope: four files

- `apps/api/app/services/strict_json.py`: shared raw-object decoder, recursive
  duplicate detection, strict finite JSON and safe errors.
- `apps/api/app/services/openai_provider.py`: use it at both HTTP and inner
  structured-output boundaries, before lossy normalization.
- `apps/api/app/services/ai.py`: use it for Gemini envelopes and common
  extraction; retain existing schema, source validation and error contract.
- `apps/api/app/services/extraction_grounding.py`: bounded RU/KK name forms,
  receipt grammar, affirmative zero-payment handling and explicit full-cash
  clauses. Guard adjacent questions, alternatives, negations and future intent.

No ledger, Auth, database migration, research algorithm, frontend production
source, dependency or external API contract was changed. Customer morphology
only establishes that the supplied query occurs in the source. Existing
business-scoped database lookup returns candidates; ambiguity still requires a
seller choice. Repayments still require selection of the original sale.
Unknown payments stay null. The implementation never writes financial operations.

The grammar additions apply to words and boundaries, not case IDs, frozen customer
names or evaluation amounts. Supplementary tests use different names and amounts.
This remains bounded rule-based validation of a provider's proposal, not a trained
linguistic model or proof of arbitrary natural-language correctness.

## Evaluation and test tooling

The Stage 9 evaluator loads exact historical Git modules and explicitly binds the
historical grounding function, so both sides do not accidentally use the new code.
All 120 historical outputs must equal the saved baseline before comparison.
It verifies LF hashes of original Stage 1/7 datasets and all Stage 8 evidence.
Results use identical authored provider responses, input, locale and tenant
fixtures; no paid calls.

The Stage 8 source-hash guard still rejects use of a changed runtime as its old
implementation. A narrow optional comparator pair was added to its live utility
for the Stage 9 wrapper; old default behavior is preserved. Tests formerly tied
to the old runtime now assert the preserved guard and corrected duplicate behavior.
Original Stage 8 datasets, gold, reports and recorded results were not modified.

Supplementary unit, raw transport and SQL tests are distinct from frozen-set
metrics. The isolated browser fixture extends the existing combined scenario
suite with receipt/name recovery and malformed OpenAI fallback. It uses genuine
local API/JWT verification/PostgreSQL and synthetic issuer/provider data.

## Contribution and publication boundary

New engineering contributions in this stage are the strict decoder and integration,
bounded grammar corrections, regressions, exact-baseline comparison tool, optional
dry live wrapper, browser fixture and research preparation documents. Prior
authors' ledger, research, UI and datasets are preserved; their work is not
claimed as new Stage 9 implementation. See [contribution register](contributions.md)
for changed files and local commits.

No push, PR #100 modification, merge, deployment, shared database migration,
human study, recording collection or paid provider request was performed.
Independent diploma Word documents were not modified.
