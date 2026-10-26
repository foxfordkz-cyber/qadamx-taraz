# Paired known-set results

This is deterministic regression evidence on an exposed synthetic development set.
It is not live model performance, independent test accuracy or a population estimate.
Every before output reproduced the pre-edit baseline exactly. Gold and provider
responses are unchanged; both implementations receive identical inputs.

| Metric | Stage 8 baseline | Stage 9 |
|---|---:|---:|
| Transaction classification | 108/108 (100.00%) | 108/108 (100.00%) |
| Sale amount exact match | 82/84 (97.62%) | 82/84 (97.62%) |
| Received payment exact match | 73/84 (86.90%) | 82/84 (97.62%) |
| Repayment amount exact match | 12/12 (100.00%) | 12/12 (100.00%) |
| Customer query association | 58/63 (92.06%) | 63/63 (100.00%) |
| Business-scoped candidate set | 58/63 (92.06%) | 63/63 (100.00%) |
| Clarification fields exact match | 92/108 (85.19%) | 106/108 (98.15%) |
| Full transaction, valid outputs | 92/108 (85.19%) | 106/108 (98.15%) |
| Full result including required rejections | 104/120 (86.67%) | 118/120 (98.33%) |
| Invalid outputs rejected | 12/12 (100.00%) | 12/12 (100.00%) |
| Invalid-output acceptance (lower is better) | 0/12 (0.00%) | 0/12 (0.00%) |
| Valid-output rejection (lower is better) | 0/108 (0.00%) | 0/108 (0.00%) |
| Unsafe-ready cases under existing metric (lower is better) | 0/84 (0.00%) | 0/84 (0.00%) |

Null values and required clarifications are scored as annotated, not dropped.
Full result includes 108 valid outputs plus 12 expected rejections; 118/120 must
not be confused with 106/108 full transaction matches. Customer metrics concern
source queries/candidate aliases, not automatic real-person identification.

| Language | Before | After | Improvements | New regressions |
|---|---:|---:|---:|---:|
| ru | 35/40 (87.50%) | 40/40 (100.00%) | 5 | 0 |
| kk | 34/40 (85.00%) | 39/40 (97.50%) | 5 | 0 |
| mixed | 35/40 (87.50%) | 39/40 (97.50%) | 4 | 0 |

Fourteen case-level improvements, zero new regressions. All twelve Stage 8
regressions are repaired; S8-050 and S8-056 additionally improve through the same
receipt rules. Counts are not added to supplementary test results.

## Remaining failures

S8-080 (KK) and S8-084 (mixed): the total evidence “мың” occurs both independently
and within “екі мың”. Existing repeated-amount grounding refuses to select which
occurrence represents total; total becomes null while received remains 200000.
Gold instead expects total 100000 and received null for the contradiction.
Both outputs require clarification and cannot form a valid financial write
without a seller-supplied total/customer. They remain wrong against gold.
No exception for those IDs or weakened numeric-occurrence rule was added.

## Earlier corpora and supplementary coverage

Stage 7 remains 99/100 before and after Stage 9; S7-090 remains a known failure.
Stage 1 remains TP18/TN24/FP0/FN0 on its frozen 42 constructed cases.
These are separate tasks/corpora; their denominators are not pooled with 120.

The 51 new supplementary extraction cases initially produced 21 failures and
30 passes before production edits; all pass after correction. There are also
19 evaluator/decoder/gate tests and six PostgreSQL tests. The complete backend
suite includes these cases; they are not independent model observations.

Raw paired records: [JSONL](results-final/cases.jsonl), [CSV](results-final/cases.csv),
[summary and exact source hashes](results-final/summary.json).
The first working-tree run is retained in results-first; results-final replays the
committed implementation and must match case outputs and source hashes.
See integration-test-report.md for complete test results and initial failures.
