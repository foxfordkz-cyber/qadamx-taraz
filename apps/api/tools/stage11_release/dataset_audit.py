"""Audit frozen synthetic texts and prepare an UNANNOTATED blind-review packet."""

import argparse
import hashlib
import itertools
import json
import random
import unicodedata
import zipfile
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

from tools.stage11_release.provenance import ROOT

SOURCES = {
    "stage7": "apps/api/tests/fixtures/extraction_stage7.json",
    "stage8": "docs/diploma-evidence/ai-evaluation-stage8/dataset.jsonl",
    "stage10": "docs/diploma-evidence/final-integration/challenge.jsonl",
}


def normalize(value):
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    rows, sources = [], {}
    for name, relative in SOURCES.items():
        raw = (ROOT / relative).read_bytes().replace(b"\r\n", b"\n")
        records = (
            json.loads(raw)
            if relative.endswith(".json")
            else [json.loads(line) for line in raw.splitlines()]
        )
        sources[name] = {
            "file": relative,
            "sha256_lf": hashlib.sha256(raw).hexdigest(),
            "count": len(records),
            "languages": dict(Counter(r["language"] for r in records)),
            "categories": dict(Counter(r["category"] for r in records)),
        }
        rows.extend({**r, "source": name, "input": r.get("input", r.get("text"))} for r in records)
    groups = defaultdict(list)
    for row in rows:
        groups[normalize(row["input"])].append(row)
    duplicate_groups = []
    for group in groups.values():
        if len(group) > 1:
            labels = {json.dumps(row["expected"], sort_keys=True) for row in group}
            duplicate_groups.append(
                {
                    "ids": [r["id"] for r in group],
                    "different_expected_objects": len(labels) > 1,
                    "categories": [r["category"] for r in group],
                    "interpretation": (
                        "Review context/provider fault before calling this a label inconsistency"
                    ),
                }
            )
    near = []
    for left, right in itertools.combinations(rows, 2):
        a, b = normalize(left["input"]), normalize(right["input"])
        if a == b or min(len(a), len(b)) / max(len(a), len(b)) < 0.8:
            continue
        ratio = SequenceMatcher(None, a, b, autojunk=False).ratio()
        if ratio >= 0.90:
            near.append({"a": left["id"], "b": right["id"], "ratio": round(ratio, 6)})
    # A mechanical label check, not an independent interpretation of the text.
    invalid = []
    for row in rows:
        e = row["expected"]
        for field in ("total_minor", "received_minor", "amount_minor"):
            if e.get(field) is not None and (type(e[field]) is not int or e[field] < 0):
                invalid.append({"id": row["id"], "issue": field + " invalid integer money"})
        if (
            e.get("total_minor") is not None
            and e.get("received_minor") is not None
            and e["received_minor"] > e["total_minor"]
        ):
            invalid.append({"id": row["id"], "issue": "payment exceeds total"})
    audit = {
        "normalization": "NFKC + casefold + whitespace collapse; not semantic equivalence",
        "sources": sources,
        "rows": len(rows),
        "unique_normalized_inputs": len(groups),
        "exact_duplicate_groups": duplicate_groups,
        "near_duplicate_threshold": 0.90,
        "near_duplicate_pairs": near,
        "mechanical_label_issues": invalid,
        "stage9": "Reuses Stage8; not counted as another 120 independent examples",
        "human_reviewers": 0,
        "live_provider_calls": 0,
    }
    write(output / "dataset-audit.json", audit)
    selected = [r for r in rows if r["source"] == "stage10" and int(r["id"].split("-")[1]) <= 33]
    for language in ("ru", "kk", "mixed"):
        candidates = [
            r
            for r in rows
            if r["source"] == "stage8"
            and r["language"] == language
            and r["category"] != "malformed_provider"
        ]
        # Hash order avoids choosing based on successful outputs; one case per category.
        candidates.sort(key=lambda r: hashlib.sha256(("stage11-v1" + r["id"]).encode()).hexdigest())
        used = set()
        count = 0
        for row in candidates:
            if row["category"] in used:
                continue
            selected.append(row)
            used.add(row["category"])
            count += 1
            if count == 9:
                break
        assert count == 9
    random.Random(20261026).shuffle(selected)
    cards, worksheet, mapping = [], [], []
    for i, row in enumerate(selected, 1):
        sid = f"IND-S11-{i:03d}"
        customers = [
            {
                "ref": f"C{j}",
                "name": c["name"],
                "allowed_business": c["business"] == row["active_business"],
            }
            for j, c in enumerate(row.get("customers", []), 1)
        ]
        cards.append(
            {
                "sample_id": sid,
                "language": row["language"],
                "text": row["input"],
                "customers": customers,
            }
        )
        worksheet.append(
            {
                "sample_id": sid,
                "language": row["language"],
                "annotation_status": "unreviewed",
                "kind": None,
                "customer_query": None,
                "customer_refs": None,
                "total_minor": None,
                "received_minor": None,
                "amount_minor": None,
                "clarification_fields": None,
                "uncertainty_notes": "",
                "annotator_code": "",
            }
        )
        mapping.append(
            {
                "sample_id": sid,
                "source_id": row["id"],
                "source": row["source"],
                "customer_ref_map": {
                    c["ref"]: f"C{j}" for j, c in enumerate(row.get("customers", []), 1)
                },
            }
        )
    assert Counter(c["language"] for c in cards) == {"ru": 20, "kk": 20, "mixed": 20}
    reviewer = output / "blind-review"
    reviewer.mkdir(exist_ok=True)
    for name, records in (
        ("cases.jsonl", cards),
        ("reviewer-A.jsonl", worksheet),
        ("reviewer-B.jsonl", worksheet),
    ):
        (reviewer / name).write_text(
            "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in records), encoding="utf-8"
        )
    write(output / "coordinator-map.DO-NOT-SEND.json", mapping)
    instructions = """# Blind semantic annotation — NOT completed research

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
"""
    (reviewer / "INSTRUCTIONS.md").write_text(instructions, encoding="utf-8")
    properties = {
        "schema_version": {"const": "stage11-human-gold-v1"},
        "sample_id": {"type": "string", "pattern": "^IND-S11-[0-9]{3}$"},
        "language": {"enum": ["ru", "kk", "mixed"]},
        "kind": {"enum": ["sale", "repayment", "unknown"]},
        "customer_query": {"type": ["string", "null"]},
    }
    properties.update(
        {
            k: {"type": ["integer", "null"], "minimum": 0}
            for k in ("total_minor", "received_minor", "amount_minor")
        }
    )
    properties.update(
        {
            k: {"type": "array", "items": {"type": "string"}, "uniqueItems": True}
            for k in ("customer_refs", "clarification_fields", "reviewer_codes")
        }
    )
    properties.update(
        {
            "adjudication_status": {"enum": ["agreed", "adjudicated", "disputed"]},
            "rationale": {"type": "string"},
            "adjudicator_code": {"type": ["string", "null"]},
            "annotation_date": {"type": "string", "format": "date"},
        }
    )
    write(
        reviewer / "gold.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "additionalProperties": False,
            "required": list(properties),
            "properties": properties,
        },
    )
    # Deterministic ZIP metadata; no coordinator map, old labels or provider replies.
    with zipfile.ZipFile(
        output / "blind-review-only.zip", "w", compression=zipfile.ZIP_DEFLATED
    ) as archive:
        for path in sorted(reviewer.iterdir()):
            info = zipfile.ZipInfo(path.name, date_time=(2026, 10, 26, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())
    write(
        output / "blind-package-manifest.json",
        {
            "cases": 60,
            "languages": {"ru": 20, "kk": 20, "mixed": 20},
            "reviewers": 0,
            "completed_annotations": 0,
            "seed": 20261026,
            "selection": (
                "All 33 Stage10 semantic cases plus 9/category-distinct Stage8 cases per language, "
                "ordered by salted SHA256 then seeded shuffle"
            ),
            "zip_sha256": hashlib.sha256(
                (output / "blind-review-only.zip").read_bytes()
            ).hexdigest(),
        },
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    build(parser.parse_args().output)
