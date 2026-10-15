"""Run from apps/api: uv run python -m app.export_contracts [--check]."""

import argparse
import json
from pathlib import Path

from app.config import Settings
from app.examples import EXAMPLES
from app.main import create_app
from app.schemas import SCHEMA_MODELS
from app.seed import demo_rows

OUTPUT = Path(__file__).resolve().parents[3] / "packages" / "contracts"


def artifacts() -> dict[str, str]:
    for model in SCHEMA_MODELS:
        model.model_validate(EXAMPLES[model.__name__])
    payloads = {
        "openapi.json": create_app(Settings(_env_file=None)).openapi(),
        "examples.json": EXAMPLES,
        "demo-seed.json": {
            "note": "Synthetic fixtures, not live API data or Supabase accounts.",
            "tables": {model.__tablename__: rows for model, rows in demo_rows().items()},
        },
    }
    return {
        name: json.dumps(value, ensure_ascii=False, indent=2, default=str) + "\n"
        for name, value in payloads.items()
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, content in artifacts().items():
        path = OUTPUT / name
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                raise SystemExit(f"Contract export is stale: {path}")
        else:
            OUTPUT.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
    print("Contracts verified" if args.check else "Contracts exported")


if __name__ == "__main__":
    main()
