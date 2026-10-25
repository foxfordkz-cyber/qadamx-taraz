"""Stage9 known-set regression comparison; no live providers or financial writes."""

import argparse
import asyncio
import csv
import json
import platform
import subprocess
import sys
from functools import lru_cache
from pathlib import Path
from types import ModuleType

from app.services.ai import extract
from tools.stage8_eval.evaluate import ROOT, analyze, digest, git, load_corpus, run, summarize

BASE = "08fd3eef541c6ab47f1d44e79d38778eefd2c784"
DATA = ROOT / "docs/diploma-evidence/ai-evaluation-stage9"
SOURCE_FILES = (
    "apps/api/app/services/ai.py",
    "apps/api/app/services/extraction_grounding.py",
    "apps/api/app/services/openai_provider.py",
    "apps/api/app/services/strict_json.py",
)


def source_hashes():
    return {name: digest(ROOT / name) for name in SOURCE_FILES if (ROOT / name).exists()}


def verify_baseline():
    frozen = json.loads((DATA / "baseline-freeze.json").read_text(encoding="utf-8"))
    for group in ("baseline_hashes_lf", "protected_evidence_hashes_lf"):
        for name, expected in frozen[group].items():
            if digest(ROOT / name) != expected:
                raise ValueError(f"Protected Stage1/7/8 or baseline artifact changed: {name}")
    return frozen


@lru_cache
def baseline_implementation():
    """Load exact Git modules, then bind the historical grounding function explicitly."""

    def module(name, relative):
        raw = subprocess.check_output(["git", "show", f"{BASE}:{relative}"], cwd=ROOT)
        value = ModuleType(name)
        value.__file__ = f"<{BASE}:{relative}>"
        sys.modules[name] = value
        exec(compile(raw, value.__file__, "exec"), value.__dict__)
        return value

    old_ground = module("_qadam_stage9_old_grounding", SOURCE_FILES[1])
    old_ai = module("_qadam_stage9_old_ai", SOURCE_FILES[0])
    # The snapshot's import initially resolves the current module. Replace that one
    # binding; the raw source itself is never edited or stored as a changed fixture.
    old_ai.ground_extraction = old_ground.ground_extraction
    return old_ai.extract


def implementations():
    verify_baseline()
    return baseline_implementation(), extract


async def evaluate(destination):
    if destination.exists():
        raise ValueError("Use a new output directory; never overwrite evidence")
    old, new = implementations()
    cases, freeze = load_corpus()
    saved = {
        row["id"]: row["after"]
        for row in map(
            json.loads,
            (DATA / "baseline-stage8/cases.jsonl").read_text(encoding="utf-8").splitlines(),
        )
    }
    rows = []
    for case in cases:
        before = await run(old, case)
        assert before == saved[case["id"]], "Historical loader must reproduce pre-change results"
        row = {**case, "before": before, "after": await run(new, case)}
        row["analysis"] = analyze(row)
        rows.append(row)
    flags = ("improved", "regressed", "more_conservative", "both_correct", "both_correct_rejection")
    summary = {
        "execution_commit": git("rev-parse", "HEAD"),
        "baseline_commit": BASE,
        "source_hashes_lf": source_hashes(),
        "dataset": freeze,
        "python": platform.python_version(),
        "configuration": {
            "provider": "identical authored response",
            "max_attempts": 1,
            "paid_calls": 0,
        },
        "baseline_reproduced_for_all_cases": True,
        "scientific_status": (
            "Known development/regression set after Stage8 exposure, not independent test accuracy"
        ),
        "before": summarize(rows, "before"),
        "after": summarize(rows, "after"),
        "by_language": {
            lang: {
                version: summarize([r for r in rows if r["language"] == lang], version)
                for version in ("before", "after")
            }
            for lang in ("ru", "kk", "mixed")
        },
        "pairs": {flag: [r["id"] for r in rows if r["analysis"][flag]] for flag in flags},
        "regressions_by_language": {
            lang: [r["id"] for r in rows if r["language"] == lang and r["analysis"]["regressed"]]
            for lang in ("ru", "kk", "mixed")
        },
    }
    destination.mkdir(parents=True)
    (destination / "cases.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8"
    )
    (destination / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with (destination / "cases.csv").open("w", encoding="utf-8", newline="") as stream:
        fields = ["id", "language", "expected", "before", "after", "analysis"]
        writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    key: json.dumps(row[key], ensure_ascii=False)
                    if isinstance(row[key], dict)
                    else row[key]
                    for key in fields
                }
            )
    print(
        json.dumps(
            {"before": summary["before"], "after": summary["after"], "pairs": summary["pairs"]},
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    asyncio.run(evaluate(parser.parse_args().output))
