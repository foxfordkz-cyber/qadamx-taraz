from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models import Operation
from app.services import research

pytestmark = pytest.mark.postgres
NOW = datetime(2026, 10, 24, 10, tzinfo=UTC)


def sale(api, when, amount=10000, paid=10000, *, business=None, customer=None):
    ident = uuid4()
    with Session(api["engine"]) as db:
        db.add(
            Operation(
                id=ident,
                business_id=business or api["business"],
                customer_id=customer or api["customer"],
                sale_id=ident,
                kind="sale",
                sales_delta_minor=amount,
                receipts_delta_minor=paid,
                description="Synthetic research fixture",
                created_at=when,
                created_by=api["owner_a"],
            )
        )
        db.commit()
    return ident


def reversal(api, sale_id, when, amount=10000, paid=10000, parent=None):
    with Session(api["engine"]) as db:
        db.add(
            Operation(
                id=uuid4(),
                business_id=api["business"],
                customer_id=api["customer"],
                sale_id=parent or sale_id,
                kind="reversal",
                sales_delta_minor=-amount,
                receipts_delta_minor=-paid,
                reversal_of=sale_id,
                description="Synthetic reversal",
                created_at=when,
                created_by=api["owner_a"],
            )
        )
        db.commit()


def snapshot(api, horizon=7):
    with Session(api["engine"]) as db:
        return research.forecast(db, api["business"], horizon, as_of=NOW)


def test_forecast_empty_and_tenant_authorization(ledger_api):
    api = ledger_api
    path = f"/api/v1/businesses/{api['business']}/research/forecast"
    assert api["client"].get(path).status_code == 401
    assert api["client"].get(path, headers=api["b"]).status_code == 404
    response = api["client"].get(path, headers=api["a"])
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["status"] == "insufficient_data"
    assert response.json()["history"] == []
    assert api["client"].get(path + "?horizon=8", headers=api["a"]).status_code == 422


def test_daily_local_boundary_zeros_and_partial_days(ledger_api):
    api = ledger_api
    # First recorded date is excluded. No records on Oct22 means a known ledger zero.
    sale(api, datetime(2026, 10, 20, 12, tzinfo=UTC))
    sale(api, datetime(2026, 10, 20, 19, tzinfo=UTC), 200, 200)  # Oct21 local
    sale(api, datetime(2026, 10, 23, 18, 59, tzinfo=UTC), 300, 300)
    sale(api, datetime(2026, 10, 23, 19, tzinfo=UTC), 400, 400)  # partial today
    sale(api, NOW + timedelta(days=1), 500, 500)
    sale(
        api,
        NOW - timedelta(days=1),
        100000,
        100000,
        business=api["other"],
        customer=api["other_customer"],
    )
    assert [d.sales_minor for d in snapshot(api).history] == [200, 0, 300]


def test_later_reversal_does_not_leak_into_day_close_features(ledger_api):
    api = ledger_api
    sale(api, NOW - timedelta(days=10))
    same_day = sale(api, NOW - timedelta(days=8))
    reversal(api, same_day, NOW - timedelta(days=8, hours=-1))
    later_day = sale(api, NOW - timedelta(days=5))
    before = snapshot(api)
    reversal(api, later_day, NOW - timedelta(days=1))
    assert snapshot(api).history == before.history
    assert sum(d.sales_minor for d in before.history) == 10000


def test_forecast_real_postgres_evaluation_is_reproducible(ledger_api):
    api = ledger_api
    for i in range(145):
        sale(api, NOW - timedelta(days=145 - i), 10000 + i * 10, 10000 + i * 10)
    first, second = snapshot(api, 30), snapshot(api, 30)
    assert first == second
    assert first.observed_days == 144
    assert first.status == "experimental"
    assert first.provenance == "demo_business_ledger"
    assert first.evaluation.test_observations == 30
    assert len(first.forecast) == 30


def test_risk_uses_net_payments_and_distinguishes_rules_from_ml(ledger_api):
    api = ledger_api
    ident = sale(api, NOW - timedelta(days=31), 10000, 5000)
    sale(api, NOW, 99999, 0, business=api["other"], customer=api["other_customer"])
    with Session(api["engine"]) as db:
        report = research.debt_risk(db, api["business"], as_of=NOW)
        assert report.method == "rules-v1" and report.outcome_metrics is None
        assert report.supervised_status == "insufficient_data"
        assert report.overdue_status == "unknown_no_due_dates"
        assert len(report.items) == 1 and report.items[0].balance_minor == 5000
        assert report.items[0].score == 80
    payment = uuid4()
    with Session(api["engine"]) as db:
        db.add(
            Operation(
                id=payment,
                business_id=api["business"],
                customer_id=api["customer"],
                sale_id=ident,
                kind="repayment",
                sales_delta_minor=0,
                receipts_delta_minor=4000,
                created_at=NOW,
                created_by=api["owner_a"],
                description="Synthetic repayment",
            )
        )
        db.commit()
        report = research.debt_risk(db, api["business"], as_of=NOW)
        assert report.items[0].balance_minor == 1000
        assert report.items[0].later_paid_minor == 4000
        assert report.items[0].score == 50
    reversal(api, payment, NOW, amount=0, paid=4000, parent=ident)
    with Session(api["engine"]) as db:
        assert research.debt_risk(db, api["business"], as_of=NOW).items[0].score == 80


def test_risk_route_and_bounded_pagination(ledger_api):
    from app.models import Customer

    api = ledger_api
    for _ in range(3):
        customer = uuid4()
        with Session(api["engine"]) as db:
            db.add(Customer(id=customer, business_id=api["business"], display_name="Synthetic"))
            db.commit()
        sale(api, NOW - timedelta(days=1), 100, 0, customer=customer)
    path = f"/api/v1/businesses/{api['business']}/research/debt-risk"
    assert api["client"].get(path).status_code == 401
    assert api["client"].get(path, headers=api["b"]).status_code == 404
    first = api["client"].get(path + "?limit=2", headers=api["a"])
    assert first.status_code == 200 and first.headers["cache-control"] == "no-store"
    body = first.json()
    second = api["client"].get(path + "?limit=2&cursor=" + body["next_cursor"], headers=api["a"])
    assert len(second.json()["items"]) == 1 and second.json()["next_cursor"] is None
    assert api["client"].get(path + "?limit=101", headers=api["a"]).status_code == 422
