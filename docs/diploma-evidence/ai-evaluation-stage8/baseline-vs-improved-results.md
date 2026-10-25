# Baseline versus improved — frozen constructed holdout

Application baseline ae43dc25543ab261511c8b5f5982c7dfe8112da8; unchanged improved
b84b4c70b58c21465705f1dc8c3ca31657054fce. Dataset freeze
071ae3ef7b0a1db0091c31ff6b762d16226f91b8, version qadam-stage8-constructed-holdout-v1.
Evaluator source 92aba501844d777fd7a2175b8a7e72a82ffb09bf, Python 3.12.14,
one identical authored provider reply per method/case, ru/kk/auto, no network.
Source hashes and full configuration are in [replay summary](results-replay/summary.json).

This measures deterministic post-provider handling of synthetic responses, not live
LLM or ASR quality. Kind 108/108 is conditional on authored intent fields.
Customer correctness is a scoped candidate-set score, not a real-person identity score.
Gold draft cases include 12 unknown/non-transaction statements; they are kept apart
from the 12 deliberately malformed responses. A draft never writes money itself.

## All languages, 120 cases

| Metric | Pre-Stage 7 | Stage 7 |
|---|---:|---:|
| Transaction type | 108/108 (100.00%) | 108/108 (100.00%) |
| Sales total | 72/84 (85.71%) | 82/84 (97.62%) |
| Received amount | 72/84 (85.71%) | 73/84 (86.90%) |
| Repayment amount | 12/12 (100.00%) | 12/12 (100.00%) |
| Customer query | 33/63 (52.38%) | 58/63 (92.06%) |
| Candidate set | 33/63 (52.38%) | 58/63 (92.06%) |
| Clarification set | 78/108 (72.22%) | 92/108 (85.19%) |
| Full gold-draft outcome/fields | 66/108 (61.11%) | 92/108 (85.19%) |
| Full outcome/fields, all cases | 75/120 (62.50%) | 104/120 (86.67%) |
| Malformed rejected | 9/12 (75.00%) | 12/12 (100.00%) |
| False output acceptance (lower is better) | 3/12 (25.00%) | 0/12 (0.00%) |
| False output rejection (lower is better) | 0/108 (0.00%) | 0/108 (0.00%) |
| Unsafe-ready (lower is better) | 24/84 (28.57%) | 0/84 (0.00%) |

The full-match change is +29/120 (24.17 percentage points), comprising 41
improvements and 12 regressions. Gold-draft-only full match is 66/108 → 92/108.
The direct validator rejects 12/12 malformed replies, but the OpenAI adapter can erase
duplicate keys upstream. Do not present this as end-to-end provider rejection accuracy.

## Language groups

Each group has 40 cases: 36 gold drafts, 28 sales, four repayments, four unknown
statements, four malformed replies and 21 customer-context cases.
Forty underlying semantic groups have related translations/variants; no independence
or significance claim is made.

### Russian

| Metric | Pre-Stage 7 | Stage 7 |
|---|---:|---:|
| Transaction type | 36/36 (100.00%) | 36/36 (100.00%) |
| Sales total | 24/28 (85.71%) | 28/28 (100.00%) |
| Received amount | 24/28 (85.71%) | 24/28 (85.71%) |
| Repayment amount | 4/4 (100.00%) | 4/4 (100.00%) |
| Customer query | 11/21 (52.38%) | 20/21 (95.24%) |
| Candidate set | 11/21 (52.38%) | 20/21 (95.24%) |
| Clarification set | 26/36 (72.22%) | 31/36 (86.11%) |
| Full gold-draft outcome/fields | 22/36 (61.11%) | 31/36 (86.11%) |
| Full outcome/fields, all cases | 25/40 (62.50%) | 35/40 (87.50%) |
| Malformed rejected | 3/4 (75.00%) | 4/4 (100.00%) |
| False output acceptance (lower is better) | 1/4 (25.00%) | 0/4 (0.00%) |
| False output rejection (lower is better) | 0/36 (0.00%) | 0/36 (0.00%) |
| Unsafe-ready (lower is better) | 8/28 (28.57%) | 0/28 (0.00%) |

### Kazakh

| Metric | Pre-Stage 7 | Stage 7 |
|---|---:|---:|
| Transaction type | 36/36 (100.00%) | 36/36 (100.00%) |
| Sales total | 24/28 (85.71%) | 27/28 (96.43%) |
| Received amount | 24/28 (85.71%) | 24/28 (85.71%) |
| Repayment amount | 4/4 (100.00%) | 4/4 (100.00%) |
| Customer query | 11/21 (52.38%) | 19/21 (90.48%) |
| Candidate set | 11/21 (52.38%) | 19/21 (90.48%) |
| Clarification set | 26/36 (72.22%) | 30/36 (83.33%) |
| Full gold-draft outcome/fields | 22/36 (61.11%) | 30/36 (83.33%) |
| Full outcome/fields, all cases | 25/40 (62.50%) | 34/40 (85.00%) |
| Malformed rejected | 3/4 (75.00%) | 4/4 (100.00%) |
| False output acceptance (lower is better) | 1/4 (25.00%) | 0/4 (0.00%) |
| False output rejection (lower is better) | 0/36 (0.00%) | 0/36 (0.00%) |
| Unsafe-ready (lower is better) | 8/28 (28.57%) | 0/28 (0.00%) |

### Mixed Kazakh/Russian

| Metric | Pre-Stage 7 | Stage 7 |
|---|---:|---:|
| Transaction type | 36/36 (100.00%) | 36/36 (100.00%) |
| Sales total | 24/28 (85.71%) | 27/28 (96.43%) |
| Received amount | 24/28 (85.71%) | 25/28 (89.29%) |
| Repayment amount | 4/4 (100.00%) | 4/4 (100.00%) |
| Customer query | 11/21 (52.38%) | 19/21 (90.48%) |
| Candidate set | 11/21 (52.38%) | 19/21 (90.48%) |
| Clarification set | 26/36 (72.22%) | 31/36 (86.11%) |
| Full gold-draft outcome/fields | 22/36 (61.11%) | 31/36 (86.11%) |
| Full outcome/fields, all cases | 25/40 (62.50%) | 35/40 (87.50%) |
| Malformed rejected | 3/4 (75.00%) | 4/4 (100.00%) |
| False output acceptance (lower is better) | 1/4 (25.00%) | 0/4 (0.00%) |
| False output rejection (lower is better) | 0/36 (0.00%) | 0/36 (0.00%) |
| Unsafe-ready (lower is better) | 8/28 (28.57%) | 0/28 (0.00%) |

## Retained evidence

[First summary](results/summary.json), [exact-commit replay](results-replay/summary.json),
[all per-case JSONL](results-replay/cases.jsonl), [CSV](results-replay/cases.csv).
Per-category metrics and paired ID lists are in both summaries.
[Replay verification](replay-verification.json) confirms every case and metric is
identical; only execution_commit metadata differs. No gold labels were changed.
See [error analysis](error-analysis.md) for all 16 remaining mismatches and 12 losses.

No provider request, audio transcription, merchant benefit or production outcome was
measured. The finite 0/84 unsafe-ready result is not a general safety guarantee.
