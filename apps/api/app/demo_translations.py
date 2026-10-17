"""Explicit, reviewed demo-only backfill. Dry-run by default; never seed or bind owners."""

import argparse
import json
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import make_engine
from app.models import Business, CatalogItem, Venue
from app.schemas import Translations
from app.seed import demo_rows

FIELDS = {
    Venue: ("name", "address_label"),
    Business: ("name", "description"),
    CatalogItem: ("name",),
}


def apply_manifest(db, manifest, apply=False):
    if manifest.get("reviewed") is not True:
        raise ValueError("Language review required before dry-run or apply")
    allowed = {
        (model.__tablename__, str(row["id"])): (model, row)
        for model, rows in demo_rows().items()
        if model in FIELDS
        for row in rows
    }
    prepared, seen = [], set()
    for entry in manifest["entries"]:
        key = (entry["table"], entry["id"])
        if key not in allowed or key in seen:
            raise ValueError("Use unique known demo IDs only")
        seen.add(key)
        model, template = allowed[key]
        expected = {field: template[field] for field in FIELDS[model]}
        if entry["expected"] != expected or set(entry["translations"]) != set(expected):
            raise ValueError("Expected template and translated fields must match allowlist")
        variants = {
            field: Translations.model_validate(value).model_dump()
            for field, value in entry["translations"].items()
        }
        prepared.append((model, UUID(entry["id"]), expected, variants))
    eligible = skipped = 0
    for model, id, expected, variants in prepared:
        row = db.scalar(select(model).where(model.id == id).with_for_update())
        if (
            row is None
            or not row.is_demo
            or any(getattr(row, field) != value for field, value in expected.items())
            or any(getattr(row, field + "_i18n") is not None for field in expected)
        ):
            skipped += 1
            continue
        eligible += 1
        if apply:
            for field, value in variants.items():
                setattr(row, field + "_i18n", value)
    return {"eligible": eligible, "skipped": skipped, "applied": eligible if apply else 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    engine = make_engine(Settings())
    with Session(engine) as db:
        result = apply_manifest(db, manifest, args.apply)
        if args.apply:
            db.commit()
        else:
            db.rollback()
    engine.dispose()
    print(json.dumps(result))


if __name__ == "__main__":
    main()
