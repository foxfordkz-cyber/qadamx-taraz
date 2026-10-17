import hashlib
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app import livestock_routes as routes
from app.models import LivestockListing, LivestockMarket, LivestockPhoto, LivestockRequest
from tests.test_livestock import BASE, BODY, publish, write

pytestmark = pytest.mark.postgres


def registry(api, status="verified", key=None):
    with Session(api["engine"]) as db, db.begin():
        row = LivestockMarket(
            key=key or "synthetic-" + str(uuid4()),
            name="Synthetic market",
            name_i18n={"kk": "Оқу нарығы"},
            locality="Taraz",
            verification_status=status,
            verified_at=datetime.now(UTC) if status == "verified" else None,
            verification_note="Test evidence, not a real market",
        )
        db.add(row)
        db.flush()
        return row.id


def price(api, id, **extra):
    return api["client"].get(
        BASE + "/prices",
        params={"species": "cattle", "locality": "Taraz", "market_id": str(id), **extra},
    )


def test_registry_empty_verified_status_language_pagination_privacy(ledger_api):
    a = ledger_api
    assert a["client"].get(BASE + "/markets").json() == {"items": [], "next_cursor": None}
    first, second, unverified = registry(a), registry(a), registry(a, "unverified")
    c = a["client"]
    page = c.get(BASE + "/markets?limit=1&lang=kk").json()
    assert len(page["items"]) == 1 and page["items"][0]["name"] == "Оқу нарығы"
    next_page = c.get(BASE + "/markets", params={"limit": 1, "cursor": page["next_cursor"]}).json()
    assert {page["items"][0]["id"], next_page["items"][0]["id"]} == {str(first), str(second)}
    assert next_page["next_cursor"] is None
    detail = c.get(BASE + f"/markets/{unverified}").json()
    assert detail["name"] == "Synthetic market" and detail["accepts_listings"] is False
    assert set(detail) == {
        "id",
        "key",
        "name",
        "name_i18n",
        "locality",
        "verification_status",
        "verified_at",
        "accepts_listings",
    }
    assert c.get(BASE + "/markets?status=unverified").json()["items"][0]["id"] == str(unverified)
    assert c.get(BASE + "/markets?status=anything").status_code == 422
    assert c.get(BASE + "/markets?lang=kz").status_code == 422
    assert c.get(BASE + f"/markets/{uuid4()}").status_code == 404


def test_explicit_market_scope_unknowns_legacy_and_owner(ledger_api):
    a = ledger_api
    one, two, unverified = registry(a), registry(a), registry(a, "unverified")
    legacy = publish(a, market="Synthetic market")
    linked = [publish(a, market_id=str(one)) for _ in range(3)]
    publish(a, market_id=str(two))
    c = a["client"]
    path = BASE + "/listings"
    page = c.get(path, params={"market_id": str(one), "limit": 2}).json()
    following = c.get(
        path, params={"market_id": str(one), "limit": 2, "cursor": page["next_cursor"]}
    ).json()
    assert {v["id"] for v in page["items"] + following["items"]} == {v["id"] for v in linked}
    assert following["next_cursor"] is None
    assert legacy["market_id"] is None
    assert len(c.get(path, params={"market": "synthetic market"}).json()["items"]) == 1
    assert c.get(path, params={"market_id": str(unverified)}).json() == {
        "items": [],
        "next_cursor": None,
    }
    for endpoint in ["/listings", "/me/listings", "/prices"]:
        params = {"market_id": str(uuid4()), "species": "cattle", "locality": "Taraz"}
        assert c.get(BASE + endpoint, params=params, headers=a["a"]).status_code == 404
        params["market_id"] = "invalid"
        assert c.get(BASE + endpoint, params=params, headers=a["a"]).status_code == 422
        params.update(market_id=str(one), market="Synthetic market")
        assert c.get(BASE + endpoint, params=params, headers=a["a"]).status_code == 422
    assert write(a, body={**BODY, "market_id": str(unverified)}).status_code == 422
    assert write(a, body={**BODY, "market_id": str(uuid4())}).status_code == 404
    assert (
        c.get(BASE + "/me/listings", params={"market_id": str(one)}, headers=a["b"]).json()["items"]
        == []
    )
    assert (
        write(
            a,
            "put",
            "/listings/" + linked[0]["id"],
            body={**BODY, "market_id": str(uuid4())},
            who="b",
        ).status_code
        == 404
    )
    # Old client PUT cannot silently remove canonical binding.
    changed = write(a, "put", "/listings/" + linked[0]["id"], body=BODY)
    assert changed.status_code == 200 and changed.json()["market_id"] == str(one)
    cleared = write(a, "put", "/listings/" + linked[0]["id"], body={**BODY, "market_id": None})
    assert cleared.json()["market_id"] is None


