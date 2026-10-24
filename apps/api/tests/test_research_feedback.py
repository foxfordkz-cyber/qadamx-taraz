from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models import Membership, Operation, ResearchFeedback

pytestmark = pytest.mark.postgres


def body(**changes):
    return dict(
        client_request_id=str(uuid4()),
        language="kk",
        consent=True,
        features_used=["sales", "debts"],
        sales_debt_clarity=4,
        forecast_usefulness=None,
        risk_clarity=3,
        improve_first="Қазақша түсіндірме",
        suggestion="",
        follow_up=False,
        **changes,
    )


def path(api):
    return f"/api/v1/businesses/{api['business']}/research/feedback"


def test_persistence_replay_conflict_and_no_money_mutation(ledger_api):
    api, payload = ledger_api, body()
    first = api["client"].post(path(api), headers=api["a"], json=payload)
    assert first.status_code == 201 and first.headers["cache-control"] == "no-store"
    replay = api["client"].post(path(api), headers=api["a"], json=payload)
    assert replay.json() == first.json()
    conflict = api["client"].post(
        path(api), headers=api["a"], json={**payload, "suggestion": "changed"}
    )
    assert conflict.status_code == 409
    assert conflict.headers["cache-control"] == "no-store"
    page = api["client"].get(path(api), headers=api["a"]).json()
    assert page["business_id"] == str(api["business"])
    assert len(page["items"]) == 1 and page["items"][0]["improve_first"] == payload["improve_first"]
    assert "created_by" not in page["items"][0]
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(ResearchFeedback)) == 1
        assert db.scalar(select(func.count()).select_from(Operation)) == 0
        assert db.scalar(
            text(
                "SELECT relrowsecurity FROM pg_class "
                "WHERE oid = 'qadam.research_feedback'::regclass"
            )
        )


@pytest.mark.parametrize(
    "field,value",
    [
        ("consent", False),
        ("consent", 1),
        ("sales_debt_clarity", True),
        ("risk_clarity", 6),
        ("forecast_usefulness", 0),
        ("language", "en"),
        ("features_used", ["sales", "sales"]),
        ("features_used", ["unknown"]),
        ("improve_first", "   "),
        ("improve_first", "𐐀" * 501),
        ("suggestion", "Ә" * 2001),
        ("contact", "not requested"),
    ],
)
def test_validation_no_persistence(ledger_api, field, value):
    api = ledger_api
    response = api["client"].post(path(api), headers=api["a"], json={**body(), field: value})
    assert response.status_code == 422
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(ResearchFeedback)) == 0


def test_unicode_boundaries_and_no_rating_supported(ledger_api):
    api = ledger_api
    payload = {
        **body(),
        "improve_first": "𐐀" * 500,
        "suggestion": "ӘҒҚҢӨҰҮҺІ" * 200,
        "sales_debt_clarity": None,
        "risk_clarity": None,
        "features_used": [],
    }
    assert api["client"].post(path(api), headers=api["a"], json=payload).status_code == 201


def test_auth_tenant_and_same_business_other_author_isolation(ledger_api):
    api = ledger_api
    for method in ("get", "post"):
        kwargs = {"json": body()} if method == "post" else {}
        request = getattr(api["client"], method)
        assert request(path(api), **kwargs).status_code == 401
        assert request(path(api), headers=api["b"], **kwargs).status_code == 404
    api["client"].post(path(api), headers=api["a"], json=body())
    with Session(api["engine"]) as db:
        db.add(Membership(user_id=api["owner_b"], business_id=api["business"], role="owner"))
        db.commit()
    assert api["client"].get(path(api), headers=api["b"]).json()["items"] == []


def test_concurrent_retry_and_pagination(ledger_api):
    api, payload = ledger_api, body()

    def send(_):
        return api["client"].post(path(api), headers=api["a"], json=payload)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(send, range(2)))
    assert [r.status_code for r in responses] == [201, 201]
    assert responses[0].json() == responses[1].json()
    api["client"].post(path(api), headers=api["a"], json=body())
    first = api["client"].get(path(api) + "?limit=1", headers=api["a"]).json()
    second = (
        api["client"]
        .get(path(api) + "?limit=1&cursor=" + first["next_cursor"], headers=api["a"])
        .json()
    )
    assert len(second["items"]) == 1 and second["next_cursor"] is None
    assert second["items"][0]["id"] != first["items"][0]["id"]
