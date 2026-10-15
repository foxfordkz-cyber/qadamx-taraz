"""Real PostgreSQL and JWT/JWKS; Gemini output is an explicit test double."""

import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session
from test_ai import TEXT, VALID, StubProvider
from test_ledger import post, repayment, sale, summary

from app.models import Customer, Draft, IdempotencyRecord, Membership, Operation

pytestmark = pytest.mark.postgres


def draft(api, text=TEXT, locale="ru", business=None, headers=None, **changes):
    api["app"].state.ai = StubProvider(json.dumps({**VALID, **changes}))
    return api["client"].post(
        f"/api/v1/businesses/{business or api['business']}/drafts",
        files={"text": (None, text), "locale": (None, locale)},
        headers=headers or api["a"],
    )


def test_text_draft_writes_no_money_and_confirmation_uses_existing_ledger(ledger_api):
    api = ledger_api
    response = draft(api)
    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["total_minor"], body["received_minor"]) == (300000, 100000)
    assert body["customer_candidates"] == [
        {"id": str(api["customer"]), "display_name": "Демо Асқар"}
    ]
    assert body["missing_fields"] == []
    assert summary(api).json()["sales_minor"] == 0
    with Session(api["engine"]) as session:
        saved = session.get(Draft, UUID(body["id"]))
        assert saved.expires_at - saved.created_at == timedelta(minutes=30)
        assert saved.created_by == api["owner_a"] and saved.business_id == api["business"]
        assert session.scalar(select(func.count()).select_from(Operation)) == 0
        assert session.scalar(select(func.count()).select_from(IdempotencyRecord)) == 0
    confirmed = post(api, sale(api, draft_id=body["id"]), "confirmed")
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["sale_balance_minor"] == 200000
    paid = post(api, repayment(confirmed.json()["operation"]["id"]))
    assert paid.json()["sale_balance_minor"] == 150000
    assert summary(api).json()["sales_minor"] == 300000
    assert post(api, sale(api, draft_id=body["id"]), "confirmed").json() == confirmed.json()
    used = post(api, sale(api, draft_id=body["id"]), "another-key")
    assert used.status_code == 409 and used.json()["error"]["code"] == "DRAFT_USED"


