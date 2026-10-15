from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from threading import Barrier
from uuid import uuid4

import pytest
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.models import (
    Business,
    CatalogItem,
    Customer,
    IdempotencyRecord,
    Membership,
    Operation,
    Venue,
)
from app.seed import seed

pytestmark = pytest.mark.postgres


def test_operation_and_idempotency_roll_back_together(ledger_api):
    api = ledger_api

    def fail_on_idempotency(session, flush_context, instances):
        if any(isinstance(row, IdempotencyRecord) for row in session.new):
            raise RuntimeError("Injected failure after journal insert")

    event.listen(Session, "before_flush", fail_on_idempotency)
    try:
        response = post(api, sale(api), "retry-after-failure")
        assert response.status_code == 500
        assert "Injected" not in response.text
    finally:
        event.remove(Session, "before_flush", fail_on_idempotency)
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(Operation)) == 0
        assert session.scalar(select(func.count()).select_from(IdempotencyRecord)) == 0
    assert post(api, sale(api), "retry-after-failure").status_code == 200


def post(api, body, key=None, business=None, headers=None):
    return api["client"].post(
        f"/api/v1/businesses/{business or api['business']}/operations",
        json=body,
        headers={**(headers or api["a"]), "Idempotency-Key": key or str(uuid4())},
    )


def sale(api, **changes):
    return {
        "kind": "sale",
        "draft_id": None,
        "customer_id": str(api["customer"]),
        "description": "Учебная продажа",
        "total_minor": 300000,
        "received_minor": 100000,
        **changes,
    }


def repayment(sale_id, amount=50000):
    return {
        "kind": "repayment",
        "draft_id": None,
        "sale_id": sale_id,
        "description": "Доплата",
        "amount_minor": amount,
    }


def summary(api, day=None):
    return api["client"].get(
        f"/api/v1/businesses/{api['business']}/summary",
        params={"date": day} if day else {},
        headers=api["a"],
    )


def test_sale_repayment_summary_and_retry(ledger_api):
    api = ledger_api
    body = sale(api)
    created = post(api, body, "sale-key")
    assert created.status_code == 200, created.text
    first = created.json()
    assert first["sale_balance_minor"] == first["customer_balance_minor"] == 200000
    paid = post(api, repayment(first["operation"]["id"]), "payment-key")
    assert paid.status_code == 200, paid.text
    assert paid.json()["sale_balance_minor"] == 150000
    assert (
        post(api, body, "sale-key").json() == first
    )  # Original response, even after balance changes.
    assert post(api, repayment(first["operation"]["id"]), "payment-key").json() == paid.json()
    report = summary(api)
    assert report.status_code == 200, report.text
    assert (
        report.json()["sales_minor"],
        report.json()["receipts_minor"],
        report.json()["outstanding_minor"],
    ) == (300000, 150000, 150000)
    assert post(api, sale(api, total_minor=400000), "sale-key").status_code == 409
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(Operation)) == 2
        assert session.scalar(select(func.count()).select_from(IdempotencyRecord)) == 2


def test_concurrent_repayments_do_not_overpay(ledger_api):
    api = ledger_api
    original = post(api, sale(api, received_minor=150000)).json()["operation"]["id"]
    barrier = Barrier(2)

    def pay(index):
        barrier.wait(timeout=10)
        return post(api, repayment(original, 100000), f"parallel-{index}")

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(pay, range(2)))
    assert sorted(r.status_code for r in results) == [200, 409], [r.text for r in results]
    assert (
        next(r for r in results if r.status_code == 409).json()["error"]["code"]
        == "BALANCE_CHANGED"
    )
    assert summary(api).json()["outstanding_minor"] == 50000


def test_concurrent_same_key_creates_one_operation(ledger_api):
    api = ledger_api
    barrier = Barrier(2)

    def create(_):
        barrier.wait(timeout=10)
        return post(api, sale(api), "same-key")

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(create, range(2)))
    assert [r.status_code for r in results] == [200, 200]
    assert results[0].json() == results[1].json()
    assert summary(api).json()["sales_minor"] == 300000


def test_customer_and_sale_tenant_isolation(ledger_api):
    api = ledger_api
    other_sale = post(
        api,
        sale(api, customer_id=str(api["other_customer"])),
        business=api["other"],
        headers=api["b"],
    ).json()["operation"]["id"]
    for suffix in ("customers", "operations", "summary"):
        response = api["client"].get(
            f"/api/v1/businesses/{api['other']}/{suffix}", headers=api["a"]
        )
        assert response.status_code == 404
    assert (
        api["client"]
        .post(
            f"/api/v1/businesses/{api['other']}/customers",
            json={"display_name": "Intruder"},
            headers=api["a"],
        )
        .status_code
        == 404
    )
    assert post(api, sale(api), business=api["other"]).status_code == 404
    assert post(api, sale(api, customer_id=str(api["other_customer"]))).status_code == 404
    assert post(api, repayment(other_sale)).status_code == 404
    assert (
        api["client"]
        .get(
            f"/api/v1/businesses/{api['business']}/operations",
            params={"customer_id": str(api["other_customer"])},
            headers=api["a"],
        )
        .status_code
        == 404
    )
    assert (
        api["client"]
        .get(
            f"/api/v1/businesses/{api['business']}/operations",
            params={"cursor": other_sale},
            headers=api["a"],
        )
        .status_code
        == 404
    )
    assert len(api["client"].get("/api/v1/me", headers=api["a"]).json()["businesses"]) == 6
    assert len(api["client"].get("/api/v1/me", headers=api["b"]).json()["businesses"]) == 3
    assert summary(api).json()["outstanding_minor"] == 0


