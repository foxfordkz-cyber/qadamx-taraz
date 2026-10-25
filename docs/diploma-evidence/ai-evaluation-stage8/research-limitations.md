# Research limitations and academic use

This corpus was authored by Codex after Stage 7 was fixed, using knowledge of its
implementation and weaknesses. It is new and frozen before comparison, but it is
**not blind, independently annotated or representative real-world evaluation**.
Forty semantic groups have related RU/KK/mixed variants. Do not calculate confidence
or population-level claims as if all 120 records were independent merchant samples.

Provider responses are authored controls and faults. Conditional kind accuracy
108/108 therefore does not establish the model's ability to infer transaction kind.
The 12 malformed cases deliberately amplify faults. Overall 104/120 blends schema
rejection and field exact match; use the separate denominators and language tables.

Exact match includes null, required clarification and customer candidate sets.
It does not measure complete linguistic understanding, customer identity, saved
financial-record correctness, usability, business benefit, or time saved.
A conservative abstention may be safe yet inconvenient. The 12 new regressions
are real losses against the frozen labels and must be reported.

Only selected SQL projection parity cases are covered. Stage 8 browser testing
uses real local database/API and synthetic JWT identities/provider doubles;
it does not establish live Supabase or provider behavior. The raw duplicate-key
validator result cannot be generalized through the OpenAI adapter.
No new runtime code was tuned to this held-out set.

Research forecasting still uses existing time-separated fitting/validation/test
logic and synthetic histories for integration. No Stage 8 merchant forecast
accuracy is measured. Debt prioritization remains rules-v1, not trained ML or a
probability of default. No real survey participants, feedback findings or ASR
measurements were collected.

Codex authored the Stage 8 synthetic corpus, tooling, tests, analysis and documentation.
Existing teammates' ledger, UI, Research, provider adapters and Auth are preserved;
they are not reassigned to the diploma author's individual contribution.
The student must independently interpret these findings, verify Kazakh/Russian
annotations with reviewers, explain model/validation distinctions in the thesis,
and obtain consent and a separately approved budget before real-data evaluation.
This package is experimental evidence, not a completed thesis or user study.

Stage 9 recommendation:
1. Independently review labels and the actual language failures, preserving v1.
2. Fix raw JSON validation before OpenAI canonicalization on a new branch.
3. Develop grammar improvements on a new development set; use a separately authored
   blind test set for any final quality claim, not Stage 8 as a newly unbiased test.
4. After explicit approval, run the bounded text-provider plan and consented audio;
   report unsuccessful attempts, actual billing, ASR versus extraction and language groups.
5. Extend identity/Unicode candidate parity and real authorization acceptance as needed.
