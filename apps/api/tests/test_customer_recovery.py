import json
import socket
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import UUID

import httpx
import pytest
import uvicorn
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import delete, event, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app import schemas
from app.config import Settings
from app.main import create_app
from app.models import Customer, CustomerCreationRequest, Membership

pytestmark = pytest.mark.postgres
BODY = {"display_name": "Учебный Асқар", "note": "Только тест", "contact": None}


def url(api, suffix="customers", business=None):
    return f"/api/v1/businesses/{business or api['business']}/{suffix}"


def post(api, key="customer-key", body=None, user="a", business=None):
    headers = dict(api[user])
    if key is not None:
        headers["Idempotency-Key"] = key
    return api["client"].post(url(api, business=business), json=body or BODY, headers=headers)


def lookup(api, key="customer-key", user="a", business=None):
    headers = dict(api[user])
    if key is not None:
        headers["Idempotency-Key"] = key
    return api["client"].get(url(api, "customer-creation-result", business), headers=headers)


def counts(api):
    with Session(api["engine"]) as db:
        return tuple(
            db.scalar(select(func.count()).select_from(t))
            for t in (Customer, CustomerCreationRequest)
        )


def test_legacy_and_canonical_replay(ledger_api):
    api = ledger_api
    baseline = counts(api)
    assert lookup(api).json() == {"status": "not_observed", "customer": None}
    first = post(api, body={"display_name": "  Учебный Асқар  "})
    assert first.status_code == 201
    repeated = post(api, body={"contact": None, "note": "  ", "display_name": "Учебный Асқар"})
    assert repeated.status_code == 201
    assert repeated.json() == first.json()
    assert repeated.headers["x-request-id"] != first.headers["x-request-id"]
    assert lookup(api).json() == {"status": "completed", "customer": first.json()}
    assert counts(api) == (baseline[0] + 1, 1)
    for body in [BODY, {"display_name": "Учебный Асқар", "contact": ""}]:
        response = post(api, body=body)
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"
        assert response.headers["cache-control"] == "no-store"
    legacy = [post(api, key=None) for _ in range(2)]
    assert all(r.status_code == 201 for r in legacy)
    assert legacy[0].json()["id"] != legacy[1].json()["id"]
    assert counts(api) == (baseline[0] + 3, 1)
    assert first.headers["cache-control"] == lookup(api).headers["cache-control"] == "no-store"


@pytest.mark.parametrize("key", ["", "has space", "a" * 201, "\t"])
def test_invalid_keys(ledger_api, key):
    for response in [post(ledger_api, key), lookup(ledger_api, key)]:
        assert response.status_code == 422
        assert response.headers["cache-control"] == "no-store"
    assert counts(ledger_api)[1] == 0


def test_missing_key_invalid_body_auth_and_membership(ledger_api):
    api = ledger_api
    assert lookup(api, key=None).status_code == 422
    assert post(api, body={"display_name": " ", "unknown": True}).status_code == 422
    for response in [
        post(api, user="b"),
        lookup(api, user="b"),
        api["client"].post(url(api), json=BODY),
        api["client"].get(url(api, "customer-creation-result")),
    ]:
        assert response.status_code in (401, 404)
        assert response.headers["cache-control"] == "no-store"
    assert counts(api)[1] == 0
    first = post(api).json()
    with Session(api["engine"]) as db, db.begin():
        db.execute(
            delete(Membership).where(
                Membership.user_id == api["owner_a"], Membership.business_id == api["business"]
            )
        )
    assert post(api).status_code == lookup(api).status_code == 404
    with Session(api["engine"]) as db, db.begin():
        db.add(Membership(user_id=api["owner_a"], business_id=api["business"]))
    assert lookup(api).json()["customer"] == post(api).json() == first


