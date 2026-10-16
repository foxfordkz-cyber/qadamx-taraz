"""Real PostgreSQL, locally signed JWTs and in-memory Storage adapter (never live Storage)."""

import io
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from PIL import Image
from sqlalchemy import event, func, select, text
from sqlalchemy.orm import Session

from app import livestock_routes as routes
from app.errors import APIError
from app.models import LivestockListing, LivestockPhoto, LivestockRequest, Operation
from app.services.photos import MAX_UPLOAD, clean_image

BASE = "/api/v1/livestock"
BODY = dict(
    species="cattle",
    quantity=2,
    price_per_head_minor=35000000,
    locality="Taraz",
    contact="@synthetic_test",
    contact_consent=True,
)


def write(api, method="post", path="/listings", body=None, who="a", key=None):
    return getattr(api["client"], method)(
        BASE + path,
        json=BODY if body is None else body,
        headers={**api[who], "Idempotency-Key": str(key or uuid4())},
    )


def publish(api, **changes):
    response = write(api, body={**BODY, **changes})
    assert response.status_code == 200, response.json()
    return response.json()


def test_real_subject_without_shop_membership_and_public_projection(ledger_api, signing):
    api = ledger_api
    outsider = uuid4()
    api["new"] = {"Authorization": "Bearer " + signing[1](outsider)}
    response = write(api, who="new")
    assert response.status_code == 200
    item = response.json()
    assert item["available_today"] and item["is_demo"]
    assert api["client"].get("/api/v1/me", headers=api["new"]).json()["businesses"] == []
    detail = api["client"].get(BASE + "/listings/" + item["id"]).json()
    assert detail["contact"] == BODY["contact"]
    assert (
        not {"owner_id", "business_id", "memberships", "status", "contact_consent"} & detail.keys()
    )
    assert api["client"].get(BASE + "/me/listings", headers=api["a"]).json()["items"] == []
    assert write(api, "put", "/listings/" + item["id"]).status_code == 404
    assert (
        write(api, path=f"/listings/{item['id']}/actions", body={"action": "sell"}).status_code
        == 404
    )
    assert api["client"].post(BASE + "/listings", json=BODY).status_code == 401
    with Session(api["engine"]) as db:
        assert db.get(LivestockListing, UUID(item["id"])).owner_id == outsider
        assert db.scalar(select(func.count()).select_from(Operation)) == 0


def test_concurrent_publication_replay_and_mutation(ledger_api):
    api, key = ledger_api, uuid4()
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(lambda _: write(api, key=key), range(4)))
    assert [r.status_code for r in responses] == [200] * 4
    assert all(r.json() == responses[0].json() for r in responses)
    item = responses[0].json()
    assert write(api, key=key, body={**BODY, "quantity": 3}).status_code == 409
    # Same key is independent for B, never returns A's private snapshot.
    assert write(api, key=key, who="b").json()["id"] != item["id"]
    path = f"/listings/{item['id']}/actions"
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(lambda a: write(api, path=path, body={"action": a}), ["sell", "withdraw"])
        )
    assert sorted(r.status_code for r in results) == [200, 409]
    assert api["client"].get(BASE + "/listings/" + item["id"]).status_code == 404
    assert write(api, key=key).json() == item  # Original response, not a new publication.
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(LivestockListing)) == 2


def test_atomic_rollback_before_idempotency_commit(ledger_api):
    api, key = ledger_api, uuid4()

    def fail(session):
        if any(isinstance(row, LivestockRequest) for row in session.new):
            raise APIError(503, "DATABASE_UNAVAILABLE", "Injected commit failure")

    event.listen(Session, "before_commit", fail)
    try:
        assert write(api, key=key).status_code == 503
    finally:
        event.remove(Session, "before_commit", fail)
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(LivestockListing)) == 0
        assert db.scalar(select(func.count()).select_from(LivestockRequest)) == 0
    assert write(api, key=key).status_code == 200


