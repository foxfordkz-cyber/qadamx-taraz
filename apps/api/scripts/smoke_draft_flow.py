"""Opt-in live HTTP + Supabase + Gemini demo. Keeps one labelled idempotent sale, no cleanup."""

import argparse
import json
import socket
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import make_engine
from app.models import Business, Draft, IdempotencyRecord, Operation
from app.seed import demo_id, verified_owners

KEY = "ai-integration-2026-10-15-sale"
DESCRIPTION = "Учебная AI-проверка интеграции 2026-10-15"
INPUT = "Продал товар на 3000 тенге, Демо Асқар заплатил 1000 тенге, остальное в долг"


@contextmanager
def local_server():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--no-access-log",
        ],
        cwd=Path(__file__).resolve().parents[1],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    try:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=40) as client:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError("Local API process stopped")
                try:
                    if client.get("/health").status_code == 200:
                        break
                except httpx.TransportError:
                    pass
                time.sleep(0.2)
            else:
                raise RuntimeError("Local API did not start")
            yield client
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def checked(response, status):
    if response.status_code != status:
        # Never print private response bodies or underlying credentials/SQL.
        raise RuntimeError(f"Unexpected HTTP {response.status_code}; expected {status}")
    return response.json()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true", required=True)
    parser.parse_args()
    settings = Settings()
    owners = verified_owners(settings)
    headers = {"Authorization": "Bearer " + settings.demo_owner_a_token.get_secret_value()}
    other_headers = {"Authorization": "Bearer " + settings.demo_owner_b_token.get_secret_value()}
    business = demo_id("mart-demo-food")
    customer = demo_id("mart-demo-food-customer")
    base = f"/api/v1/businesses/{business}"
    engine = make_engine(settings)

    def operation_count():
        with Session(engine) as session:
            return session.scalar(
                select(func.count()).select_from(Operation).where(Operation.business_id == business)
            )

    try:
        with Session(engine) as session:
            assert session.scalar(text("SELECT version_num FROM alembic_version")) == "0003_drafts"
            assert session.get(Business, business).is_demo
            previous = session.get(IdempotencyRecord, (business, KEY))
            if previous:
                operation = session.get(Operation, previous.result_operation_id)
                saved = session.scalar(
                    select(Draft).where(
                        Draft.business_id == business,
                        Draft.created_by == owners[0],
                        Draft.consumed_operation_id == operation.id,
                    )
                )
                assert saved is not None and operation.description == DESCRIPTION
                draft_id = str(saved.id)
            else:
                draft_id = None

        with local_server() as client:
            a = checked(client.get("/api/v1/me", headers=headers), 200)
            b = checked(client.get("/api/v1/me", headers=other_headers), 200)
            assert str(business) in {row["id"] for row in a["businesses"]}
            checked(client.get("/api/v1/me"), 401)
            checked(
                client.post(base + "/drafts", files={"text": (None, INPUT)}, headers=other_headers),
                404,
            )
            before = checked(client.get(base + "/summary", headers=headers), 200)
            count_before = operation_count()
            live = draft_id is None
            if live:
                result = checked(
                    client.post(
                        base + "/drafts",
                        files={"text": (None, INPUT), "locale": (None, "ru")},
                        headers=headers,
                    ),
                    200,
                )
                assert result["kind"] == "sale"
                assert (result["total_minor"], result["received_minor"]) == (300000, 100000)
                assert str(customer) in {row["id"] for row in result["customer_candidates"]}
                draft_id = result["id"]
                assert operation_count() == count_before
                assert checked(client.get(base + "/summary", headers=headers), 200) == before
                print("Live Gemini draft passed; journal and summary unchanged", flush=True)

            # Explicit test confirmation of reviewed synthetic fields; not automatic AI action.
            payload = dict(
                kind="sale",
                draft_id=draft_id,
                customer_id=str(customer),
                description=DESCRIPTION,
                total_minor=300000,
                received_minor=100000,
            )
            checked(
                client.post(
                    base + "/operations",
                    json=payload,
                    headers={**other_headers, "Idempotency-Key": KEY},
                ),
                404,
            )
            confirm_headers = {**headers, "Idempotency-Key": KEY}
            result = checked(
                client.post(base + "/operations", json=payload, headers=confirm_headers), 200
            )
            retry = checked(
                client.post(base + "/operations", json=payload, headers=confirm_headers), 200
            )
            assert retry == result and result["sale_balance_minor"] == 200000
            used = checked(
                client.post(
                    base + "/operations",
                    json=payload,
                    headers={**headers, "Idempotency-Key": KEY + "-another"},
                ),
                409,
            )
            assert used["error"]["code"] == "DRAFT_USED"
            report = checked(client.get(base + "/summary", headers=headers), 200)
            assert report["date"] == before["date"], "Rerun across local midnight"
            expected = (300000, 100000, 200000) if live else (0, 0, 0)
            totals = ("sales_minor", "receipts_minor", "outstanding_minor")
            assert tuple(report[key] - before[key] for key in totals) == expected
            history = checked(client.get(base + "/operations", headers=headers), 200)
            assert sum(row["id"] == result["operation"]["id"] for row in history["items"]) == 1
            assert operation_count() == count_before + int(live)
            with Session(engine) as session:
                saved = session.get(Draft, UUID(draft_id))
                assert str(saved.consumed_operation_id) == result["operation"]["id"]
                assert saved.created_by == owners[0] and saved.business_id == business
            print(
                json.dumps(
                    {
                        "status": "PASS",
                        "mode": "live-full-flow" if live else "replay-only",
                        "transport": "HTTP to local Uvicorn",
                        "database": "configured demo",
                        "model": settings.ai_model,
                        "owner_business_counts": [len(a["businesses"]), len(b["businesses"])],
                        "same_key": "same response",
                        "new_key": "409 DRAFT_USED",
                        "summary": {key: report[key] for key in totals},
                    }
                )
            )
    finally:
        engine.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Live flow failed:", type(error).__name__)
        # RuntimeError from our own HTTP status checker contains no provider/private data.
        if isinstance(error, RuntimeError):
            print(str(error))
        raise SystemExit(1) from None