def test_scope_creator_business_and_ledger_are_independent(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as db, db.begin():
        db.add(Membership(user_id=api["owner_b"], business_id=api["business"]))
        db.add(Membership(user_id=api["owner_a"], business_id=api["other"]))
    a = post(api).json()
    assert lookup(api, user="b").json()["status"] == "not_observed"
    b = post(api, user="b").json()
    other = post(api, business=api["other"]).json()
    assert len({a["id"], b["id"], other["id"]}) == 3
    operation = api["client"].post(
        url(api, "operations"),
        headers={**api["a"], "Idempotency-Key": "customer-key"},
        json={
            "kind": "sale",
            "customer_id": a["id"],
            "description": "Test",
            "total_minor": 300000,
            "received_minor": 100000,
        },
    )
    assert operation.status_code == 200
    assert post(api).json() == lookup(api).json()["customer"] == a
    assert a["balance_minor"] == 0
    fresh = api["client"].get(url(api), headers=api["a"]).json()
    assert next(c for c in fresh["items"] if c["id"] == a["id"])["balance_minor"] == 200000


@pytest.mark.parametrize("different", [False, True])
def test_parallel_requests(ledger_api, different):
    api = ledger_api
    baseline = counts(api)
    barrier = threading.Barrier(6)

    def run(i):
        barrier.wait(timeout=10)
        return post(api, body={**BODY, "note": str(i) if different else BODY["note"]})

    with ThreadPoolExecutor(max_workers=6) as pool:
        responses = list(pool.map(run, range(6)))
    successes = [r for r in responses if r.status_code == 201]
    assert len(successes) == (1 if different else 6)
    assert all(r.status_code in (201, 409) for r in responses)
    assert len({r.json()["id"] for r in successes}) == 1
    assert counts(api) == (baseline[0] + 1, 1)


@pytest.mark.parametrize("database_failure", [False, True])
def test_customer_and_receipt_rollback_together(ledger_api, database_failure):
    api = ledger_api
    baseline = counts(api)

    def fail(db, *_):
        if any(isinstance(row, CustomerCreationRequest) for row in db.new):
            if database_failure:
                raise DBAPIError("private query", {}, RuntimeError("private failure"))
            raise RuntimeError("injected after customer insert")

    event.listen(Session, "before_flush", fail)
    try:
        response = post(api)
        assert response.status_code == (503 if database_failure else 500)
        assert response.headers["cache-control"] == "no-store"
        assert "private" not in response.text and "injected" not in response.text
    finally:
        event.remove(Session, "before_flush", fail)
    assert counts(api) == baseline
    assert lookup(api).json()["status"] == "not_observed"
    assert post(api).status_code == 201


def test_durable_snapshot_after_new_app_and_old_receipt(ledger_api):
    api = ledger_api
    first = post(api).json()
    with Session(api["engine"]) as db, db.begin():
        db.execute(text("UPDATE qadam.customer_creation_requests SET created_at = '2000-01-01'"))
    independent = create_app(Settings(_env_file=None, database_url=None))
    independent.state.engine = api["engine"]
    independent.state.verifier = api["app"].state.verifier
    with TestClient(independent) as client:
        recovered = lookup({**api, "client": client})
        assert recovered.json()["customer"] == first
        assert post({**api, "client": client}).json() == first


def test_real_http_lost_response_and_late_original(ledger_api):
    """Disconnect before COMMIT; recovery sees no committed receipt, then the original result."""
    api = ledger_api
    baseline = counts(api)
    entered, release = threading.Event(), threading.Event()

    def delay(db, *_):
        if any(isinstance(row, CustomerCreationRequest) for row in db.new):
            entered.set()
            assert release.wait(10)

    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(api["app"], log_level="critical", access_log=False))
    thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
    event.listen(Session, "before_flush", delay)
    thread.start()
    try:
        deadline = time.monotonic() + 10
        while not server.started and time.monotonic() < deadline:
            time.sleep(0.01)
        assert server.started
        payload = json.dumps(BODY).encode()
        connection = socket.create_connection(("127.0.0.1", port), timeout=5)
        headers = (
            f"POST {url(api)} HTTP/1.1\r\nHost: 127.0.0.1\r\n"
            f"Authorization: {api['a']['Authorization']}\r\n"
            "Idempotency-Key: customer-key\r\nContent-Type: application/json\r\n"
            f"Content-Length: {len(payload)}\r\nConnection: close\r\n\r\n"
        )
        connection.sendall(headers.encode() + payload)
        assert entered.wait(5)
        connection.close()  # No response read: the first worker can still commit.
        with httpx.Client(base_url=f"http://127.0.0.1:{port}") as client:
            remote = {**api, "client": client}
            assert lookup(remote).json() == {"status": "not_observed", "customer": None}
            with ThreadPoolExecutor(max_workers=1) as pool:
                retry = pool.submit(post, remote)
                release.set()
                repeated = retry.result(timeout=10)
            assert repeated.status_code == 201
            assert lookup(remote).json()["customer"] == repeated.json()
        assert counts(api) == (baseline[0] + 1, 1)
    finally:
        release.set()
        event.remove(Session, "before_flush", delay)
        server.should_exit = True
        thread.join(10)
        listener.close()
        assert not thread.is_alive()


