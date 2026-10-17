from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest

pytestmark = pytest.mark.postgres


def payload():
    return dict(
        client_request_id=str(uuid4()),
        visitor_name="Demo visitor",
        contact="@demo_contact",
        message="Demo inquiry",
    )


def test_public_projection_filters_and_catalog(ledger_api):
    c = ledger_api["client"]
    venues = c.get("/api/v1/venues").json()
    assert len(venues["items"]) == 3
    page = c.get(
        "/api/v1/businesses", params={"venue_id": venues["items"][0]["id"], "limit": 2}
    ).json()
    assert len(page["items"]) == 2 and page["next_cursor"]
    following = c.get(
        "/api/v1/businesses",
        params={"venue_id": venues["items"][0]["id"], "limit": 2, "cursor": page["next_cursor"]},
    ).json()
    assert len(following["items"]) == 1
    shop = c.get("/api/v1/businesses/mart-demo-clothes").json()
    assert set(shop) == {
        "id",
        "venue_id",
        "slug",
        "name",
        "category",
        "description",
        "is_demo",
        "catalog",
        "name_i18n",
        "description_i18n",
    }
    assert len(shop["catalog"]) == 1
    assert "price_minor" in shop["catalog"][0]
    assert c.get("/api/v1/businesses", params={"q": "%"}).json()["items"] == []


def test_inquiry_replay_scope_summary_and_status(ledger_api):
    a = ledger_api
    c = a["client"]
    path = f"/api/v1/businesses/{a['business']}/inquiries"
    summary = f"/api/v1/businesses/{a['business']}/summary"
    before = c.get(summary, headers=a["a"]).json()
    body = payload()
    with ThreadPoolExecutor(2) as pool:
        replies = list(pool.map(lambda _: c.post(path, json=body), range(2)))
    assert all(r.status_code == 200 for r in replies)
    assert replies[0].json() == replies[1].json()
    receipt = replies[0].json()
    assert set(receipt) == {"id", "created_at"}
    assert c.post(path, json={**body, "message": "different"}).status_code == 409
    assert c.get(path).status_code == 401
    assert c.get(path, headers=a["b"]).status_code == 404
    rows = c.get(path, headers=a["a"]).json()["items"]
    assert len(rows) == 1 and rows[0]["contact"] == body["contact"]
    patch = path + "/" + receipt["id"]
    assert c.patch(patch, headers=a["b"], json={"status": "closed"}).status_code == 404
    assert c.patch(patch, headers=a["a"], json={"status": "closed"}).json()["status"] == "closed"
    wrong = f"/api/v1/businesses/{a['other']}/inquiries/{receipt['id']}"
    assert c.patch(wrong, headers=a["b"], json={"status": "new"}).status_code == 404
    assert c.patch(patch, headers=a["a"], json={"status": "paid"}).status_code == 422
    assert c.post(path, json=body).json() == receipt
    after = c.get(summary, headers=a["a"]).json()
    assert after["new_inquiries_count"] == before["new_inquiries_count"] + 1
    for key in ("sales_minor", "receipts_minor", "outstanding_minor"):
        assert after[key] == before[key]


def test_inquiry_limit_and_validation(ledger_api):
    c = ledger_api["client"]
    path = f"/api/v1/businesses/{ledger_api['business']}/inquiries"
    body = payload()
    for _ in range(20):
        assert c.post(path, json={**body, "client_request_id": str(uuid4())}).status_code == 200
    assert c.post(path, json=body).status_code == 429
    assert c.post(path, json={**body, "visitor_name": " "}).status_code == 422
    assert c.post(path, json={**body, "contact": "x" * 201}).status_code == 422
