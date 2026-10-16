"""Only the guarded, separate pg_engine test database; never shared Supabase."""

import hashlib
import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from test_livestock import BASE, BODY, publish, write

from app import livestock_routes as routes


def test_0004_to_0005_preserves_listing_and_legacy_idempotency(ledger_api):
    api = ledger_api
    key = uuid4()
    original = write(api, key=key)
    assert original.status_code == 200
    old_body = {**BODY, "age_months": None, "sex": None, "description": None, "photo_ids": []}
    expected_hash = hashlib.sha256(
        json.dumps(["publish", old_body], sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    with api["engine"].begin() as db:
        assert db.scalar(text("SELECT fingerprint FROM qadam.livestock_requests")) == expected_hash
        db.execute(text("UPDATE qadam.livestock_requests SET response_json=response_json-'market'"))
    config = Config("alembic.ini")
    command.downgrade(config, "0004_livestock")
    try:
        with api["engine"].connect() as db:
            before = db.execute(text("SELECT * FROM qadam.livestock_listings")).mappings().one()
            assert "market" not in before
        command.upgrade(config, "0005_livestock_market")
        with api["engine"].connect() as db:
            after = dict(
                db.execute(text("SELECT * FROM qadam.livestock_listings")).mappings().one()
            )
            assert after.pop("market") is None and after.pop("market_key") is None
            assert after == dict(before)
            assert db.scalar(text("SELECT count(*) FROM qadam.livestock_requests")) == 1
        command.check(config)
        replay = write(api, key=key)
        assert replay.status_code == 200 and replay.json()["id"] == original.json()["id"]
        assert write(api, key=key, body={**BODY, "market": None}).status_code == 409
        listing = publish(api, market="Test Market")
        assert write(api, "put", "/listings/" + listing["id"]).json()["market"] == "Test Market"
        assert (
            write(api, "put", "/listings/" + listing["id"], body={**BODY, "market": None}).json()[
                "market"
            ]
            is None
        )
    finally:
        command.upgrade(config, "head")


def test_minimum_excludes_other_species_demo_and_expired(ledger_api, monkeypatch):
    api = ledger_api
    now = datetime(2026, 10, 16, 18, 59, 59, tzinfo=UTC)
    monkeypatch.setattr(routes, "server_now", lambda db: now)
    api["app"].state.livestock_demo_mode = False
    first = publish(api, market="Test Market", price_per_head_minor=101)
    second = publish(api, market="Test Market", price_per_head_minor=99)
    publish(api, market="Test Market", species="sheep", price_per_head_minor=1)
    api["app"].state.livestock_demo_mode = True
    publish(api, market="Test Market", price_per_head_minor=2)
    params = dict(species="cattle", locality="Taraz", market="test market")
    stats = api["client"].get(BASE + "/prices", params=params).json()
    assert stats["sample_count"] == 2 and stats["min_price_per_head_minor"] == 99
    now += timedelta(seconds=1)  # Midnight Asia/Almaty.
    stats = api["client"].get(BASE + "/prices", params=params).json()
    assert stats["sample_count"] == 0 and stats["min_price_per_head_minor"] is None
    write(api, path=f"/listings/{first['id']}/actions", body={"action": "confirm_today"})
    stats = api["client"].get(BASE + "/prices", params=params).json()
    assert stats["min_price_per_head_minor"] == 101 and stats["sample_count"] == 1
    assert second["id"] != first["id"]