def test_receipt_security_and_cross_tenant_fk(ledger_api):
    api = ledger_api
    with api["engine"].connect() as conn:
        assert conn.scalar(
            text(
                "SELECT relrowsecurity FROM pg_class WHERE oid = "
                "'qadam.customer_creation_requests'::regclass"
            )
        )
        assert not conn.scalar(
            text(
                "SELECT EXISTS (SELECT 1 FROM pg_class, "
                "LATERAL aclexplode(relacl) a WHERE oid = "
                "'qadam.customer_creation_requests'::regclass AND grantee=0)"
            )
        )
        for role in ("anon", "authenticated"):
            if conn.scalar(text("SELECT 1 FROM pg_roles WHERE rolname=:role"), {"role": role}):
                for privilege in ("SELECT", "INSERT", "UPDATE", "DELETE"):
                    assert not conn.scalar(
                        text(
                            "SELECT has_table_privilege(:role,"
                            "'qadam.customer_creation_requests',:privilege)"
                        ),
                        {"role": role, "privilege": privilege},
                    )
    with Session(api["engine"]) as db:
        db.add(
            CustomerCreationRequest(
                business_id=api["business"],
                created_by=api["owner_a"],
                key="cross-tenant",
                request_hash="a" * 64,
                result_customer_id=api["other_customer"],
                response_json={},
            )
        )
        with pytest.raises(DBAPIError):
            db.commit()
    customer = post(api).json()
    with Session(api["engine"]) as db:
        with pytest.raises(DBAPIError):
            db.execute(delete(Customer).where(Customer.id == UUID(customer["id"])))
            db.commit()


def test_published_examples_match_runtime_schema():
    examples = json.loads(
        (
            Path(__file__).resolve().parents[3] / "packages/contracts/"
            "customer-recovery-examples.json"
        ).read_text(encoding="utf-8")
    )
    schemas.CustomerCreate.model_validate(examples["create"])
    schemas.CustomerResponse.model_validate(examples["created_or_replayed"])
    schemas.CustomerCreationCompleted.model_validate(examples["completed"])
    schemas.CustomerCreationNotObserved.model_validate(examples["not_observed"])
    schemas.ErrorResponse.model_validate(examples["conflict"])


def test_migration_preserves_existing_data_and_legacy_clients(ledger_api):
    api = ledger_api
    legacy = post(api, key=None).json()
    config = Config("alembic.ini")
    command.downgrade(config, "0005_livestock_market")
    try:
        with api["engine"].connect() as db:
            before = db.execute(text("SELECT * FROM qadam.customers ORDER BY id")).all()
        command.upgrade(config, "head")
        command.check(config)
        with api["engine"].connect() as db:
            assert db.execute(text("SELECT * FROM qadam.customers ORDER BY id")).all() == before
        assert counts(api)[1] == 0  # No fabricated recovery receipts for legacy writes.
        fresh = api["client"].get(url(api), headers=api["a"]).json()
        assert legacy in fresh["items"]
        assert post(api).status_code == 201
    finally:
        command.upgrade(config, "head")


def test_membership_revocation_waits_for_creation_commit(ledger_api):
    api = ledger_api
    entered, release, revoke_started = threading.Event(), threading.Event(), threading.Event()

    def delay(db, *_):
        if any(isinstance(row, CustomerCreationRequest) for row in db.new):
            entered.set()
            assert release.wait(10)

    def revoke():
        with Session(api["engine"]) as db, db.begin():
            revoke_started.set()
            db.execute(
                delete(Membership).where(
                    Membership.business_id == api["business"],
                    Membership.user_id == api["owner_a"],
                )
            )

    event.listen(Session, "before_flush", delay)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            creation = pool.submit(post, api)
            assert entered.wait(5)
            revocation = pool.submit(revoke)
            assert revoke_started.wait(5)
            # Observe the actual PostgreSQL lock wait rather than relying on thread timing.
            deadline = time.monotonic() + 5
            waiting = False
            while time.monotonic() < deadline:
                with api["engine"].connect() as db:
                    waiting = db.scalar(
                        text(
                            "SELECT EXISTS (SELECT 1 FROM pg_stat_activity "
                            "WHERE datname=current_database() AND wait_event_type='Lock' "
                            "AND query LIKE 'DELETE FROM qadam.memberships%')"
                        )
                    )
                if waiting:
                    break
                time.sleep(0.01)
            assert waiting and not revocation.done()
            release.set()
            assert creation.result(timeout=10).status_code == 201
            revocation.result(timeout=10)
        assert post(api).status_code == lookup(api).status_code == 404
        assert counts(api)[1] == 1
    finally:
        release.set()
        event.remove(Session, "before_flush", delay)
