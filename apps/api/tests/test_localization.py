import copy
import json
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.demo_translations import apply_manifest
from app.models import Business, CatalogItem, Membership, Venue
from app.seed import demo_id

pytestmark = pytest.mark.postgres


def test_localization_legacy_fallback_projection_and_scope(ledger_api):
    a = ledger_api
    c = a["client"]
    path = "/api/v1/businesses/mart-demo-clothes"
    original = c.get(path).json()
    assert original["name_i18n"] is None
    assert c.get(path, params={"lang": "kk"}).json() == original
    with Session(a["engine"]) as db, db.begin():
        biz = db.get(Business, a["business"])
        biz.name_i18n = {"ru": "Учебная одежда", "kk": "Оқу киімдері"}
        # Missing kk description must fall back per field, never translate automatically.
        biz.description_i18n = {"ru": "Другой текст"}
        db.get(Venue, demo_id("mart")).address_label_i18n = {"kk": "Оқу алаңы"}
        item = db.scalar(select(CatalogItem).where(CatalogItem.business_id == biz.id))
        item.name_i18n = {"kk": "Оқу тауары"}
    kk = c.get(path, params={"lang": "kk"}).json()
    ru = c.get(path, params={"lang": "ru"}).json()
    legacy = c.get(path).json()
    assert kk["name"] == "Оқу киімдері" and ru["name"] == "Учебная одежда"
    assert legacy["name"] == original["name"]
    assert kk["description"] == original["description"]
    assert kk["catalog"][0]["name"] == "Оқу тауары"
    for field in ["id", "slug", "venue_id", "category", "is_demo"]:
        assert kk[field] == original[field]
    for field in ["id", "price_minor", "available"]:
        assert kk["catalog"][0][field] == original["catalog"][0][field]
    assert not {"memberships", "customers", "owner_id", "contact"} & kk.keys()
    page = c.get("/api/v1/businesses", params={"lang": "kk", "limit": 1}).json()
    next_page = c.get(
        "/api/v1/businesses", params={"lang": "kk", "cursor": page["next_cursor"]}
    ).json()
    assert page["items"][0]["id"] not in {b["id"] for b in next_page["items"]}
    me = c.get("/api/v1/me?lang=kk", headers=a["a"]).json()
    assert next(b for b in me["businesses"] if b["id"] == str(a["business"]))["name"] == kk["name"]
    assert str(a["business"]) not in {
        b["id"] for b in c.get("/api/v1/me?lang=kk", headers=a["b"]).json()["businesses"]
    }
    assert c.get("/api/v1/me?lang=kk").status_code == 401
    venues = c.get("/api/v1/venues?lang=kk").json()["items"]
    assert next(v for v in venues if v["slug"] == "mart")["address_label"] == "Оқу алаңы"
    for lang in ["kz", "en", ""]:
        assert c.get(path, params={"lang": lang}).status_code == 422


def test_reviewed_demo_update_is_targeted_dry_run_and_repeat_safe(ledger_api):
    path = (
        Path(__file__).resolve().parents[3] / "packages/contracts/demo-translations-proposed.json"
    )
    manifest = json.loads(path.resolve().read_text(encoding="utf-8"))
    with Session(ledger_api["engine"]) as db:
        with pytest.raises(ValueError, match="review"):
            apply_manifest(db, manifest)
        manifest["reviewed"] = True  # Test fixture approval, not linguistic review of production.
        original_memberships = list(db.execute(select(Membership.user_id, Membership.business_id)))
        changed = db.get(Business, ledger_api["business"])
        changed.name = "Seller supplied original name"
        db.get(Business, ledger_api["other"]).is_demo = False
        db.commit()
        assert apply_manifest(db, manifest) == {"eligible": 19, "skipped": 2, "applied": 0}
        assert db.get(Venue, demo_id("mart")).name_i18n is None
        result = apply_manifest(db, manifest, apply=True)
        assert result["applied"] == 19
        db.commit()
        assert apply_manifest(db, manifest, apply=True)["applied"] == 0
        assert changed.name_i18n is None
        assert (
            list(db.execute(select(Membership.user_id, Membership.business_id)))
            == original_memberships
        )
        invalid = copy.deepcopy(manifest)
        invalid["entries"][0]["id"] = str(ledger_api["owner_a"])
        with pytest.raises(ValueError, match="demo IDs"):
            apply_manifest(db, invalid, apply=True)


@pytest.mark.parametrize("variants", [{"en": "unexpected"}, {"kk": 5}, {"kk": " "}, []])
def test_database_rejects_invalid_translation_shape(ledger_api, variants):
    from sqlalchemy.exc import IntegrityError

    with Session(ledger_api["engine"]) as db:
        row = db.get(Business, ledger_api["business"])
        row.name_i18n = variants
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()


def test_0007_preserves_original_data_and_memberships(ledger_api):
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import text

    engine = ledger_api["engine"]
    config = Config("alembic.ini")
    queries = [
        "SELECT id, slug, name, description FROM qadam.businesses ORDER BY id",
        "SELECT * FROM qadam.memberships ORDER BY user_id, business_id",
        "SELECT id, name, price_minor FROM qadam.catalog_items ORDER BY id",
    ]
    command.downgrade(config, "0006_customer_requests")
    try:
        with engine.connect() as db:
            before = [db.execute(text(q)).all() for q in queries]
        command.upgrade(config, "head")
        command.check(config)
        with engine.connect() as db:
            assert [db.execute(text(q)).all() for q in queries] == before
            assert (
                db.scalar(text("SELECT count(*) FROM qadam.businesses WHERE name_i18n IS NOT NULL"))
                == 0
            )
    finally:
        command.upgrade(config, "head")
