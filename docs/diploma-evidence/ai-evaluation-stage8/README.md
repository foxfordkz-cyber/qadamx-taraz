# Stage 8 — integrated extraction and constructed held-out evaluation

Official diploma topic:

**«Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»**

Execution date: 2026-10-25. Branch: `feature/diploma-stage8-ai-evaluation`.
No push, PR #100 update, deployment, paid AI request or shared database modification.

## What is delivered

Stage 7 is integrated unchanged into a separate Stage 6 worktree. A frozen 120-case
synthetic benchmark compares the same authored provider outputs before and after
Stage 7. Local Chrome → FastAPI → PostgreSQL scenarios exercise the application,
not a static mockup. An opt-in live evaluation tool exports exact prompts and a
bounded plan; only its dry run and fake-provider tests were executed.

Full outcome/field match: **75/120 → 104/120**. This is server-side handling of
constructed provider responses, **not live model or speech accuracy**. There are
**12 newly over-conservative regressions** and 16 remaining mismatches. The OpenAI
adapter can canonicalize duplicate JSON keys before the common validator sees them;
its characterization test passes by documenting the limitation, not by fixing it.
See the [results](baseline-vs-improved-results.md) and [error analysis](error-analysis.md).

Final suites: **647 backend**, **639 frontend**, **6 Chrome E2E** passed. Initial
environment/invocation failures are retained. No claim that the historical Stage 6
86-browser-test suite was rerun. See [test report](integration-test-report.md).

## Evidence index

- [Frozen protocol](evaluation-protocol.md), [methodology](dataset-methodology.md),
  [dictionary](dataset-dictionary.md), [freeze manifest](freeze.json).
- [Dataset JSONL](dataset.jsonl), [dataset CSV](dataset.csv): 40 RU / 40 KK / 40 mixed;
  related variants in 40 semantic groups, not 120 independent observations.
- [Initial per-case results](results/cases.jsonl), [initial summary](results/summary.json).
- [Exact-commit replay JSONL](results-replay/cases.jsonl),
  [CSV](results-replay/cases.csv), [summary](results-replay/summary.json),
  [replay comparison](replay-verification.json).
- [Aggregate/per-language results](baseline-vs-improved-results.md),
  [errors and label review](error-analysis.md).
- [Integration and tests](integration-test-report.md), [test records](test-execution.json),
  [preserved logs](logs/), [SQL workflow snapshot](workflow-sql.json).
- [Live/ASR readiness](live-ai-readiness.md),
  [disabled template](live-manifest.template.json), [exact dry plan](live-dry-plan.json).
- [Limits and independent student work](research-limitations.md).
- [Reproduction commands](reproduction.md), [diagrams](flowcharts.md),
  [file/commit ownership](contributions.md).

## Provenance

| Artifact | Commit |
|---|---|
| Stage 6 application | `ae43dc25543ab261511c8b5f5982c7dfe8112da8` |
| Stage 6 source branch | `eb954bf7c2c6b1d18bf360e436ccf12bdbde30dd` |
| Stage 7 implementation | `b84b4c70b58c21465705f1dc8c3ca31657054fce` |
| Stage 7 final integrated history | `11ee40a77a2ff8de3c64818af9d9438b9e23fdf1` |
| Stage 8 pre-evaluation freeze | `071ae3ef7b0a1db0091c31ff6b762d16226f91b8` |
| Stage 8 evaluator / integration tests | `92aba501844d777fd7a2175b8a7e72a82ffb09bf` |

The initial run identifies freeze HEAD and an uncommitted evaluator. The exact-commit
replay identifies the committed evaluator; outputs and metrics are identical.
Source files and frozen artifacts are checked before comparison. New Stage 8 code
is tooling/tests only; runtime application code equals Stage 7 final.
The final evidence commit can be retrieved with
`git log -1 --format=%H -- docs/diploma-evidence/ai-evaluation-stage8/README.md`.

## Actual screenshots

All captures show local synthetic data with frozen AI responses, not real merchants,
physical devices or production. Widths are browser viewport sizes.

- [KZ partial sale and grounded amounts, 1280](screenshots/grounded-kazakh-1280.png).
- [Unknown payment remains empty, KZ 390](screenshots/unknown-payment-kk-390.png).
- [Malformed provider → manual fallback, 1280](screenshots/invalid-provider-fallback-1280.png).
- [Research RU desktop 1440](screenshots/research-sql-ru-1440.png),
  [RU 360](screenshots/research-sql-ru-360.png),
  [KZ desktop 1440](screenshots/research-sql-kk-1440.png),
  [KZ 360](screenshots/research-sql-kk-360.png).
- [Assistant using SQL facts](screenshots/assistant-sql-ru-1280.png).
- [Feedback saved in SQL](screenshots/feedback-sql-ru-1280.png).

Full-page mobile captures include fixed/sticky navigation at its capture position;
they are evidence of rendered states, not a physical-device usability study.