@pytest.mark.parametrize("terminal", ["sell", "withdraw"])
def test_almaty_midnight_expiry_reconfirmation_and_terminal_states(
    ledger_api, monkeypatch, terminal
):
    api = ledger_api
    now = datetime(2026, 10, 15, 18, 59, 59, tzinfo=UTC)  # Almaty UTC+5, 23:59:59.
    monkeypatch.setattr(routes, "server_now", lambda db: now)
    row = publish(api)
    assert row["confirmed_on"] == "2026-10-15"
    path = f"/listings/{row['id']}/actions"
    key = uuid4()
    assert write(api, path=path, body={"action": "confirm_today"}, key=key).status_code == 200
    now += timedelta(seconds=1)
    assert api["client"].get(BASE + "/listings").json()["items"] == []
    assert api["client"].get(BASE + "/listings/" + row["id"]).status_code == 404
    assert (
        not api["client"]
        .get(BASE + "/me/listings", headers=api["a"])
        .json()["items"][0]["available_today"]
    )
    assert not write(api, "put", "/listings/" + row["id"]).json()["available_today"]
    assert (
        write(api, path=path, body={"action": "confirm_today"}, key=key).json()["confirmed_on"]
        == "2026-10-15"
    )
    refreshed = write(api, path=path, body={"action": "confirm_today"}).json()
    assert refreshed["id"] == row["id"] and refreshed["confirmed_on"] == "2026-10-16"
    assert write(api, path=path, body={"action": terminal}).status_code == 200
    assert write(api, path=path, body={"action": terminal}).status_code == 200
    now += timedelta(days=1)
    assert write(api, path=path, body={"action": "confirm_today"}).status_code == 409
    assert api["client"].get(BASE + "/listings").json()["items"] == []


def test_filters_pagination_and_actual_asking_price_median(ledger_api, monkeypatch):
    api = ledger_api
    api["app"].state.livestock_demo_mode = False
    now = datetime(2026, 10, 16, 6, tzinfo=UTC)
    monkeypatch.setattr(routes, "server_now", lambda db: now)
    endpoint = BASE + "/prices?species=cattle&locality=%20TARAZ%20"
    for price in [100, 200, 301, 400]:
        publish(api, price_per_head_minor=price, locality="  Taraz   ")
    stats = api["client"].get(endpoint).json()
    assert stats["sample_count"] == 4 and stats["median_price_per_head_minor"] is None
    publish(api, price_per_head_minor=10000)
    assert api["client"].get(endpoint).json()["median_price_per_head_minor"] == 301
    publish(api, price_per_head_minor=500, quantity=10000)
    stats = api["client"].get(endpoint).json()
    assert stats["sample_count"] == 6 and stats["median_price_per_head_minor"] == 351
    assert stats["source"] == "asking_prices" and stats["period_from"] == "2026-10-16"
    publish(api, species="sheep")
    publish(api, locality="Other")
    api["app"].state.livestock_demo_mode = True
    publish(api, price_per_head_minor=90000000)
    assert api["client"].get(endpoint).json() == stats
    prefix = BASE + "/listings?species=cattle&locality=taraz&limit=2"
    ids, cursor = [], None
    while True:
        response = api["client"].get(prefix + ("&cursor=" + cursor if cursor else ""))
        assert response.status_code == 200, response.json()
        data = response.json()
        ids.extend(item["id"] for item in data["items"])
        cursor = data["next_cursor"]
        if not cursor:
            break
    assert len(ids) == len(set(ids)) == 7
    assert api["client"].get(BASE + "/listings?limit=101").status_code == 422
    assert api["client"].get(BASE + "/prices?species=cattle&locality=%20%20").status_code == 422
    now += timedelta(days=1)
    assert api["client"].get(endpoint).json()["sample_count"] == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"quantity": 0},
        {"quantity": True},
        {"quantity": 2.5},
        {"price_per_head_minor": "10"},
        {"price_per_head_minor": 0},
        {"price_per_head_minor": 10000000001},
        {"species": "dragon"},
        {"age_months": -1},
        {"sex": "other"},
        {"locality": "   "},
        {"contact_consent": False},
        {"contact_consent": 1},
        {"contact": " "},
        {"owner_id": str(uuid4())},
        {"is_demo": False},
        {"confirmed_on": "2026-10-16"},
        {"photo_ids": [str(uuid4()) for _ in range(4)]},
    ],
)
def test_invalid_publication(ledger_api, changes):
    assert write(ledger_api, body={**BODY, **changes}).status_code == 422


