# Blind semantic annotation — NOT completed research

Distribute ONLY this ZIP, independently to two consenting bilingual reviewers.
Do not give source repository, coordinator map, old expected labels or outputs.
The 60 texts are synthetic and already developer-exposed. This is blinded label
review, not an unseen model test. No participants or ratings have been collected.

Read cases.jsonl and fill ONLY your A or B worksheet. Do not discuss answers.
Annotate what the source supports, not what a merchant probably intended.
Use integer tiyn (100 tiyn = 1 KZT); null means unknowable, never default zero.
kind: sale / repayment / unknown. Unknown or multiple independent operations
must not be fabricated as one sale. A later explicit correction may revise one.
No payment stated => received_minor null and clarification. Explicit full debt
=> zero; full payment => total. Repayment amount belongs to the stated old sale,
not a new sale. Do not invent due dates. Contradictory amounts require clarification.
customer_query is the spoken name, not a UUID. customer_refs uses only C1/C2...
with allowed_business=true; ambiguous names must not arbitrarily choose one.
clarification_fields is a unique list from kind, total_minor, received_minor,
amount_minor, customer_id, sale_id, description. Repayment always asks for sale_id.
Add uncertainty_notes for dialect, unsupported currency, incomplete purpose or
inconsistent context. Do not resolve ambiguity by consulting old model outputs.
Mark annotation_status=reviewed only when all fields were considered. Unreviewed
nulls are missing ratings, not gold unknowns. Use a pseudonymous annotator_code;
never put names, email, phone, tokens or real shop records in this worksheet.

Data dictionary: sample_id identifies one source text; language ru/kk/mixed is
the sampling label (flag disagreements); customers are synthetic candidate context;
money fields are nonnegative integers or null; customer_refs/clarification_fields
are sets represented by arrays; notes are reasoning, not financial instructions.

After both independent versions are locked, coordinator compares per-field exact
agreement (including null); reports counts/denominators and language breakdowns.
Cohen kappa applies to kind only, with marginals and NA if denominator is zero.
For amounts report exact agreement and signed disagreement values, not accuracy
against unreviewed gold. For sets report exact match and Jaccard (both empty=1).
Third consenting bilingual adjudicator sees both rationales only after locking;
records both original values, final decision, reason, date and pseudonymous code.
Unresolved items stay disputed and are excluded from accuracy ONLY with explicit
count/reason; do not erase them. Do not tune on adjudicated evaluation data.

Final gold format: one JSON object per case, schema_version=stage11-human-gold-v1,
sample_id, language, kind, customer_query, customer_refs, total_minor,
received_minor, amount_minor, clarification_fields, adjudication_status
(agreed/adjudicated/disputed), rationale, reviewer_codes, adjudicator_code,
annotation_date. Use gold.schema.json; semantic consistency still needs review.

Coordinator must obtain consent, compensation terms, restricted storage, named
retention/withdrawal owner and deletion date BEFORE recruiting. No real merchant
audio/text should be added to this packet. Do not upload private filled worksheets
or identifying consent receipts to Git. Agreement is NOT calculated in this packet.
