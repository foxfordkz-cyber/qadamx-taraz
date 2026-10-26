"""Frozen constructed holdout; no network, live providers or financial operations."""

import argparse
import asyncio
import csv
import hashlib
import importlib.util
import json
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
API = ROOT / "apps/api"
DATA = ROOT / "docs/diploma-evidence/ai-evaluation-stage8"
sys.path.insert(0, str(API))

from app.errors import APIError  # noqa: E402
from app.services.ai import extract  # noqa: E402

FIELDS = (
    "outcome",
    "kind",
    "total_minor",
    "received_minor",
    "amount_minor",
    "customer_query",
    "customer_refs",
    "clarification_fields",
)


def digest(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def load_corpus():
    frozen = json.loads((DATA / "freeze.json").read_text(encoding="utf-8"))
    for name, expected in frozen["hashes_lf"].items():
        if digest(ROOT / name) != expected:
            raise ValueError(f"Frozen artifact changed: {name}")
    rows = [
        json.loads(line)
        for line in (DATA / "dataset.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    if len(rows) != 120 or len({r["id"] for r in rows}) != 120:
        raise ValueError("Invalid frozen case set")
    return rows, frozen


def implementations():
    """Verify the exact production files; never silently evaluate a tuned variant."""
    for name in ("ai.py", "extraction_grounding.py"):
        relative = f"apps/api/app/services/{name}"
        source = subprocess.check_output(["git", "show", f"b84b4c7:{relative}"], cwd=ROOT)
        if hashlib.sha256(source.replace(b"\r\n", b"\n")).hexdigest() != digest(ROOT / relative):
            raise ValueError(f"Stage7 implementation changed: {relative}")
    baseline = API / "tests/evaluation_baselines/extraction_stage6.py"
    original = subprocess.check_output(
        ["git", "show", "ae43dc2:apps/api/app/services/ai.py"], cwd=ROOT
    )
    if hashlib.sha256(original.replace(b"\r\n", b"\n")).hexdigest() != digest(baseline):
        raise ValueError("Original extraction snapshot changed")
    spec = importlib.util.spec_from_file_location("stage8_original", baseline)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.extract, extract


def project(result, case):
    """Documented offline projection; SQL parity is verified in a separate test."""
    refs = sorted(
        c["ref"]
        for c in case["customers"]
        if result.customer_query
        and c["business"] == case["active_business"]
        and result.customer_query.lower() in c["name"].lower()
    )[:20]
    missing = []
    if result.kind == "unknown":
        missing.append("kind")
    elif result.kind == "sale":
        for name in ("total_minor", "received_minor"):
            if getattr(result, name) is None:
                missing.append(name)
        credit = (
            result.total_minor is None
            or result.received_minor is None
            or result.received_minor < result.total_minor
        )
        if (credit or result.customer_query) and len(refs) != 1:
            missing.append("customer_id")
    else:
        if result.amount_minor is None:
            missing.append("amount_minor")
        if len(refs) != 1:
            missing.append("customer_id")
        missing.append("sale_id")
    if result.kind != "unknown" and not result.description:
        missing.append("description")
    if "customer_query" in result.uncertain_fields and "customer_id" not in missing:
        missing.append("customer_id")
    return dict(
        outcome="draft",
        kind=result.kind,
        total_minor=result.total_minor,
        received_minor=result.received_minor,
        amount_minor=result.amount_minor,
        customer_query=result.customer_query,
        customer_refs=refs,
        clarification_fields=sorted(missing),
    )


async def run(method, case):
    class Response:
        max_attempts = 1
        calls = 0

        async def generate(self, **kwargs):
            self.calls += 1
            return case["provider_raw"]

    provider = Response()
    error = None
    try:
        response = await method(
            provider,
            text=case["input"],
            locale="auto" if case["language"] == "mixed" else case["language"],
        )
        result = project(response, case)
    except APIError as exc:
        error = {"status": exc.status, "code": exc.code}
        result = dict(
            outcome="unavailable",
            kind=None,
            total_minor=None,
            received_minor=None,
            amount_minor=None,
            customer_query=None,
            customer_refs=[],
            clarification_fields=[],
        )
    assert provider.calls == 1
    return {"result": result, "provider_calls": provider.calls, "error": error}


def ready(result):
    return (
        result["outcome"] == "draft"
        and result["kind"] == "sale"
        and not result["clarification_fields"]
        and type(result["total_minor"]) is int
        and result["total_minor"] > 0
        and type(result["received_minor"]) is int
        and 0 <= result["received_minor"] <= result["total_minor"]
    )


def fraction(passed, n):
    return {"numerator": passed, "denominator": n, "rate": passed / n if n else None}


def summarize(rows, version):
    def output(row):
        return row[version]["result"]

    draft = [r for r in rows if r["expected"]["outcome"] == "draft"]
    invalid = [r for r in rows if r["expected"]["outcome"] == "unavailable"]
    sales = [r for r in draft if r["expected"]["kind"] == "sale"]
    repayment = [r for r in draft if r["expected"]["kind"] == "repayment"]
    customers = [r for r in draft if r["customers"]]
    not_ready = [r for r in rows if not ready(r["expected"])]

    def score(group, fields):
        return fraction(
            sum(
                output(r)["outcome"] == r["expected"]["outcome"]
                and all(output(r)[f] == r["expected"][f] for f in fields)
                for r in group
            ),
            len(group),
        )

    metrics = {
        "transaction_type": score(draft, ["kind"]),
        "sales_amount": score(sales, ["total_minor"]),
        "received_amount": score(sales, ["received_minor"]),
        "repayment_amount": score(repayment, ["amount_minor"]),
        "customer_query": score(customers, ["customer_query"]),
        "customer_candidates": score(customers, ["customer_refs"]),
        "clarification": score(draft, ["clarification_fields"]),
        "full_valid": score(draft, FIELDS),
        "full_all": score(rows, FIELDS),
        "invalid_rejected": score(invalid, FIELDS),
        "false_output_acceptance": fraction(
            sum(output(r)["outcome"] == "draft" for r in invalid), len(invalid)
        ),
        "false_output_rejection": fraction(
            sum(output(r)["outcome"] == "unavailable" for r in draft), len(draft)
        ),
        "unsafe_ready": fraction(sum(ready(output(r)) for r in not_ready), len(not_ready)),
    }
    metrics["error_ids"] = [r["id"] for r in rows if output(r) != r["expected"]]
    return metrics


def analyze(row):
    expected, before, after = row["expected"], row["before"]["result"], row["after"]["result"]
    return {
        "improved": before != expected and after == expected,
        "regressed": before == expected and after != expected,
        "both_correct": before == expected and after == expected,
        "both_correct_rejection": expected["outcome"] == "unavailable"
        and before == expected
        and after == expected,
        "both_draft": before["outcome"] == "draft" and after["outcome"] == "draft",
        "more_conservative": any(
            expected[f] is not None and before[f] is not None and after[f] is None
            for f in ("total_minor", "received_minor", "amount_minor", "customer_query")
        )
        or set(after["clarification_fields"]) > set(before["clarification_fields"]),
        "changed_fields": [f for f in FIELDS if before[f] != after[f]],
        "after_wrong_fields": [f for f in FIELDS if after[f] != expected[f]],
    }


async def evaluate(destination):
    cases, freeze = load_corpus()
    original, improved = implementations()
    rows = []
    for case in cases:
        row = {**case, "before": await run(original, case), "after": await run(improved, case)}
        row["analysis"] = analyze(row)
        rows.append(row)
    summary = dict(
        dataset=freeze,
        execution_commit=git("rev-parse", "HEAD"),
        python=platform.python_version(),
        implementation_commit=freeze["implementation"],
        baseline_commit=freeze["baseline"],
        configuration={
            "provider": "frozen response double",
            "max_attempts": 1,
            "live_calls": 0,
            "customer_scope": "offline candidate projection, separate SQL parity",
        },
        before=summarize(rows, "before"),
        after=summarize(rows, "after"),
        by_language={
            lang: {
                v: summarize([r for r in rows if r["language"] == lang], v)
                for v in ("before", "after")
            }
            for lang in ("ru", "kk", "mixed")
        },
        by_category={
            cat: {
                v: summarize([r for r in rows if r["category"] == cat], v)
                for v in ("before", "after")
            }
            for cat in sorted({r["category"] for r in rows})
        },
        pairs={
            flag: [r["id"] for r in rows if r["analysis"][flag]]
            for flag in (
                "improved",
                "regressed",
                "both_correct",
                "both_correct_rejection",
                "both_draft",
                "more_conservative",
            )
        },
    )
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "cases.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8"
    )
    (destination / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with (destination / "cases.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(
            stream,
            fieldnames=["id", "language", "category", "expected", "before", "after", "analysis"],
            lineterminator="\n",
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    k: json.dumps(row[k], ensure_ascii=False)
                    if isinstance(row[k], dict)
                    else row[k]
                    for k in writer.fieldnames
                }
            )
    print(
        json.dumps(
            {k: summary[k] for k in ("before", "after", "pairs")}, ensure_ascii=False, indent=2
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    asyncio.run(evaluate(parser.parse_args().output))
