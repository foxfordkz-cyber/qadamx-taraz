# Error analysis, regressions and unresolved review

Scope: frozen Stage 8 corpus, pre-Stage7 ae43dc2 versus unchanged b84b4c7,
120 synthetic authored responses. Canonical case data and every wrong field are
retained in [raw results](results-replay/cases.jsonl).

## Paired outcomes

- Both versions produce a draft in 108 cases. Draft acceptance is not financial saving.
- Both fully correct in 63 cases, including 9 correct malformed-output rejections.
- 41 full-match improvements; 12 full-match regressions; 4 cases wrong in both.
- 44 cases are classified more conservative, overlapping improvements/regressions.
- False output rejection (unavailable instead of gold draft): 0/108 in both.
  This must not hide excessive clarification on otherwise valid statements.
- Improved full mismatches: 16; no cases were removed or relabeled.

## Twelve newly conservative regressions

| Case IDs | Observed issue | Result |
|---|---|---|
| S8-003, S8-011 | Receipt expressed using «получено» | Known receipt cleared; asks for receipt/customer |
| S8-006, S8-030, S8-034, S8-036 | Kazakh name forms «Ләззаттың», «Мақсаттың» | Canonical name rejected; asks for customer |
| S8-013 | «ничего не заплатила; всё в долг» crosses negation/context boundary | Explicit zero receipt cleared |
| S8-016 | Russian inflection «для Инги» versus canonical «Инга» | Customer cleared |
| S8-018 | «Картадан 7350 түсті» | Supported number but unsupported receipt expression; cleared |
| S8-086, S8-090, S8-094 | Informal «Денежку всю занесли», «Ақшасын түгелдей ұстатты», mixed phrase | Full receipt cleared |

These are usability losses. They are not newly rejected API requests or automatically
written wrong balances. Stage 8 preserves the bounded guard; it does not add phrases
from its held-out corpus into production.

## Four remaining mismatches (wrong in both versions)

S8-050 (85 тиын) and S8-056 (2.75 теңге): improved total normalization is correct,
but receipt evidence «оплачены» / «түсті» is cleared. Full match remains false.

S8-080 and S8-084: one «мың» total and a later «екі мың» receipt create a conflict.
Gold preserves total 100000 and asks to clarify receipt. Actual Stage 7 clears total,
retains received 200000, and asks for total/customer. This is **not a correct draft**;
it is incomplete and requires explicit correction. The gold and both outputs remain
unchanged. The sale ledger still enforces receipt ≤ total at confirmation.
Stage 7 development regression S7-090 is independently replayed and remains the
single 99/100 mismatch. Neither repeated-number case is suppressed to improve a score.

## Malformed JSON: validator versus provider adapter

At the common extraction-validator boundary all 12 injected malformed replies are
rejected, including duplicate keys. However, existing
`apps/api/app/services/openai_provider.py` parses the structured response with
`json.loads` and serializes it again while restoring transcript. Duplicate keys
can be erased before Stage 7 sees them.

`test_duplicate_key_core_rejects_but_openai_adapter_currently_canonicalizes`
uses MockTransport and reproduces this limitation with no external request.
The passing characterization test documents current behavior; it does not prove a
safe duplicate-key boundary through every provider.

Consequently the 12/12 rejection metric applies to direct raw fixtures, not to
OpenAI wire output. Stage 8 is **not a live-provider readiness sign-off**.
Fixing raw-response validation before canonicalization belongs in a separately
reviewed Stage 9 change and new regression tests. Do not weaken Stage 7 grounding
or alter its frozen implementation to hide this finding.

## Customer ambiguity

The customer metric is correctness of a query and eligible candidate set, not
recognition of a real person. Multiple same-name candidates require seller choice.
Foreign-business candidates are excluded in offline projection and tested SQL paths.
Fourteen PostgreSQL parity cases validate selected projection examples; this is
not exhaustive proof for every Unicode/ILIKE/wildcard input or >20 candidates.

## Label review ledger

No independent human review has taken place and no gold labels were changed.
Candidate review questions: zero payment after negation (S8-013), which field to
clear in repeated-number conflict (S8-080/084), and canonical name inflection.
These are open questions, not retrospective alternative scores.

For review: record case ID, original annotation, proposed alternative, contract and
linguistic rationale, reviewer identity/role and decision without showing which
implementation benefits. Keep v1 untouched; any accepted correction becomes v2,
with both versions reported. The student must seek independent RU/KZ review.
