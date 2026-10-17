from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import Session

from app.models import Customer, Membership
from app.seed import demo_id

pytestmark = pytest.mark.postgres


def lookup(api, ids, *, business=None, headers=None, extra=()):
    return api["client"].get(
        f"/api/v1/businesses/{business or api['business']}/customers",
        params=[*(("ids", str(value)) for value in ids), *extra],
        headers=api["a"] if headers is None else headers,
    )


def test_ids_skip_missing_and_foreign_even_other_business_of_same_owner(ledger_api):
    api = ledger_api
    second_id = uuid4()
    with Session(api["engine"]) as db, db.begin():
        db.add(Customer(id=second_id, business_id=api["business"], display_name="Учебный второй"))
    requested = [
        second_id,
        api["other_customer"],
        uuid4(),
        api["customer"],
        str(second_id).upper(),
        demo_id("mart-demo-food-customer"),  # A also owns this point; still not the selected one.
        api["customer"],
    ]
    response = lookup(api, requested)
    assert response.status_code == 200
    page = response.json()
    assert set(page) == {"items", "next_cursor"}
    assert page["next_cursor"] is None
    assert [row["id"] for row in page["items"]] == [str(second_id), str(api["customer"])]
    for row in page["items"]:
        assert row["business_id"] == str(api["business"])
        assert row["balance_minor"] == 0
        assert set(row) == {"id", "business_id", "display_name", "note", "contact", "balance_minor"}
    missing = lookup(api, [uuid4()]).json()
    foreign = lookup(api, [api["other_customer"]]).json()
    assert missing == foreign == {"items": [], "next_cursor": None}


def test_full_hundred_ids_include_customers_beyond_legacy_first_page(ledger_api):
    api = ledger_api
    ids = [UUID(int=i) for i in range(1, 101)]
    with Session(api["engine"]) as db, db.begin():
        db.add_all(
            Customer(id=value, business_id=api["business"], display_name=f"Учебный {i}")
            for i, value in enumerate(ids)
        )
    path = f"/api/v1/businesses/{api['business']}/customers"
    old = api["client"].get(path, headers=api["a"]).json()
    assert len(old["items"]) == 50 and old["next_cursor"] is not None
    assert str(ids[-1]) not in {row["id"] for row in old["items"]}
    response = lookup(api, list(reversed(ids)))
    assert response.status_code == 200
    assert [row["id"] for row in response.json()["items"]] == [str(i) for i in reversed(ids)]
    assert response.json()["next_cursor"] is None


@pytest.mark.parametrize("unique", [False, True])
def test_limit_applies_before_deduplication(ledger_api, unique):
    api = ledger_api
    ids = [uuid4() for _ in range(101)] if unique else [api["customer"]] * 101
    result = lookup(api, ids)
    assert result.status_code == 422
    assert result.json()["error"]["code"] == "VALIDATION_ERROR"
    valid = lookup(api, [api["customer"]] * 100)
    assert valid.status_code == 200
    assert [row["id"] for row in valid.json()["items"]] == [str(api["customer"])]


@pytest.mark.parametrize("value", ["", "not-a-uuid", "[]", "null", "a,b"])
def test_invalid_or_empty_ids_are_not_a_fallback_to_full_list(ledger_api, value):
    response = lookup(ledger_api, [ledger_api["customer"], value])
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "items" not in response.json()


def test_bare_and_empty_ids_return_422(ledger_api):
    api = ledger_api
    for suffix in ("?ids", "?ids="):
        response = api["client"].get(
            f"/api/v1/businesses/{api['business']}/customers{suffix}", headers=api["a"]
        )
        assert response.status_code == 422


@pytest.mark.parametrize(
    "name,value",
    [
        ("q", ""),
        ("q", "Асқар"),
        ("cursor", ""),
        ("cursor", str(uuid4())),
        ("limit", "50"),
        ("limit", "100"),
    ],
)
def test_ids_reject_explicit_search_and_pagination(ledger_api, name, value):
    response = lookup(ledger_api, [ledger_api["customer"]], extra=[(name, value)])
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_membership_is_required_and_revocation_takes_effect(ledger_api):
    api = ledger_api
    assert lookup(api, [api["customer"]], headers={}).status_code == 401
    assert lookup(api, [api["customer"]], headers=api["b"]).status_code == 404
    assert lookup(api, [api["other_customer"]], business=api["other"]).status_code == 404
    assert lookup(api, [api["customer"]], business=uuid4()).status_code == 404
    with Session(api["engine"]) as db, db.begin():
        db.delete(db.get(Membership, (api["owner_a"], api["business"])))
    assert lookup(api, [api["customer"]]).status_code == 404


def test_balances_follow_server_journal_and_reversals(ledger_api):
    api = ledger_api
    base = f"/api/v1/businesses/{api['business']}/operations"

    def post(payload):
        response = api["client"].post(
            base, json=payload, headers={**api["a"], "Idempotency-Key": str(uuid4())}
        )
        assert response.status_code == 200
        return response.json()["operation"]["id"]

    sale = post(
        {
            "kind": "sale",
            "customer_id": str(api["customer"]),
            "description": "Учебная",
            "total_minor": 300000,
            "received_minor": 100000,
        }
    )
    assert lookup(api, [api["customer"]]).json()["items"][0]["balance_minor"] == 200000
    payment = post(
        {
            "kind": "repayment",
            "sale_id": sale,
            "description": "Учебная доплата",
            "amount_minor": 50000,
        }
    )
    assert lookup(api, [api["customer"]]).json()["items"][0]["balance_minor"] == 150000
    for operation, expected in [(payment, 200000), (sale, 0)]:
        result = api["client"].post(
            f"{base}/{operation}/reverse",
            json={"description": "Учебная отмена"},
            headers={**api["a"], "Idempotency-Key": str(uuid4())},
        )
        assert result.status_code == 200
        assert lookup(api, [api["customer"]]).json()["items"][0]["balance_minor"] == expected


def test_without_ids_retains_search_cursor_and_limit(ledger_api):
    api = ledger_api
    ids = [UUID(int=i) for i in range(1, 4)]
    with Session(api["engine"]) as db, db.begin():
        db.add_all(
            Customer(id=value, business_id=api["business"], display_name="Учебный %")
            for value in ids
        )
    path = f"/api/v1/businesses/{api['business']}/customers"
    params = {"q": "%", "limit": 2}
    first = api["client"].get(path, params=params, headers=api["a"])
    assert first.status_code == 200
    assert [row["id"] for row in first.json()["items"]] == [str(i) for i in ids[:2]]
    assert first.json()["next_cursor"] == str(ids[1])
    second = api["client"].get(
        path, params={**params, "cursor": first.json()["next_cursor"]}, headers=api["a"]
    )
    assert second.status_code == 200
    assert [row["id"] for row in second.json()["items"]] == [str(ids[2])]
    assert second.json()["next_cursor"] is None
