# Independent annotation protocol — prepared, not performed

Official topic: «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»

No human reviewers, participants, recordings or agreement statistics are claimed.
Stage 7/8/9 known cases are development/regression material. They must not be reused
as an unseen final test merely by renaming customers, changing amounts or translating.

## Roles and blinding

An authorized coordinator recruits at least two competent Kazakh/Russian annotators
who did not implement this parser. Record their real role/consent privately only
after they agree. A third independent adjudicator resolves disagreement. These are
planned roles, not people already recruited.

The coordinator assigns opaque sample IDs, random order, language and semantic-family
IDs, and hides model answers, implementation version, known failures, proposed fixes
and scores from annotators. Annotators work separately, without consulting one
another until both labels are locked. Developers do not select winning labels.

Source independent utterances from independently authored synthetic scenarios first.
If real shop speech is later needed, obtain separate explicit permission and informed
speaker consent before collection/upload. Do not run collection automatically.
Preserve negations, unknown amounts and code-switching; do not rewrite unclear input
into a clean positive transaction.

Sampling should balance RU/KK/mixed and sale/repayment/non-transaction, include
uncertainty, contradicting amounts and customer ambiguity. Pre-register counts and
sampling rules before looking at outputs. Keep all translations, paraphrases and
utterances from the same participant/scenario family in one split to avoid leakage.
Exclude any Stage 7/8/9 exposure from the final blind stratum and record exclusions.

## Annotation instructions

Use the original text or consented recording/reference transcript and only the
provided de-identified candidate context. Do not look up real accounts or balances.

- Choose sale, repayment or unknown. Multiple separate operations need clarification.
- Store money as integer tiyn; 1 tenge = 100 tiyn. Use null for missing/ambiguous
  values. Explicit nonpayment is zero; unspecified payment is not zero.
- Never infer receipt from total, payment from a customer name, or a due date.
- A repayment amount is separate from sale total and still needs selection of the
  original sale; no imagined balance or loan default label.
- Mark the spoken customer query, if unambiguous. Candidate aliases are scoped to
  the supplied synthetic business. Multiple eligible candidates require selection;
  grammar evidence does not prove a real person's identity.
- Record all necessary clarification fields and a short linguistic/contract rationale.
- Record explicitly whether a raw provider reply is being evaluated separately.
  Human semantic gold does not include invented malformed provider responses.

Use [gold JSON Schema](annotation-gold.schema.json). It defines annotation format;
runtime financial validation and independent review still check semantic consistency.
Null values may be correct; a complete-looking output is not automatically correct.

## Disagreements and freezing

Lock both annotations and timestamps before comparison. Compare kind, integer
amounts, null status, candidate sets and clarification sets independently. Register
every disagreement in [review register](annotation-disagreements.csv), preserving
both original labels and reasons. The blinded adjudicator records a decision and
rationale; unresolved cases remain unresolved, not silently removed.

Freeze the final dataset, schema, sampling protocol and source consent register
reference with version, LF-normalized hashes and Git commit BEFORE provider runs.
Corrections after scoring require a new version plus both old/new results; never
replace gold to favor a system. Failed provider outputs stay in attempted denominators.

Only after actual annotation may agreement be calculated: categorical agreement
for kind and clarification, exact amount/null agreement, customer-set agreement.
Any chance-corrected statistic must report sample count, missing labels, class
distribution and method. There are currently zero annotated human samples; no
agreement statistic can be supplied.

## Privacy and registers

[Sample tracking](annotation-samples.csv), [disagreements](annotation-disagreements.csv)
and [provider run register](provider-runs.csv) contain headers only.
They are empty templates, not completed participant records.

Do not commit raw recordings, contact details, names of real debtors, JWTs or consent
documents. Keep consent, access permissions and withdrawal/retention decisions in an
owner-approved private location; use references in the de-identified register.
Agree a retention period and deletion/withdrawal procedure before collecting data.
No data has been collected under this protocol.

Record requested and resolved provider/model/version (if returned), API version,
date, prompt/schema hashes, application/source hashes, sample IDs, modality, locale,
audio settings, latency, errors and actual usage/billing where available.
Do not substitute a configured alias for an observed immutable model snapshot.

Codex drafted this protocol and schema; independent annotation, adjudication and
the diploma student's interpretation remain human work. Stage 10 should implement
validated import of the separately frozen blind set before any final scientific claim.