class MemoryStorage:
    def __init__(self):
        self.objects = {}

    def put(self, key, data):
        self.objects[key] = data

    def get(self, key):
        return self.objects[key]


def jpeg():
    output = io.BytesIO()
    exif = Image.Exif()
    exif[0x010E] = "PRIVATE location metadata"
    exif[0x0112] = 6
    Image.new("RGB", (30, 20), "red").save(output, "JPEG", exif=exif)
    return output.getvalue()


def upload(api, raw=None, who="a", key=None):
    return api["client"].post(
        BASE + "/photos",
        files={
            "file": ("untrusted-name.svg", jpeg() if raw is None else raw, "text/html"),
        },
        headers={**api[who], "Idempotency-Key": str(key or uuid4())},
    )


def test_photo_owner_replay_validation_publication_reorder_and_expiry(ledger_api, monkeypatch):
    api, store = ledger_api, MemoryStorage()
    api["app"].state.photos = store
    now = datetime(2026, 10, 16, 6, tzinfo=UTC)
    monkeypatch.setattr(routes, "server_now", lambda db: now)
    key = uuid4()
    result = upload(api, key=key)
    assert result.status_code == 200, result.json()
    id = result.json()["id"]
    assert upload(api, key=key).json() == result.json() and len(store.objects) == 1
    assert upload(api, raw=b"different", key=key).status_code == 409
    data = next(iter(store.objects.values()))
    with Image.open(io.BytesIO(data)) as image:
        assert image.format == "JPEG" and image.size == (20, 30) and not image.getexif()
        assert b"PRIVATE" not in data
    assert api["client"].get(BASE + "/me/photos/" + id, headers=api["b"]).status_code == 404
    assert write(api, body={**BODY, "photo_ids": [id]}, who="b").status_code == 422
    assert write(api, body={**BODY, "photo_ids": [str(uuid4())]}).status_code == 422
    assert write(api, body={**BODY, "photo_ids": [id, id]}).status_code == 422
    ids = [id, upload(api).json()["id"], upload(api).json()["id"]]
    row = publish(api, photo_ids=ids)
    assert len(row["photos"]) == 3
    assert write(api, body={**BODY, "photo_ids": [id]}).status_code == 409
    public = api["client"].get(row["photos"][0]["url"])
    assert public.status_code == 200 and public.content == data
    assert public.headers["cache-control"] == "no-store"
    changed = write(api, "put", "/listings/" + row["id"], {**BODY, "photo_ids": ids[::-1]}).json()
    assert [p["id"] for p in changed["photos"]] == ids[::-1]
    assert api["client"].get(BASE + f"/listings/{uuid4()}/photos/{id}").status_code == 404
    now += timedelta(days=1)
    assert api["client"].get(row["photos"][0]["url"]).status_code == 404
    assert api["client"].get(BASE + "/me/photos/" + id, headers=api["a"]).status_code == 200
    assert write(api, "put", "/listings/" + row["id"]).json()["photos"] == []
    with Session(api["engine"]) as db:
        assert db.get(LivestockPhoto, UUID(id)).listing_id is None


def test_storage_failure_and_no_storage_manual_publication(ledger_api):
    api = ledger_api
    key = uuid4()
    assert upload(api, key=key).status_code == 503
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(LivestockPhoto)) == 0
        assert db.scalar(select(func.count()).select_from(LivestockRequest)) == 0
    api["app"].state.photos = MemoryStorage()
    assert upload(api, key=key).status_code == 200
    assert publish(api)["photos"] == []


