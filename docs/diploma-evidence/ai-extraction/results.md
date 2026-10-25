# Frozen before/after comparison

Conditions: identical frozen corpus, 100 authored provider replies, one offline call per
case per method, Python 3.12.14. No model temperature, live provider or audio input.
The original implementation is loaded from its byte-verified Stage 6 snapshot.

| Metric | Original | Improved | Denominator |
|---|---:|---:|---|
| Transaction classification | 95 (100%) | 95 (100%) | 95 draft-gold cases |
| Amount exact match | 85 (89.47%) | 94 (98.95%) | 95 draft-gold cases |
| Received payment exact match | 79 (83.16%) | 94 (98.95%) | 95 draft-gold cases |
| Customer name-query correctness | 89 (93.68%) | 95 (100%) | 95 draft-gold cases |
| Clarification-field exact match | 82 (86.32%) | 94 (98.95%) | 95 draft-gold cases |
| Full transaction/outcome exact match | 71 (71%) | 99 (99%) | all 100 cases |
| Invalid provider responses safely rejected | 4 | 5 | 5 malformed/schema-invalid cases |

29 previously failing cases now match all expected fields. One previously passing case,
`S7-090`, now requests additional clarification. No annotation was changed to hide this
regression. There are five safe provider fallbacks, up from four, because duplicate JSON
keys are rejected.

| Language | Original full match | Improved full match |
|---|---:|---:|
| RU | 29/38 | 38/38 |
| KK | 27/35 | 34/35 |
| Mixed | 15/27 | 27/27 |

Raw evidence:

- [Initial run before production changes](baseline-run/summary.json), [all initial rows](baseline-run/cases.json).
- [Final side-by-side summary](comparison/summary.json), [all 100 final rows](comparison/cases.json).
- The source corpus retains the exact raw provider reply for every case.

The initial run gives 71/100 for both methods because production extraction had not yet
been changed. The final run reloads the same original snapshot alongside the improved code.
File hashes identify the implementations even when evidence is recorded in a later commit.

**Interpretation:** these are engineering pass rates on deliberately constructed provider
faults. They are not “99% AI accuracy”, live model benchmarks, customer-identity precision,
or evidence of generalization to merchants. Intent selection is unchanged. Null values are
included in exact match; a safer abstention can still lower the score. No significance test,
participant count or fabricated scientific conclusion is reported.
