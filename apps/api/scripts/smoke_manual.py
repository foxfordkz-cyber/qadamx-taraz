"""Explicit demo smoke test using real Supabase JWTs and the configured PostgreSQL.

Creates one labelled demo sale and repayment, idempotently. Never deletes records.
Run from apps/api: uv run python scripts/smoke_manual.py --demo
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.seed import demo_id, verified_owners


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()
    if not args.demo:
        parser.error("--demo required: this creates labelled financial demo records")
    settings = Settings()
    verified_owners(settings)
    headers_a = {"Authorization": "Bearer " + settings.demo_owner_a_token.get_secret_value()}
    headers_b = {"Authorization": "Bearer " + settings.demo_owner_b_token.get_secret_value()}
    business = demo_id("mart-demo-clothes")
    other = demo_id("mart-demo-home")
    base = f"/api/v1/businesses/{business}"

    def checked(response, status):
        if response.status_code != status:
            # Do not echo token, private request or response bodies on failure.
            raise RuntimeError(f"Unexpected HTTP status {response.status_code}; expected {status}")
        return response.json()

    with TestClient(create_app(settings), raise_server_exceptions=False) as client:
        a = checked(client.get("/api/v1/me", headers=headers_a), 200)
        b = checked(client.get("/api/v1/me", headers=headers_b), 200)
        assert str(business) in {row["id"] for row in a["businesses"]}
        assert str(other) in {row["id"] for row in b["businesses"]}
        checked(client.get(base + "/customers", headers=headers_b), 404)
        checked(client.get(f"/api/v1/businesses/{other}/customers", headers=headers_a), 404)
        checked(client.get(base + "/customers"), 401)
        body = {
            "kind": "sale",
            "draft_id": None,
            "customer_id": str(demo_id("mart-demo-clothes-customer")),
            "description": "Учебная проверка ручного учёта 2026-10-15",
            "total_minor": 300000,
            "received_minor": 100000,
        }
        sale_headers = {**headers_a, "Idempotency-Key": "manual-smoke-2026-10-15-sale"}
        created = checked(client.post(base + "/operations", json=body, headers=sale_headers), 200)
        assert (
            checked(client.post(base + "/operations", json=body, headers=sale_headers), 200)
            == created
        )
        assert created["sale_balance_minor"] == 200000
        payment = {
            "kind": "repayment",
            "draft_id": None,
            "sale_id": created["operation"]["id"],
            "amount_minor": 50000,
            "description": "Учебная доплата 2026-10-15",
        }
        payment_headers = {**headers_a, "Idempotency-Key": "manual-smoke-2026-10-15-repayment"}
        paid = checked(
            client.post(base + "/operations", json=payment, headers=payment_headers), 200
        )
        assert (
            checked(client.post(base + "/operations", json=payment, headers=payment_headers), 200)
            == paid
        )
        assert paid["sale_balance_minor"] == 150000
        assert paid["operation"]["sales_delta_minor"] == 0
        report = checked(client.get(base + "/summary", headers=headers_a), 200)
        print(
            "Real Supabase JWT + PostgreSQL smoke passed; owner isolation and anonymous 401 passed."
        )
        print(
            "Demo sale balance: 200000; after repayment: 150000; "
            "both retries returned same response."
        )
        print(
            "Business summary:",
            {key: report[key] for key in ("sales_minor", "receipts_minor", "outstanding_minor")},
        )


if __name__ == "__main__":
    main()