def test_kazakh_unknown_payment_and_duplicate_customer_require_clarification(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as session, session.begin():
        session.add(Customer(business_id=api["business"], display_name="Асқар"))
    text = "Асқарға үш мың теңгеге тауар бердім"
    response = draft(
        api,
        text=text,
        locale="kk",
        total_evidence="үш мың",
        payment_evidence=None,
        payment_status="unknown",
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["received_minor"] is None
    assert body["missing_fields"] == ["received_minor", "customer_id"]
    assert len(body["customer_candidates"]) == 2
    assert "Қазір қанша төленді?" in body["questions"]


def test_repayment_candidates_are_scoped_and_selection_is_required(ledger_api):
    api = ledger_api
    created = [post(api, sale(api)).json()["operation"]["id"] for _ in range(2)]
    other = post(
        api,
        sale(api, customer_id=str(api["other_customer"])),
        business=api["other"],
        headers=api["b"],
    )
    assert other.status_code == 200
    response = draft(
        api,
        text="Асқар вернул 500",
        kind="repayment",
        amount_minor=50000,
        total_evidence=None,
        payment_evidence=None,
        amount_evidence="500",
    )
    body = response.json()
    assert body["missing_fields"] == ["sale_id"]
    assert set(created) == {row["id"] for row in body["sale_candidates"]}
    assert body["total_minor"] is None and body["received_minor"] is None
    assert post(api, {**repayment(created[0]), "draft_id": body["id"]}).status_code == 200


def test_missing_customer_never_matches_another_business(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as session, session.begin():
        session.add(Customer(business_id=api["other"], display_name="Unique Other"))
    body = draft(api, customer_query="Unique Other").json()
    assert body["customer_candidates"] == [] and "customer_id" in body["missing_fields"]


def test_foreign_business_author_and_unknown_draft_are_not_found(ledger_api):
    api = ledger_api
    assert draft(api, business=api["other"]).status_code == 404
    assert api["app"].state.ai.calls == []
    body = draft(api).json()
    assert (
        post(
            api,
            sale(api, draft_id=body["id"], customer_id=str(api["other_customer"])),
            business=api["other"],
            headers=api["b"],
        ).status_code
        == 404
    )
    # Even a co-owner of the same shop cannot confirm another user's draft or replay its key.
    with Session(api["engine"]) as session, session.begin():
        session.add(Membership(business_id=api["business"], user_id=api["owner_b"], role="owner"))
    assert post(api, sale(api, draft_id=body["id"]), headers=api["b"]).status_code == 404
    assert post(api, sale(api, draft_id=str(uuid4()))).status_code == 404
    assert post(api, sale(api, draft_id=body["id"]), "owner-key").status_code == 200
    assert (
        post(api, sale(api, draft_id=body["id"]), "owner-key", headers=api["b"]).status_code == 404
    )


def test_expiry_and_same_key_replay_after_expiry(ledger_api):
    api = ledger_api
    first, second = draft(api).json()["id"], draft(api).json()["id"]
    result = post(api, sale(api, draft_id=first), "stable-key")
    with Session(api["engine"]) as session, session.begin():
        for id in (first, second):
            row = session.get(Draft, UUID(id))
            row.created_at -= timedelta(hours=1)
            row.expires_at -= timedelta(hours=1)
    expired = post(api, sale(api, draft_id=second))
    assert expired.status_code == 409 and expired.json()["error"]["code"] == "DRAFT_EXPIRED"
    assert post(api, sale(api, draft_id=first), "stable-key").json() == result.json()


def test_invalid_confirmation_and_rollback_leave_draft_unused(ledger_api):
    api = ledger_api
    id = draft(api).json()["id"]
    assert post(api, sale(api, draft_id=id, received_minor=400000)).status_code == 422
    assert (
        post(api, sale(api, draft_id=id, customer_id=str(api["other_customer"]))).status_code == 404
    )

    def fail(session, *_):
        if any(isinstance(row, IdempotencyRecord) for row in session.new):
            raise RuntimeError("Injected after marking consumed")

    event.listen(Session, "before_flush", fail)
    try:
        assert post(api, sale(api, draft_id=id), "retry").status_code == 500
    finally:
        event.remove(Session, "before_flush", fail)
    with Session(api["engine"]) as session:
        assert session.get(Draft, UUID(id)).consumed_operation_id is None
        assert session.scalar(select(func.count()).select_from(Operation)) == 0
    # Seller correction is accepted only by the original financial validation.
    result = post(api, sale(api, draft_id=id, total_minor=400000), "retry")
    assert result.status_code == 200 and result.json()["sale_balance_minor"] == 300000


def test_concurrent_confirmations_consume_once(ledger_api):
    api = ledger_api
    id = draft(api).json()["id"]
    barrier = Barrier(2)

    def confirm(index):
        barrier.wait(timeout=10)
        return post(api, sale(api, draft_id=id), f"confirm-{index}")

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(confirm, range(2)))
    assert sorted(response.status_code for response in results) == [200, 409]
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(Operation)) == 1


@pytest.mark.parametrize(
    "failure,status",
    [
        ("invalid json", 503),
        (httpx.ReadTimeout("synthetic secret error"), 504),
        (httpx.ConnectError("synthetic secret error"), 503),
    ],
)
def test_ai_failure_preserves_manual_entry(ledger_api, failure, status):
    api = ledger_api
    api["app"].state.ai = StubProvider(failure)
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        files={"text": (None, TEXT)},
        headers=api["a"],
    )
    assert response.status_code == status, response.text
    assert "synthetic secret" not in response.text
    assert response.json()["request_id"] == response.headers["x-request-id"]
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(Draft)) == 0
        assert session.scalar(select(func.count()).select_from(Operation)) == 0
    assert post(api, sale(api)).status_code == 200


def test_membership_revoked_during_ai_request_does_not_save(ledger_api):
    api = ledger_api

    class Revoking(StubProvider):
        async def generate(self, **kwargs):
            with Session(api["engine"]) as session, session.begin():
                row = session.get(Membership, (api["owner_a"], api["business"]))
                session.delete(row)
            return await super().generate(**kwargs)

    api["app"].state.ai = Revoking()
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        files={"text": (None, TEXT)},
        headers=api["a"],
    )
    assert response.status_code == 404
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(Draft)) == 0
