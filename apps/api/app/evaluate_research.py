"""Reproduce forecasting from an explicit export; never connects to a database."""

import argparse
import hashlib
import json
import platform
from datetime import date, timedelta
from pathlib import Path

from app.services import forecasting


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", type=Path, help="Private JSON array: date, sales_minor")
    source.add_argument("--synthetic", action="store_true", help="Engineering demonstration only")
    source.add_argument("--empty", action="store_true", help="Record absence of real observations")
    parser.add_argument("--horizon", type=int, choices=[7, 30], default=7)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.synthetic:
        rows = [
            dict(
                date=(date(2025, 1, 1) + timedelta(days=i)).isoformat(),
                sales_minor=10000 + i * 100 + i % 7 * 500,
            )
            for i in range(180)
        ]
        provenance = "synthetic_deterministic_v1"
    elif args.empty:
        rows, provenance = [], "no_real_dataset_supplied"
    else:
        rows = json.loads(args.input.read_text(encoding="utf-8"))
        provenance = "operator_supplied_export_not_independently_verified"
    result = forecasting.evaluate(rows, args.horizon, provenance=provenance)
    # The private source rows stay in the operator's input file; retain its hash.
    result.pop("history")
    result.pop("forecast")
    result["runtime"] = platform.python_version()
    result["implementation_sha256"] = hashlib.sha256(
        Path(forecasting.__file__).read_bytes()
    ).hexdigest()
    result["scientific_claim"] = "none; eligibility and provenance require review"
    result["debt_evaluation"] = {
        "status": "insufficient_data",
        "reason": "No verified outcome labels or due dates",
        "precision": None,
        "recall": None,
        "f1": None,
        "roc_auc": None,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"{result['status']}; provenance={provenance}; {args.output}")


if __name__ == "__main__":
    main()