def test_market_visibility_prices_photos_and_local_day(ledger_api, monkeypatch):
    a = ledger_api
    id, other, unverified = registry(a), registry(a), registry(a, "unverified")
    # Server local midnight: 19:00 UTC starts the next day in Asia/Almaty.
    fixed = datetime(2026, 10, 17, 18, 59, 59, tzinfo=UTC)
    monkeypatch.setattr(routes, "server_now", lambda db: fixed)
    live = publish(a, market_id=str(id), price_per_head_minor=12345)
    demo = publish(a, market_id=str(id), price_per_head_minor=1)
    publish(a, market_id=str(other), price_per_head_minor=2)
    photo_id = uuid4()
    with Session(a["engine"]) as db, db.begin():
        db.get(LivestockListing, UUID(live["id"])).is_demo = False
        db.add(
            LivestockPhoto(
                id=photo_id,
                owner_id=a["owner_a"],
                listing_id=UUID(live["id"]),
                position=0,
                object_key="synthetic/test.jpg",
                created_at=fixed,
            )
        )

    class Photos:
        def get(self, key):
            return b"synthetic-photo"

    a["app"].state.photos = Photos()
    stats = price(a, id).json()
    assert stats["sample_count"] == 1 and stats["min_price_per_head_minor"] == 12345
    assert stats["median_price_per_head_minor"] is None and stats["source"] == "asking_prices"
    assert stats["market_id"] == str(id) and stats["currency"] == "KZT"
    assert price(a, unverified).json()["min_price_per_head_minor"] is None
    photo = BASE + f"/listings/{live['id']}/photos/{photo_id}"
    assert a["client"].get(photo).status_code == 200
    fixed += timedelta(seconds=1)
    assert price(a, id).json()["sample_count"] == 0
    assert price(a, id).json()["min_price_per_head_minor"] is None
    assert a["client"].get(photo).status_code == 404
    write(a, path=f"/listings/{live['id']}/actions", body={"action": "confirm_today"})
    assert price(a, id).json()["sample_count"] == 1
    with Session(a["engine"]) as db, db.begin():
        db.get(LivestockMarket, id).verification_status = "retired"
    assert price(a, id).json()["min_price_per_head_minor"] is None
    assert a["client"].get(BASE + "/listings/" + live["id"]).status_code == 404
    assert a["client"].get(photo).status_code == 404
    own = (
        a["client"].get(BASE + "/me/listings", params={"market_id": str(id)}, headers=a["a"]).json()
    )
    assert {v["id"] for v in own["items"]} == {live["id"], demo["id"]}
    assert all(not v["available_today"] for v in own["items"])
    assert a["client"].get(BASE + f"/me/photos/{photo_id}", headers=a["a"]).status_code == 200
    assert a["client"].get(BASE + f"/me/photos/{photo_id}", headers=a["b"]).status_code == 404