def test_customers_history_open_sales_and_pagination(ledger_api):
    api = ledger_api
    base = f"/api/v1/businesses/{api['business']}"
    customer = api["client"].post(
        base + "/customers", json={"display_name": "Демо Айша"}, headers=api["a"]
    )
    assert customer.status_code == 201
    assert customer.json()["balance_minor"] == 0
    first = post(api, sale(api)).json()["operation"]["id"]
    post(api, repayment(first))
    post(api, sale(api, customer_id=None, received_minor=300000))
    rows = api["client"].get(base + "/customers", params={"q": "Асқар"}, headers=api["a"]).json()
    assert len(rows["items"]) == 1
    assert rows["items"][0]["balance_minor"] == 150000
    opens = api["client"].get(
        base + "/operations", params={"outstanding_only": True}, headers=api["a"]
    )
    assert opens.status_code == 200, opens.text
    assert len(opens.json()["items"]) == 1
    assert opens.json()["items"][0]["received_minor"] == 150000
    seen, cursor = [], None
    for _ in range(3):
        params = {"limit": 1}
        if cursor:
            params["cursor"] = cursor
        result = api["client"].get(base + "/operations", params=params, headers=api["a"]).json()
        seen.extend(row["id"] for row in result["items"])
        cursor = result["next_cursor"]
    assert len(set(seen)) == 3 and cursor is None


@pytest.mark.parametrize(
    "changes",
    [
        {"total_minor": 0},
        {"total_minor": -1},
        {"received_minor": -1},
        {"received_minor": 400000},
        {"total_minor": "300000"},
        {"received_minor": True},
        {"customer_id": None},
        {"created_at": "2026-01-01T00:00:00Z"},
        {"total_minor": 100.0},
        {"total_minor": 10_000_000_001},
    ],
)
def test_invalid_requests_create_no_journal_rows(ledger_api, changes):
    api = ledger_api
    assert post(api, sale(api, **changes)).status_code == 422
    assert summary(api).json()["sales_minor"] == 0
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(IdempotencyRecord)) == 0


def test_missing_idempotency_key_and_unauthenticated_write(ledger_api):
    api = ledger_api
    path = f"/api/v1/businesses/{api['business']}/operations"
    assert api["client"].post(path, json=sale(api), headers=api["a"]).status_code == 422
    assert api["client"].post(path, json=sale(api)).status_code == 401


def test_reverse_preserves_history_and_idempotency(ledger_api):
    api = ledger_api
    original = post(api, sale(api)).json()["operation"]["id"]
    payment = post(api, repayment(original)).json()["operation"]["id"]

    def reverse(id, key):
        return api["client"].post(
            f"/api/v1/businesses/{api['business']}/operations/{id}/reverse",
            json={"description": "Исправление ошибки"},
            headers={**api["a"], "Idempotency-Key": key},
        )

    assert reverse(original, "reverse-sale").json()["error"]["code"] == "DEPENDENT_PAYMENTS"
    reversed_payment = reverse(payment, "reverse-payment")
    assert reversed_payment.status_code == 200
    assert reversed_payment.json()["sale_balance_minor"] == 200000
    assert reverse(payment, "reverse-payment").json() == reversed_payment.json()
    assert reverse(payment, "second-reversal").status_code == 409
    assert (
        reverse(reversed_payment.json()["operation"]["id"], "reverse-reversal").status_code == 409
    )
    assert reverse(original, "reverse-sale").json()["sale_balance_minor"] == 0
    assert post(api, repayment(original)).status_code == 409
    assert summary(api).json()["sales_minor"] == 0
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(Operation)) == 4
        with pytest.raises(DBAPIError):
            session.execute(text("UPDATE qadam.operations SET description='changed'"))


def test_local_midnight_and_current_debt(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as session, session.begin():
        for hour, minute in ((18, 59), (19, 0)):
            id = uuid4()
            session.add(
                Operation(
                    id=id,
                    sale_id=id,
                    business_id=api["business"],
                    customer_id=api["customer"],
                    kind="sale",
                    sales_delta_minor=100000,
                    receipts_delta_minor=0,
                    description="Граница суток",
                    created_by=api["owner_a"],
                    created_at=datetime(2026, 10, 14, hour, minute, tzinfo=UTC),
                )
            )
    report = summary(api, "2026-10-15").json()
    assert report["sales_minor"] == 100000
    assert report["outstanding_minor"] == 200000


def test_seed_twice_and_real_foreign_keys(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as session:
        with session.begin():
            seed(session, (api["owner_a"], api["owner_b"]))
            seed(session, (api["owner_a"], api["owner_b"]))
        for model, count in (
            (Venue, 3),
            (Business, 9),
            (Membership, 9),
            (CatalogItem, 9),
            (Customer, 9),
        ):
            assert session.scalar(select(func.count()).select_from(model)) == count
        session.rollback()
        with pytest.raises(DBAPIError), session.begin():
            id = uuid4()
            session.add(
                Operation(
                    id=id,
                    sale_id=id,
                    business_id=api["business"],
                    customer_id=api["other_customer"],
                    kind="sale",
                    sales_delta_minor=300000,
                    receipts_delta_minor=0,
                    description="Wrong tenant",
                    created_by=api["owner_a"],
                )
            )
            session.flush()
