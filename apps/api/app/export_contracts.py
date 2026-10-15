import argparse
import json
from pathlib import Path

from app.config import Settings
from app.examples import EXAMPLES, model_for_example
from app.main import create_app
from app.seed import demo_rows

OUTPUT = Path(__file__).resolve().parents[3] / "packages/contracts"


def artifacts():
    for name, example in EXAMPLES.items():
        model_for_example(name).model_validate(example)
    app = create_app(
        Settings(_env_file=None, database_url=None, supabase_url="", jwt_issuer="", jwt_audience="")
    )
    payloads = {
        "openapi.json": app.openapi(),
        "examples.json": EXAMPLES,
        "demo-seed.json": {
            "note": "Synthetic fixtures; no Supabase login accounts or memberships.",
            "tables": {model.__tablename__: rows for model, rows in demo_rows().items()},
        },
    }
    return {
        name: json.dumps(value, ensure_ascii=False, indent=2, default=str) + "\n"
        for name, value in payloads.items()
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, content in artifacts().items():
        path = OUTPUT / name
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                raise SystemExit(f"Stale export: {name}")
        else:
            OUTPUT.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
    print("Contracts verified" if args.check else "Contracts exported")


if __name__ == "__main__":
    main()
