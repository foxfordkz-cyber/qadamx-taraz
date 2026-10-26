# Implemented changes and contribution record

## Baseline and ownership

Stage 7 is isolated in `feature/multilingual-ai-extraction` from the verified
`integration/diploma-research-ai-validation` source. It does not merge other PRs.
The Stage 6 working copy had an unrelated edit in
`docs/diploma-evidence/integration/demo-scenarios.md`; it was left untouched.

The following work was implemented with AI assistance in this Stage 7 task. It does not
claim authorship of the existing ledger, provider adapters, Stage 1 factual assistant,
Research forecasting, debt-risk assessment, feedback, Auth or RU/KZ frontend.

| Area | Changed or added files | Contribution |
|---|---|---|
| Production boundary | `apps/api/app/services/ai.py` | Duplicate JSON-key rejection; invoke source grounding after existing validation |
| Production normalization | `apps/api/app/services/extraction_grounding.py` | Bounded RU/KK/mixed numeric and name grounding, safe uncertainty/context handling |
| Frozen corpus | `apps/api/tests/fixtures/extraction_stage7*.json` | 100 synthetic labeled inputs, exact injected provider outputs and freeze manifest |
| Original implementation | `apps/api/tests/evaluation_baselines/extraction_stage6.py` | Unmodified original snapshot for reproducible comparison |
| Evaluator | `apps/api/tools/extraction_eval/evaluate.py` | Hash checks, same-input replay, raw results, metrics and regression list |
| Backend regressions | `apps/api/tests/test_ai.py`, `test_extraction_grounding.py`, `test_extraction_postgres.py` | Correct conflicting-label expectations, unseen syntax boundaries, real SQL confirmation/isolation tests |
| Browser fixture | `apps/api/tests/extraction_browser_server.py` | Isolated database, frozen provider test double, production routes and local signed JWTs |
| Browser tests | `apps/web/e2e/extraction.acceptance.ts`, `extraction.playwright.config.ts` | Actual Chrome UI → API → SQL, unknown payment and manual fallback evidence |
| Documentation | This directory, `docs/DECISIONS.md`, `docs/handoffs/backend.md` | Actual evidence, limitations, commands and handoff |

No provider prompt, model selection, API schema, OpenAPI, generated TypeScript, migration,
financial ledger code, Auth, Research or production frontend source was changed.
Existing retry behavior is retained; no new paid provider retries are introduced.
New tests exercise a one-attempt offline provider.

## Why this change

The frozen baseline demonstrates wrong amount scale, receipt replacement by paid/debt
labels, unsupported payment defaults, unsupported customer queries and duplicate-key
acceptance. Source grounding addresses these mechanisms without introducing a second
transaction service or automatic money writes.

The numerical grammar operates on general units/scales and source boundaries. Production
contains no fixture IDs, test sentences, merchant names or lookup of expected answers.
Only the explicitly isolated browser test double maps frozen inputs to synthetic provider
responses.

## Commit record

- Dataset freeze: `0313038e33b3f518b777682b7006c82f448ac483`.
- Original application: `ae43dc25543ab261511c8b5f5982c7dfe8112da8`.
- Tested implementation: `b84b4c70b58c21465705f1dc8c3ca31657054fce`.
- Evaluated implementation commit and file hashes: [comparison manifest](comparison/summary.json).
- Final evidence follows the tested implementation in a separate documentation commit;
  use `git log --oneline eb954bf..HEAD` for the complete Stage 7 sequence.

Completed functionality is source grounding in the existing application and its verified
offline/local SQL paths. Live-provider evaluation, physical ASR, production acceptance,
independent holdout and automatic release are **not completed**.

Publication: local commits only. The preceding Stage 6 instruction forbids publishing
the temporary integration without authorization; pushing this descendant would also
publish that history. No remote branch/PR was created or changed in Stage 7.
Final fetch confirmed main `2518b2e80b8c8ef881063a968645382d61aeb37e`; PR #100 is
still open/Draft, head `feature/ml-sales-debt-research:1ece13a1a255e301526af93bb7ac38faeba0b047`,
base main. The new branch has no upstream, so pull --ff-only does not apply.
