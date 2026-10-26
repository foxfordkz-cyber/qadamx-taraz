# Frozen dataset dictionary

JSONL is one record per line; CSV contains identical values, with nested structures encoded
as JSON cells. UTF-8, no BOM, LF-normalized checksums. Every record has:

| Field | Meaning |
|---|---|
| id | Unique S8-001 … S8-120 |
| dataset_version | Immutable v1 identifier |
| language | ru, kk, mixed (request locale auto for mixed) |
| category | One of ten task-driven scenario categories |
| input | Synthetic original text; authoritative for text extraction |
| data_origin | authored_synthetic_no_real_person |
| active_business | Synthetic shop-a context |
| customers | Synthetic ref/business/name rows, including shop-b distractors |
| expected | Gold outcome, kind, three nullable money fields, query, candidate refs, clarification set |
| expected_acceptance | draft_with_review or reject_output; never permission to write money |
| error_category | Authored control/fault category; not a measured error |
| provider_raw | Exact structured output replayed to both implementations, possibly intentionally invalid |

Money is integer tiyn (100 per KZT), with null distinct from zero. Expected customer refs
are case-local synthetic identifiers, not UUIDs or actual identity claims. A duplicate
name in shop-a yields two candidates and requires customer selection; a name only in shop-b
must yield no eligible candidate. Repayment always requires an explicit sale selection.

Kinds: sale, repayment, unknown. Unavailable output has null kind/money/query, no candidates
and no clarification list because the UI uses its existing error/manual fallback.
Unknown intent remains a draft asking kind; it is not a financial operation.

Annotation scope excludes goods-description quality and speech transcription. Description
in provider fixtures is synthetic; full transaction exact match covers only the fields
specified in the frozen protocol, not a claim of final user-confirmed ledger correctness.