def test_historical_replay_hash_and_no_implicit_link(ledger_api):
    a = ledger_api
    key = uuid4()
    response = write(a, key=key)
    assert response.status_code == 200
    from app.livestock_schemas import ListingWrite

    old_body = ListingWrite(**BODY).model_dump(mode="json", exclude={"market", "market_id"})
    expected = hashlib.sha256(
        json.dumps(
            ["publish", old_body], sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode()
    ).hexdigest()
    with Session(a["engine"]) as db, db.begin():
        saved = db.get(LivestockRequest, (a["owner_a"], key))
        assert saved.fingerprint == expected
        saved.response_json = {k: v for k, v in saved.response_json.items() if k != "market_id"}
    assert write(a, key=key).json() == response.json()
    assert write(a, key=key, body={**BODY, "market_id": None}).status_code == 409
    with Session(a["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(LivestockListing)) == 1


def test_0008_additive_preserves_legacy_listings_and_registry_rls(ledger_api):
    from alembic import command
    from alembic.config import Config

    a = ledger_api
    publish(a, market="Never auto match")
    config = Config("alembic.ini")
    command.downgrade(config, "0007_public_i18n")
    try:
        with a["engine"].connect() as db:
            before = db.execute(
                text(
                    "SELECT id,owner_id,market,market_key,price_per_head_minor "
                    "FROM qadam.livestock_listings ORDER BY id"
                )
            ).all()
        command.upgrade(config, "head")
        command.check(config)
        with a["engine"].connect() as db:
            assert (
                db.execute(
                    text(
                        "SELECT id,owner_id,market,market_key,price_per_head_minor "
                        "FROM qadam.livestock_listings ORDER BY id"
                    )
                ).all()
                == before
            )
            assert db.scalar(text("SELECT count(*) FROM qadam.livestock_markets")) == 0
            assert (
                db.scalar(
                    text(
                        "SELECT count(*) FROM qadam.livestock_listings WHERE market_id IS NOT NULL"
                    )
                )
                == 0
            )
            assert db.scalar(
                text(
                    "SELECT relrowsecurity FROM pg_class "
                    "WHERE oid='qadam.livestock_markets'::regclass"
                )
            )
    finally:
        command.upgrade(config, "head")


@pytest.mark.parametrize(
    "change",
    [
        {"verification_note": " "},
        {"verified_at": None},
        {"verification_status": "invented"},
        {"key": "Not a stable key"},
    ],
)
def test_registry_rejects_invalid_evidence_or_identifiers(ledger_api, change):
    from sqlalchemy.exc import IntegrityError

    id = registry(ledger_api)
    with Session(ledger_api["engine"]) as db:
        row = db.get(LivestockMarket, id)
        for field, value in change.items():
            setattr(row, field, value)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_canonical_price_sample_and_combined_filters(ledger_api):
    a = ledger_api
    market, other = registry(a), registry(a)
    selected = [
        publish(a, market_id=str(market), price_per_head_minor=value)
        for value in [100, 200, 300, 400, 500, 601]
    ]
    excluded = [
        publish(a, market_id=str(other), price_per_head_minor=1),
        publish(a, market_id=str(market), species="sheep", price_per_head_minor=2),
        publish(a, market_id=str(market), locality="Other", price_per_head_minor=3),
        publish(a, market_id=str(market), price_per_head_minor=4),
    ]
    with Session(a["engine"]) as db, db.begin():
        for item in selected + excluded:
            db.get(LivestockListing, UUID(item["id"])).is_demo = False
        db.get(LivestockListing, UUID(excluded[-1]["id"])).status = "sold"
    result = price(a, market).json()
    assert result["sample_count"] == 6
    assert result["min_price_per_head_minor"] == 100
    assert result["median_price_per_head_minor"] == 350
    assert result["status"] == "available"


def test_canonical_binding_atomic_replay_and_conflict(ledger_api):
    from concurrent.futures import ThreadPoolExecutor

    a = ledger_api
    market, other = registry(a), registry(a)
    key = uuid4()
    body = {**BODY, "market_id": str(market)}
    with ThreadPoolExecutor(max_workers=2) as pool:
        replies = list(pool.map(lambda _: write(a, body=body, key=key), range(2)))
    assert [reply.status_code for reply in replies] == [200, 200]
    assert replies[0].json() == replies[1].json()
    assert write(a, body={**BODY, "market_id": str(other)}, key=key).status_code == 409
    with Session(a["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(LivestockListing)) == 1
