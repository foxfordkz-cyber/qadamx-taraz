# Evaluation protocol frozen before implementation

Baseline: `ae43dc25543ab261511c8b5f5982c7dfe8112da8:apps/api/app/services/ai.py`, exact frozen snapshot in `apps/api/tests/evaluation_baselines/extraction_stage6.py`. Verify LF-normalized hashes against the freeze manifest and Git source. Improved implementation is the current `app.services.ai.extract`.

Conditions: identical 100 text/locale/provider-output inputs, one explicit offline provider call per case, no network, no money writes, no paid retry. Provider temperature/model are not applicable. Transport timeout/error regressions are separate tests. Production retry/configuration behavior is preserved.

Metrics:

- Transaction classification: exact kind on cases whose gold outcome is a draft; abstention/error counts as incorrect there.
- Amount exact match: tuple (sale total, repayment amount), including required nulls.
- Payment exact match: received amount including required null/zero distinctions.
- Customer association correctness: exact canonical customer **query** including null ambiguity; not a claim of real-world identity resolution. Actual tenant/candidate selection is covered separately with PostgreSQL.
- Clarification correctness: exact set of extraction-level missing fields; unknown kind asks kind, repayment always asks sale_id. Nullable customer for a credit/unknown-payment sale requires selection. A flagged uncertain customer also requires selection.
- Full transaction exact match: outcome + kind + customer + all three money fields + clarification set. Invalid provider outputs count as correct only if rejected with safe AI_UNAVAILABLE fallback.

All exact fields are scored on draft-gold cases; full-outcome metric also includes invalid-provider rows. Report explicit denominators and raw before/after rows. Report regressions as well as improvements, and results by language/category. This is an engineering pass rate under constructed response faults, **not live model accuracy**, a user study, or a statistical generalization to merchants.

No scientific superiority claim from this development corpus. Real-provider evaluation, unseen independently annotated utterances, ASR errors and physical devices remain future acceptance.
