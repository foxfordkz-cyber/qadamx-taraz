# Stage 7: multilingual extraction evidence

This stage improves the existing **post-provider extraction validator** used by sales and repayment drafts. It does not train a model or measure live LLM/ASR quality.

- [Frozen dataset and provenance](dataset.md)
- [Evaluation methodology](methodology.md)
- [Before/after results and raw rows](results.md)
- [Failure analysis and limitations](error-analysis.md)
- [Implementation and contribution record](implementation-report.md)
- [Reproduction commands](reproduction.md)
- [Extraction flow](extraction-flow.md)
- [Actual test execution](test-report.md)

Baseline application: `ae43dc25543ab261511c8b5f5982c7dfe8112da8`.
Branch: `feature/multilingual-ai-extraction`, based on verified Stage 6 integration
`eb954bf7c2c6b1d18bf360e436ccf12bdbde30dd` (later tests/docs, same application).
Freeze commit: `0313038e33b3f518b777682b7006c82f448ac483`.

All corpus texts, provider replies, SQL fixture customers and screenshot data are synthetic.
No real merchant conversation, paid provider call, shared database migration or deployment
is part of this evidence. Source hashes and the evaluated implementation commit are recorded
in `comparison/summary.json`.
