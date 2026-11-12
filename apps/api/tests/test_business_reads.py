from datetime import UTC, datetime, timedelta

import pytest
from test_analytics import add
from test_ledger import post, repayment, sale

from app.services.ledger import LOCAL_TZ

pytestmark = pytest.mark.postgres


def read(api, resource="report", params=None, headers=None):
    return api["client"].get(
        f"/api/v1/businesses/{api['business']}/{resource}",
        params=params or {},
        headers=headers or api["a"],
    )


def create_four(api):
    first = post(api, sale(api), "sale-1")
    assert post(api, sale(api), "sale-1").json() == first.json()
    first_id = first.json()["operation"]["id"]
    paid = post(api, repayment(first_id), "repayment-1").json()["operation"]["id"]
    reversed_payment = api["client"].post(
        f"/api/v1/businesses/{api['business']}/operations/{paid}/reverse",
        json={"description": "Synthetic correction"},
        headers={**api["a"], "Idempotency-Key": "reverse-1"},
    )
    assert reversed_payment.status_code == 200
    post(api, sale(api, total_minor=120000, received_minor=120000), "sale-2")
    return first_id


def test_report_complete_ledger_and_customer_not_a_loaded_page(ledger_api):
    api = ledger_api
    create_four(api)
    result = read(api)
    assert result.status_code == 200, result.text
    assert result.headers["cache-control"] == "no-store"
    report = result.json()
    assert [report[k] for k in ("sales_minor", "receipts_minor", "outstanding_minor")] == [
        420000,
        220000,
        200000,
    ]
    assert report["operation_count"] == 4
    assert sum(row["balance_minor"] for row in report["debt_aging"]) == 200000
    assert report["last_operation"]["business_id"] == str(api["business"])
    customer = read(api, params={"customer_id": str(api["customer"])}).json()
    assert customer["sales_minor"] == 420000 and customer["receipts_minor"] == 220000
    assert len(read(api, "operations", {"limit": 1}).json()["items"]) == 1
    assert report["operation_count"] == 4
    empty = read(api, params={"customer_id": "00000000-0000-4000-8000-000000000099"})
    assert empty.status_code == 404
    assert read(api, headers=api["b"]).status_code == 404


@pytest.mark.parametrize(
    "params",
    [
        {"date_from": "2026-10-15"},
        {"date_from": "2026-10-16", "date_to": "2026-10-15"},
        {"date_from": "2024-01-01", "date_to": "2026-10-15"},
        {"date_from": "9999-12-31", "date_to": "9999-12-31"},
    ],
)
def test_invalid_report_ranges_fail_closed(ledger_api, params):
    assert read(ledger_api, params=params).status_code == 422


def test_empty_report(ledger_api):
    api = ledger_api
    report = read(api).json()
    assert report["sales_minor"] == report["outstanding_minor"] == report["operation_count"] == 0
    assert report["last_operation"] is None
    assert report["opening_balance_minor"] is None


def test_local_date_bounds_reversals_and_historical_closing_balance(ledger_api):
    api = ledger_api
    # Insert synthetic historical rows; never disable journal immutability.
    sale_id = add(api, datetime(2026, 10, 15, 18, 59, 59, tzinfo=UTC))
    pay_id = add(
        api,
        datetime(2026, 10, 15, 19, 0, tzinfo=UTC),
        total=0,
        received=50000,
        kind="repayment",
        sale_id=sale_id,
    )
    report = read(api, params={"date_from": "2026-10-16", "date_to": "2026-10-16"}).json()
    assert (report["sales_minor"], report["receipts_minor"]) == (0, 50000)
    assert (
        report["opening_balance_minor"],
        report["closing_balance_minor"],
        report["outstanding_minor"],
    ) == (200000, 150000, 150000)
    rows = read(api, "operations", {"date_from": "2026-10-16", "date_to": "2026-10-16"}).json()[
        "items"
    ]
    assert [row["id"] for row in rows] == [str(pay_id)]


@pytest.mark.parametrize(
    "age,bucket", [(0, "0_7"), (7, "0_7"), (8, "8_30"), (30, "8_30"), (31, "31_plus")]
)
def test_age_is_local_calendar_days_not_overdue(ledger_api, age, bucket):
    api = ledger_api
    add(
        api,
        datetime.now(LOCAL_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
        - timedelta(days=age),
    )
    rows = read(api, "operations", {"outstanding_only": "true", "age_bucket": bucket}).json()[
        "items"
    ]
    assert len(rows) == 1 and rows[0]["age_days"] == age
    aging = read(api).json()["debt_aging"]
    assert next(row for row in aging if row["bucket"] == bucket)["balance_minor"] == 200000


def test_status_amount_type_customer_and_keyset_filters(ledger_api):
    api = ledger_api
    create_four(api)
    rows = read(api, "operations", {"kind": "sale", "payment_status": "partial"}).json()["items"]
    assert len(rows) == 1 and rows[0]["sales_delta_minor"] == 300000
    assert (
        len(read(api, "operations", {"kind": "sale", "payment_status": "paid"}).json()["items"])
        == 1
    )
    assert len(read(api, "operations", {"payment_status": "unpaid"}).json()["items"]) == 0
    assert (
        len(
            read(api, "operations", {"min_amount_minor": 40000, "max_amount_minor": 60000}).json()[
                "items"
            ]
        )
        == 2
    )
    page = read(api, "operations", {"kind": "sale", "limit": 1}).json()
    second = read(
        api, "operations", {"kind": "sale", "limit": 1, "cursor": page["next_cursor"]}
    ).json()
    assert len(second["items"]) == 1 and second["items"][0]["id"] != page["items"][0]["id"]
    assert second["next_cursor"] is None
    for params in [
        {"min_amount_minor": 600, "max_amount_minor": 500},
        {"age_bucket": "0_7"},
        {"outstanding_only": "true", "kind": "repayment"},
        {"payment_status": "late"},
        {"date": "2026-10-15", "date_from": "2026-10-14"},
    ]:
        assert read(api, "operations", params).status_code == 422


def test_cancelled_sale_and_signed_period_corrections(ledger_api):
    api = ledger_api
    ident = add(api, datetime(2026, 10, 14, 10, tzinfo=UTC))
    add(
        api,
        datetime(2026, 10, 15, 10, tzinfo=UTC),
        total=-300000,
        received=-100000,
        kind="reversal",
        sale_id=ident,
        reverse=ident,
    )
    result = read(api, params={"date_from": "2026-10-15", "date_to": "2026-10-15"}).json()
    assert (
        result["sales_minor"],
        result["receipts_minor"],
        result["opening_balance_minor"],
        result["closing_balance_minor"],
    ) == (-300000, -100000, 200000, 0)
    assert result["outstanding_minor"] == 0
    assert read(api, "operations", {"outstanding_only": "true"}).json()["items"] == []
    assert (
        len(
            read(api, "operations", {"kind": "sale", "payment_status": "cancelled"}).json()["items"]
        )
        == 1
    )


def test_new_reads_reject_foreign_customer_cursor_and_missing_auth(ledger_api):
    api = ledger_api
    create_four(api)
    for resource in ("report", "operations"):
        assert read(api, resource, {"customer_id": str(api["other_customer"])}).status_code == 404
        url = f"/api/v1/businesses/{api['business']}/{resource}"
        assert api["client"].get(url).status_code == 401
    other = post(
        api,
        sale(api, customer_id=str(api["other_customer"])),
        business=api["other"],
        headers=api["b"],
    ).json()["operation"]["id"]
    assert read(api, "operations", {"cursor": other}).status_code == 404
