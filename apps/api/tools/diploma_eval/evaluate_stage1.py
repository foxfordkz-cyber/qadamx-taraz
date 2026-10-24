"""Offline paired-protocol evaluation. No database, provider or network calls."""

import argparse
import csv
import hashlib
import importlib.util
import json
import platform
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = API_ROOT.parents[1]
sys.path.insert(0, str(API_ROOT))

from app.assistant_schemas import AssistantFact  # noqa: E402


def load_frozen():
    fixture = API_ROOT / "tests/fixtures/assistant_stage1_cases.json"
    freeze = json.loads(fixture.with_name("assistant_stage1_freeze.json").read_text("utf-8"))
    baseline = API_ROOT / "tests/evaluation_baselines/assistant_numeric_v1.py"
    if hashlib.sha256(fixture.read_bytes()).hexdigest() != freeze["fixture_sha256"]:
        raise ValueError("Frozen cases changed; create a new protocol version instead")
    if hashlib.sha256(baseline.read_bytes()).hexdigest() != freeze["baseline_file_sha256"]:
        raise ValueError("Frozen baseline changed")
    spec = importlib.util.spec_from_file_location("offline_numeric_baseline", baseline)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return json.loads(fixture.read_text("utf-8")), freeze, module.validate_answer


def observe(validate, raw, facts, days, locale, shop=None):
    try:
        args = (raw, facts, days, locale)
        answer, actions = validate(*args) if shop is None else validate(*args, shop=shop)
        return dict(
            accepted=True,
            reason=None,
            answer=answer,
            actions=[a.model_dump(mode="json") for a in actions],
        )
    except (ValueError, TypeError, KeyError) as error:
        # Synthetic evaluation only; production never logs raw financial output.
        return dict(accepted=False, reason=str(error), answer=None, actions=None)


def metrics(rows, field):
    tp = sum(r["expected_valid"] and r[field]["accepted"] for r in rows)
    fn = sum(r["expected_valid"] and not r[field]["accepted"] for r in rows)
    fp = sum(not r["expected_valid"] and r[field]["accepted"] for r in rows)
    tn = sum(not r["expected_valid"] and not r[field]["accepted"] for r in rows)

    def ratio(n, d):
        return n / d if d else None

    return dict(
        tp=tp,
        fp=fp,
        tn=tn,
        fn=fn,
        false_acceptance_rate=ratio(fp, fp + tn),
        false_rejection_rate=ratio(fn, tp + fn),
        precision=ratio(tp, tp + fp),
        recall=ratio(tp, tp + fn),
        f1=ratio(2 * tp, 2 * tp + fp + fn),
    )


def revision():
    try:
        return subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"], text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--baseline-only", action="store_true")
    parser.add_argument("--verify-original", action="store_true")
    args = parser.parse_args()
    data, freeze, original = load_frozen()
    from app.services.assistant import validate_answer

    if args.verify_original:
        digest = hashlib.sha256((API_ROOT / "app/services/assistant.py").read_bytes()).hexdigest()
        if digest != freeze["original_assistant_sha256"]:
            raise ValueError("--verify-original must run BEFORE changing application validation")
    config = dict(
        dataset_id=data["dataset_id"],
        fixture_sha256=freeze["fixture_sha256"],
        positive_class="gold_valid",
        protocol=data["protocol_version"],
        note=data["scope_note"],
        python=platform.python_version(),
        run_utc=datetime.now(UTC).isoformat(),
        implementation_commit_sha=revision(),
        baseline_source_sha=freeze["baseline_source_sha"],
        live_provider_calls=0,
    )
    rows = []
    for case in data["cases"]:
        facts = [AssistantFact.model_validate(f) for f in data["snapshots"][case["snapshot"]]]
        observed = observe(original, case["legacy_output"], facts, case["days"], case["locale"])
        if args.verify_original:
            live = observe(
                validate_answer, case["legacy_output"], facts, case["days"], case["locale"]
            )
            if live != observed:
                raise ValueError("Preserved baseline differs: " + case["case_id"])
        row = dict(
            case_id=case["case_id"],
            expected_valid=case["expected_valid"],
            category=case["category"],
            relevant_fact_ids=case["relevant_fact_ids"],
            configuration={
                **config,
                "snapshot": case["snapshot"],
                "days": case["days"],
                "locale": case["locale"],
            },
            original=observed,
            improved=None,
        )
        if not args.baseline_only:
            row["improved"] = observe(
                validate_answer,
                case["structured_output"],
                facts,
                case["days"],
                case["locale"],
                shop=case["shop"],
            )
        rows.append(row)
    summary = dict(
        configuration=config,
        n=len(rows),
        valid=sum(r["expected_valid"] for r in rows),
        invalid=sum(not r["expected_valid"] for r in rows),
        original=metrics(rows, "original"),
        improved=None if args.baseline_only else metrics(rows, "improved"),
        limitation="Finite constructed paired protocols, not real-world model accuracy",
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    stem = "original" if args.baseline_only else "comparison"
    (args.output_dir / f"{stem}_cases.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8"
    )
    (args.output_dir / f"{stem}_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    fields = [
        "case_id",
        "expected_valid",
        "category",
        "original_accepted",
        "new_accepted",
        "original_rejection_reason",
        "new_rejection_reason",
        "relevant_fact_ids",
        "evaluation_configuration",
        "implementation_commit_sha",
    ]
    with (args.output_dir / f"{stem}_cases.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in rows:
            writer.writerow(
                dict(
                    case_id=r["case_id"],
                    expected_valid=r["expected_valid"],
                    category=r["category"],
                    original_accepted=r["original"]["accepted"],
                    new_accepted=r["improved"]["accepted"] if r["improved"] else None,
                    original_rejection_reason=r["original"]["reason"],
                    new_rejection_reason=r["improved"]["reason"] if r["improved"] else None,
                    relevant_fact_ids=";".join(r["relevant_fact_ids"]),
                    evaluation_configuration=json.dumps(r["configuration"], ensure_ascii=False),
                    implementation_commit_sha=config["implementation_commit_sha"],
                )
            )
    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
