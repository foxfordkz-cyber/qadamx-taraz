"""Fresh frozen authored QA; no live provider, no financial writes."""

import argparse
import asyncio
import json
import subprocess
import sys
from pathlib import Path
from types import ModuleType

from app.services.ai import extract
from tools.stage8_eval.evaluate import ROOT, analyze, digest, git, run, summarize

BASE = "a921b3f4d6d45a44d4529fb3045888f850cf9018"
DATA = ROOT / "docs/diploma-evidence/final-integration"


def corpus():
    freeze = json.loads((DATA / "challenge-freeze.json").read_text(encoding="utf-8"))
    for name, expected in freeze["hashes_lf"].items():
        if digest(DATA / name) != expected:
            raise ValueError(f"Frozen challenge changed: {name}")
    rows = [
        json.loads(line)
        for line in (DATA / "challenge.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    assert len(rows) == freeze["count"] == 42
    return rows, freeze


def baseline():
    modules = {}
    for name in ("strict_json", "extraction_grounding", "ai"):
        raw = subprocess.check_output(
            ["git", "show", f"{BASE}:apps/api/app/services/{name}.py"], cwd=ROOT
        )
        m = ModuleType(f"_stage10_baseline_{name}")
        m.__file__ = f"<{BASE}:{name}>"
        sys.modules[m.__name__] = m
        exec(compile(raw, m.__file__, "exec"), m.__dict__)
        modules[name] = m
    modules["ai"].ground_extraction = modules["extraction_grounding"].ground_extraction
    modules["ai"].strict_json_object = modules["strict_json"].strict_json_object
    return modules["ai"].extract


async def evaluate(output):
    if output.exists():
        raise ValueError("Use a new output directory; evidence is immutable")
    cases, freeze = corpus()
    old = baseline()
    rows = []
    for case in cases:
        row = {**case, "before": await run(old, case), "after": await run(extract, case)}
        row["analysis"] = analyze(row)
        rows.append(row)
    from tools.stage9_eval.evaluate import source_hashes, verify_baseline

    verify_baseline()
    summary = {
        "execution_commit": git("rev-parse", "HEAD"),
        "baseline": BASE,
        "source_hashes_lf": source_hashes(),
        "freeze": freeze,
        "status": (
            "New authored cases; same exposed author; not independent human or live LLM accuracy"
        ),
        "paid_calls": 0,
        "before": summarize(rows, "before"),
        "after": summarize(rows, "after"),
        "by_language": {
            lang: summarize([r for r in rows if r["language"] == lang], "after")
            for lang in ("ru", "kk", "mixed")
        },
        "by_category": {
            category: summarize([r for r in rows if r["category"] == category], "after")
            for category in sorted({r["category"] for r in rows})
        },
        "improved_ids": [r["id"] for r in rows if r["analysis"]["improved"]],
        "regressed_ids": [r["id"] for r in rows if r["analysis"]["regressed"]],
    }
    output.mkdir(parents=True)
    (output / "cases.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8"
    )
    (output / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    asyncio.run(evaluate(parser.parse_args().output))
