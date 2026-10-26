# Independent label review preparation

Ready to distribute **after consent/recruitment approval**:
[blind-review-only.zip](blind-review-only.zip).
It contains instructions,60 synthetic cards, two blank worksheets and gold JSON
schema. Do not give reviewers the repository or
[coordinator map](coordinator-map.DO-NOT-SEND.json): those reveal source IDs and
lead to old expected labels. No reviewer names, identities or completed ratings exist.

## Actual audit

[dataset-audit.json](dataset-audit.json) hashes the unchanged source files.
262 rows across Stage7=100, Stage8=120, Stage10=42; Stage9 reuses Stage8 and is
not another independent120. Stage1 factual validation is a different task and
was not pooled or modified.

| Set | RU | KZ | Mixed |
|---|---:|---:|---:|
| Stage7 |38|35|27|
| Stage8 |40|40|40|
| Stage10 |14|14|14|

NFKC+casefold+whitespace normalization finds252 unique inputs and4 duplicate groups.
Three groups intentionally reuse a Stage10 semantic input with malformed/duplicate-key/
unknown-field provider outputs; one group is Stage7 provider-error tests.
Different expected outcomes there do not alone prove inconsistent semantic gold.
Mechanical checks found0 negative/noninteger amounts or received>total labels.
They do not validate human meaning.

SequenceMatcher ratio>=0.90 found0 additional near-duplicate pairs after identical
inputs were excluded. This narrow character heuristic misses translations, paraphrases,
shared templates and numerical family similarity. Stage10's33 semantic examples
are11 families in three languages, not33 independent merchant observations.
All authors/evaluators were exposed to implementation and earlier examples.
Prompt examples, developer tuning and constructed provider_raw can favor the pipeline.
Offline scores are validation of programmed conditions, not live-model accuracy.

## Blind package and agreement

Selection: all33 Stage10 semantic cases plus9 distinct Stage8 categories per language;
salted SHA256 source ordering then fixed seed20261026 shuffle;20 cases/language.
No provider replies, expected gold, original IDs or category labels in reviewer ZIP.
New neutral IDs and candidate refs avoid answer leakage. Rebuilding produces identical
ZIP bytes with the locked Python/compression environment; explicit LF and fixed ZIP
metadata avoid platform line-ending drift. A regression reproduced the original CRLF
issue and passed after the tooling-only correction31cba2d.

Reviewer instructions define tiyn, unknown vs zero, ambiguity, explicit correction,
customer scope, clarification, and gold dictionary/schema. Worksheet nulls are
**unreviewed**, not unknown gold. Two independent bilingual annotators first lock
versions; third adjudicator resolves disagreements and records both originals.
Agreement plan: exact per field/null; categorical Cohen kappa with marginals;
set exact/Jaccard; counts per language; no rating=excluded with disclosed reason.
No agreement coefficient is calculated before real annotations.

Consent, named coordinator, access/retention/withdrawal process and review time must
be approved before recruitment. Synthetic texts do not remove annotators' privacy.
This is blind **label review of known texts**, not an unseen held-out model dataset.
After adjudication, keep the set evaluation-only; build a separately consented
unseen corpus for external validity. Never tune then claim independent validation.
