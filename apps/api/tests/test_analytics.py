from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Operation
from app.services.analytics import read

pytestmark = pytest.mark.postgres
NOW = datetime(2026, 10, 16, 10, tzinfo=UTC)  # 15:00 Almaty
START = datetime(2026, 10, 9, 19, tzinfo=UTC)  # Oct10 00:00 Almaty


def add(api, when, total=300000, received=100000, kind="sale", sale_id=None, reverse=None):
    ident = uuid4()
    with Session(api["engine"]) as db:
        db.add(
            Operation(
                id=ident,
                business_id=api["business"],
                customer_id=api["customer"],
                sale_id=sale_id or ident,
                kind=kind,
                sales_delta_minor=total,
                receipts_delta_minor=received,
                reversal_of=reverse,
                description="Synthetic analytics test",
                created_at=when,
                created_by=api["owner_a"],
            )
        )
        db.commit()
    return ident


def report(api, days=7, now=NOW):
    with Session(api["engine"]) as db:
        result = read(db, api["business"], days, as_of=now).model_dump(mode="json")
    assert result["as_of"].endswith("Z")
    cards = result["cards"]
    assert len(result["daily"]) == days
    assert [r["hour"] for r in result["hourly"]] == list(range(24))
    assert sum(r["sales_count"] for r in result["hourly"]) == cards["sales_count"]
    for key in ["sales_minor", "receipts_minor", "sales_count"]:
        assert sum(r[key] for r in result["daily"]) == cards[key]
    assert sum(r["is_partial"] for r in result["daily"]) == 1
    money = result["collection"]
    assert money["sales_minor"] == cards["sales_minor"]
    assert (
        money["paid_at_sale_minor"] + money["paid_later_minor"] + money["outstanding_minor"]
        == money["sales_minor"]
    )
    assert [b["key"] for b in result["debt_aging"]] == ["0_7", "8_30", "31_plus"]
    assert sum(b["amount_minor"] for b in result["debt_aging"]) == cards["outstanding_minor"]
    return result


def test_sale_repayment_cards_graphs(ledger_api):
    api = ledger_api
    sale = add(api, NOW - timedelta(hours=2))
    add(api, NOW - timedelta(hours=1), 0, 50000, "repayment", sale)
    result = report(api)
    assert result["cards"] == dict(
        sales_minor=300000,
        receipts_minor=150000,
        sales_count=1,
        average_ticket_minor=300000,
        outstanding_minor=150000,
        debtors_count=1,
    )
    assert result["hourly"][13]["sales_count"] == 1
    assert result["daily"][-1]["sales_minor"] == 300000


def test_old_repayment_and_current_debt_all_dates(ledger_api):
    api = ledger_api
    sale = add(api, START - timedelta(days=40))
    add(api, NOW, 0, 50000, "repayment", sale)
    r = report(api)
    assert r["cards"] == dict(
        sales_minor=0,
        receipts_minor=50000,
        sales_count=0,
        average_ticket_minor=None,
        outstanding_minor=150000,
        debtors_count=1,
    )


def test_reversal_later_day_restates_sale_but_receipts_on_reversal_day(ledger_api):
    api = ledger_api
    sale = add(api, START)
    add(api, NOW, -300000, -100000, "reversal", sale, sale)
    r = report(api)
    assert r["cards"]["sales_count"] == 0 and r["cards"]["average_ticket_minor"] is None
    assert r["cards"]["outstanding_minor"] == 0 and r["cards"]["debtors_count"] == 0
    assert r["daily"][0]["sales_minor"] == 0 and r["daily"][0]["receipts_minor"] == 100000
    assert r["daily"][-1]["receipts_minor"] == -100000
    assert report(api, now=NOW - timedelta(seconds=1))["cards"]["sales_count"] == 1


def test_reversal_old_sale_not_negative_check_and_denominator_matches(ledger_api):
    api = ledger_api
    old = add(api, START - timedelta(seconds=1))
    add(api, NOW, -300000, -100000, "reversal", old, old)
    add(api, NOW, 50000, 50000)
    r = report(api)
    assert r["cards"] == dict(
        sales_minor=50000,
        receipts_minor=-50000,
        sales_count=1,
        average_ticket_minor=50000,
        outstanding_minor=0,
        debtors_count=0,
    )


def test_repayment_reversal_and_sale_reversal(ledger_api):
    api = ledger_api
    sale = add(api, START)
    payment = add(api, START + timedelta(days=1), 0, 50000, "repayment", sale)
    add(api, NOW - timedelta(seconds=1), 0, -50000, "reversal", sale, payment)
    before = report(api)
    assert before["cards"]["sales_count"] == 1 and before["cards"]["outstanding_minor"] == 200000
    add(api, NOW, -300000, -100000, "reversal", sale, sale)
    assert report(api)["cards"] == dict(
        sales_minor=0,
        receipts_minor=0,
        sales_count=0,
        average_ticket_minor=None,
        outstanding_minor=0,
        debtors_count=0,
    )


