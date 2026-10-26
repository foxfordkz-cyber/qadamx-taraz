# Stage 10 challenge protocol — freeze before execution

Official topic: «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»

Create 33 new authored synthetic intents (11 RU, 11 KK, 11 mixed), plus nine
separate malformed/duplicate/extra-field provider replies. Freeze case JSON and
this protocol before executing either implementation. Preserve errors; never
adjust gold to match outcomes. No real merchant conversations or customer data.

The author is the same Codex implementation agent, exposed to prior code and
errors. No independent human reviewer has supplied labels. Thus this is a fresh
researcher-generated engineering challenge, not blindly independent evaluation.
Use the Stage 9 independent annotation protocol for a future human review.
Do not call renamed examples an unseen population sample.

Separate tasks:

1. Clean text intent: manually annotated expected sale/repayment/unknown, amounts,
   customer query, clarification. End-to-end live model extraction is NOT RUN.
2. Deterministic post-provider extraction: the production pipeline receives the
   clean text plus an authored proposed response; test grounding and schema logic.
   This does not measure whether a real LLM would produce that proposal.
3. Structured response stratum: nine expected rejections reported separately.
4. Customer association: local candidate-set projection, then dedicated SQL parity.
   A name occurrence is not identity proof; duplicate/foreign names need selection.
5. Confirmation: separate real local API/PostgreSQL/browser tests, never inferred
   from extraction metrics. AI must not create operations before user confirmation.

Gold uses integer tiyn, null for unknown, explicit zero only for nonpayment.
Contradictory receipt greater than total requires clarification, never assumed
change or a negative debt. Repayment requires original-sale selection.

Compare baseline Stage 9 with final candidate on identical input/response fixtures.
Record per-language and per-category field/full exact matches, malformed acceptance,
unsafe-ready, conservative errors and raw outputs. A known failure remains in the
denominator. Metric definitions and denominators reuse the Stage 8 projection;
33 semantic cases and nine structured invalid replies must remain distinguishable.

Existing Stage 7/8/9 gold stays fixed. Reassess S8-080/084 separately as known
ambiguous repeated-number cases, not new challenge items. Keep conservative
clarification until source spans justify a definite amount.

New tests should freeze source/dataset hashes and retain initial failures.
No paid AI, recordings, independent human agreement or model accuracy is claimed.
