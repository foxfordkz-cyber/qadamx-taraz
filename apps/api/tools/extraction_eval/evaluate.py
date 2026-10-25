"""Frozen, offline post-provider comparison. No live model/network/database calls."""

import argparse
import asyncio
import hashlib
import importlib.util
import json
import platform
import subprocess
import sys
from collections import Counter
from pathlib import Path

API = Path(__file__).resolve().parents[2]
ROOT = API.parents[1]
sys.path.insert(0, str(API))

from app.errors import APIError  # noqa: E402
from app.services.ai import extract  # noqa: E402


def digest(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def corpus():
    fixtures = API / "tests/fixtures"
    freeze = json.loads((fixtures / "extraction_stage7_freeze.json").read_text())
    dataset = fixtures / "extraction_stage7.json"
    baseline = API / "tests/evaluation_baselines/extraction_stage6.py"
    assert digest(dataset) == freeze["dataset_sha256_lf"], "Frozen dataset changed"
    assert digest(baseline) == freeze["baseline_sha256_lf"], "Frozen baseline changed"
    source = subprocess.check_output(
        ["git", "show", f"{freeze['baseline_commit']}:apps/api/app/services/ai.py"], cwd=ROOT
    ).replace(b"\r\n", b"\n")
    assert hashlib.sha256(source).hexdigest() == freeze["baseline_sha256_lf"]
    spec = importlib.util.spec_from_file_location("stage6_extraction_baseline", baseline)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    cases = json.loads(dataset.read_text(encoding="utf-8"))
    assert len(cases) == 100 and len({row["id"] for row in cases}) == 100
    return cases, freeze, module.extract


def normalized(result):
    missing = []
    if result.kind == "unknown":
        missing.append("kind")
    elif result.kind == "sale":
        for field in ("total_minor", "received_minor"):
            if getattr(result, field) is None:
                missing.append(field)
        if result.customer_query is None and (
            result.total_minor is None
            or result.received_minor is None
            or result.received_minor < result.total_minor
            or "customer_query" in result.uncertain_fields
        ):
            missing.append("customer_query")
    else:
        if result.amount_minor is None:
            missing.append("amount_minor")
        if result.customer_query is None:
            missing.append("customer_query")
        missing.append("sale_id")
    return dict(
        outcome="draft",
        kind=result.kind,
        customer_query=result.customer_query,
        total_minor=result.total_minor,
        received_minor=result.received_minor,
        amount_minor=result.amount_minor,
        clarification_fields=sorted(missing),
    )


async def run(method, row):
    class FrozenProvider:
        max_attempts = 1
        calls = 0

        async def generate(self, **_):
            self.calls += 1
            return row["provider_raw"]

    provider = FrozenProvider()
    try:
        locale = "auto" if row["language"] == "mixed" else row["language"]
        result = normalized(await method(provider, text=row["text"], locale=locale))
    except APIError as error:
        assert error.code == "AI_UNAVAILABLE" and error.status == 503
        result = dict(
            outcome="unavailable",
            kind=None,
            customer_query=None,
            total_minor=None,
            received_minor=None,
            amount_minor=None,
            clarification_fields=[],
        )
    assert provider.calls == 1, "Comparison must not silently retry a response"
    return result


METRICS = {
    "transaction_classification": ("kind",),
    "amount_exact_match": ("total_minor", "amount_minor"),
    "payment_exact_match": ("received_minor",),
    "customer_query_association": ("customer_query",),
    "clarification_exact_match": ("clarification_fields",),
}


def summarize(rows, method):
    scores = {}
    draft_rows = [row for row in rows if row["expected"]["outcome"] == "draft"]
    for name, fields in METRICS.items():
        passed = sum(
            row[method]["outcome"] == "draft"
            and all(row[method][field] == row["expected"][field] for field in fields)
            for row in draft_rows
        )
        scores[name] = dict(correct=passed, n=len(draft_rows), rate=passed / len(draft_rows))
    passed = sum(row[method] == row["expected"] for row in rows)
    scores["full_transaction_exact_match"] = dict(
        correct=passed, n=len(rows), rate=passed / len(rows)
    )
    scores["fallback_cases"] = sum(row[method]["outcome"] == "unavailable" for row in rows)
    invalid = [row for row in rows if row["expected"]["outcome"] == "unavailable"]
    scores["invalid_provider_rejected"] = dict(
        correct=sum(row[method] == row["expected"] for row in invalid), n=len(invalid)
    )
    scores["failed_by_category"] = dict(
        Counter(row["category"] for row in rows if row[method] != row["expected"])
    )
    scores["full_by_language"] = {
        lang: dict(
            correct=sum(row[method] == row["expected"] for row in rows if row["language"] == lang),
            n=sum(row["language"] == lang for row in rows),
        )
        for lang in ("ru", "kk", "mixed")
    }
    return scores


async def evaluate(destination):
    cases, freeze, baseline = corpus()
    rows = []
    for case in cases:
        before, after = await run(baseline, case), await run(extract, case)
        rows.append(
            {
                key: case[key]
                for key in ("id", "language", "category", "text", "provider_condition", "expected")
            }
            | {"before": before, "after": after}
        )
    summary = dict(
        dataset=freeze,
        python=platform.python_version(),
        source_commit=subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        source_hashes={
            str(path.relative_to(API)): digest(path)
            for path in (API / "app/services").glob("*grounding*.py")
        },
        before=summarize(rows, "before"),
        after=summarize(rows, "after"),
        improved_cases=[
            r["id"] for r in rows if r["before"] != r["expected"] and r["after"] == r["expected"]
        ],
        regressed_cases=[
            r["id"] for r in rows if r["before"] == r["expected"] and r["after"] != r["expected"]
        ],
        remaining_failures=[r["id"] for r in rows if r["after"] != r["expected"]],
        live_provider_calls=0,
        limitation=(
            "Constructed post-provider fault injection, not live LLM/ASR accuracy; "
            "name query is not verified customer identity"
        ),
    )
    summary["source_hashes"]["app/services/ai.py"] = digest(API / "app/services/ai.py")
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "cases.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (destination / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                key: summary[key]
                for key in (
                    "before",
                    "after",
                    "improved_cases",
                    "regressed_cases",
                    "remaining_failures",
                )
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    asyncio.run(evaluate(parser.parse_args().output))