@pytest.mark.parametrize("days", [7, 30])
def test_empty_zero_buckets_and_midnight(ledger_api, days):
    for now, last in [
        (datetime(2026, 10, 15, 18, 59, 59, tzinfo=UTC), "2026-10-15"),
        (datetime(2026, 10, 15, 19, tzinfo=UTC), "2026-10-16"),
    ]:
        r = report(ledger_api, days, now)
        assert r["period_to"] == last
        assert r["cards"]["average_ticket_minor"] is None
        assert all(r["cards"][k] == 0 for k in r["cards"] if k != "average_ticket_minor")


def test_period_boundaries_local_hours_and_future(ledger_api):
    api = ledger_api
    add(api, START - timedelta(microseconds=1), 100, 100)
    add(api, START, 200, 200)
    add(api, START + timedelta(hours=23, minutes=59), 300, 300)
    add(api, NOW + timedelta(microseconds=1), 400, 400)
    r = report(api)
    assert r["cards"]["sales_minor"] == 500 and r["cards"]["sales_count"] == 2
    assert r["hourly"][0]["sales_count"] == 1 and r["hourly"][23]["sales_count"] == 1
    assert report(api, 30)["cards"]["sales_count"] == 3


def test_average_half_up_and_distinct_debtors(ledger_api):
    api = ledger_api
    add(api, NOW, 100, 0)
    add(api, NOW, 101, 0)
    r = report(api)["cards"]
    assert r["average_ticket_minor"] == 101 and r["debtors_count"] == 1


def test_http_auth_isolation_periods_no_writes(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as db:
        now = db.scalar(select(func.now()))
    add(api, now, 100, 100)
    url = f"/api/v1/businesses/{api['business']}/analytics"
    assert api["client"].get(url).status_code == 401
    assert api["client"].get(url, headers=api["b"]).status_code == 404
    for days in [7, 30]:
        r = api["client"].get(url, headers=api["a"], params={"days": days})
        assert r.status_code == 200 and r.headers["cache-control"] == "no-store"
        assert r.json()["cards"]["sales_count"] == 1
    other = api["client"].get(f"/api/v1/businesses/{api['other']}/analytics", headers=api["b"])
    assert other.status_code == 200 and other.json()["cards"]["sales_count"] == 0
    for days in [0, 1, 8, 90, "foo", 7.5]:
        assert api["client"].get(url, headers=api["a"], params={"days": days}).status_code == 422
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(Operation)) == 1


def test_collection_and_debt_aging_by_sale_age(ledger_api):
    api = ledger_api
    fresh = add(api, NOW - timedelta(days=1), 300000, 100000)  # in period, owes 2 000
    add(api, NOW - timedelta(hours=3), 0, 50000, "repayment", fresh)  # paid later 500
    add(api, NOW - timedelta(days=2), 200000, 200000)  # in period, fully paid at sale
    week = add(api, NOW - timedelta(days=8), 400000, 0)  # before period, 8 days old
    add(api, NOW - timedelta(hours=1), 0, 100000, "repayment", week)  # old debt repayment
    add(api, NOW - timedelta(days=45), 150000, 50000)  # 45 days old, owes 1 000
    gone = add(api, NOW - timedelta(days=3), 500000, 0)  # reversed: counts nowhere
    add(api, NOW - timedelta(days=3, hours=-1), -500000, 0, "reversal", gone, reverse=gone)
    result = report(api)
    assert result["collection"] == dict(
        sales_minor=500000,
        paid_at_sale_minor=300000,
        paid_later_minor=50000,
        outstanding_minor=150000,
    )
    assert result["debt_aging"] == [
        dict(key="0_7", amount_minor=150000, sales_count=1),
        dict(key="8_30", amount_minor=300000, sales_count=1),
        dict(key="31_plus", amount_minor=100000, sales_count=1),
    ]


def test_reversed_repayment_returns_debt_to_its_age_bucket(ledger_api):
    api = ledger_api
    sale = add(api, NOW - timedelta(days=10), 300000, 0)
    paid = add(api, NOW - timedelta(days=1), 0, 300000, "repayment", sale)
    assert report(api)["debt_aging"][1] == dict(key="8_30", amount_minor=0, sales_count=0)
    add(api, NOW - timedelta(hours=1), 0, -300000, "reversal", sale, reverse=paid)
    assert report(api)["debt_aging"][1] == dict(key="8_30", amount_minor=300000, sales_count=1)