@pytest.mark.parametrize(
    "raw", [b"<svg><script/></svg>", b"", b"x" * (MAX_UPLOAD + 1)], ids=["svg", "empty", "oversize"]
)
def test_real_image_validation(raw):
    with pytest.raises(APIError) as error:
        clean_image(raw)
    assert error.value.code == "INVALID_PHOTO"


def test_animation_and_pixel_limit():
    output = io.BytesIO()
    Image.new("RGB", (3, 3), "red").save(
        output,
        "PNG",
        save_all=True,
        append_images=[Image.new("RGB", (3, 3), "blue")],
        duration=10,
        loop=0,
    )
    with pytest.raises(APIError):
        clean_image(output.getvalue())
    output = io.BytesIO()
    Image.new("RGB", (5000, 4001)).save(output, "PNG")
    with pytest.raises(APIError):
        clean_image(output.getvalue())


def test_photo_size_and_concurrent_retry(ledger_api):
    api = ledger_api
    store = MemoryStorage()
    api["app"].state.photos = store
    assert upload(api, raw=b"x" * (MAX_UPLOAD + 1)).status_code == 422
    response = upload(api, raw=b"x" * (MAX_UPLOAD + 65537))
    assert response.status_code == 413, response.json()
    assert response.json()["error"]["code"] == "PHOTO_TOO_LARGE"
    key = uuid4()
    with ThreadPoolExecutor(max_workers=3) as pool:
        responses = list(pool.map(lambda _: upload(api, key=key), range(3)))
    assert all(r.status_code == 200 for r in responses)
    assert all(r.json() == responses[0].json() for r in responses)
    assert len(store.objects) == 1


def test_photo_private_orphan_after_commit_failure_is_retryable(ledger_api):
    api = ledger_api
    api["app"].state.photos = store = MemoryStorage()
    key = uuid4()

    def fail(session):
        if any(isinstance(row, LivestockPhoto) for row in session.new):
            raise APIError(503, "DATABASE_UNAVAILABLE", "Injected commit failure")

    event.listen(Session, "before_commit", fail)
    try:
        assert upload(api, key=key).status_code == 503
    finally:
        event.remove(Session, "before_commit", fail)
    assert len(store.objects) == 1
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(LivestockPhoto)) == 0
        assert db.scalar(select(func.count()).select_from(LivestockRequest)) == 0
    assert upload(api, key=key).status_code == 200
    assert len(store.objects) == 1


def test_unattached_photo_quota_and_idempotent_exception(ledger_api):
    api = ledger_api
    api["app"].state.photos = MemoryStorage()
    key = uuid4()
    prior = upload(api, key=key)
    with Session(api["engine"]) as db, db.begin():
        for _ in range(29):
            id = uuid4()
            db.add(
                LivestockPhoto(
                    id=id,
                    owner_id=api["owner_a"],
                    object_key=f"test/{id}.jpg",
                    created_at=datetime.now(UTC),
                )
            )
    assert upload(api).status_code == 429
    assert upload(api, key=key).json() == prior.json()


def test_tables_closed_to_client_roles(ledger_api):
    with ledger_api["engine"].connect() as conn:
        rows = conn.execute(
            text("""
          SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='qadam' AND relname IN
          ('livestock_listings','livestock_photos','livestock_requests')
        """)
        ).all()
        assert len(rows) == 3 and all(row.relrowsecurity for row in rows)
        for role in ("anon", "authenticated"):
            if conn.scalar(text("SELECT 1 FROM pg_roles WHERE rolname=:role"), {"role": role}):
                for table, _ in rows:
                    for privilege in ("SELECT", "INSERT", "UPDATE", "DELETE"):
                        assert not conn.scalar(
                            text("SELECT has_table_privilege(:role,:table,:privilege)"),
                            dict(role=role, table="qadam." + table, privilege=privilege),
                        )
