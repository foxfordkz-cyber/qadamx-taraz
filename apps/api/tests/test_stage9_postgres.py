"""Actual local JWT/routes/SQL with simulated OpenAI HTTP, not live model output."""

import asyncio
import json
from uuid import uuid4

import httpx
import pytest
from sqlalchemy.orm import Session
from test_ai import TEXT, VALID
from test_extraction_postgres import count, request_draft
from test_ledger import post, repayment, sale, summary
from test_openai import completion, settings, transport

from app.errors import APIError
from app.models import Customer, Draft, Operation
from app.services.ai import extract
from app.services.ai_provider import LimitedFallback
from app.services.openai_provider import OpenAIProvider

pytestmark = pytest.mark.postgres


@pytest.mark.parametrize(
    "fault", ["duplicate_inner", "duplicate_envelope", "unexpected", "malformed"]
)
def test_openai_invalid_raw_response_never_persists_draft_or_money(ledger_api, monkeypatch, fault):
    api = ledger_api
    calls = []

    def handler(request):
        calls.append(request)
        body = completion()
        raw = json.dumps(VALID)
        if fault == "duplicate_inner":
            raw = raw[:-1] + ',"received_minor":100000}'
        elif fault == "unexpected":
            raw = json.dumps({**VALID, "balance_minor": 0})
        elif fault == "malformed":
            raw = '{"kind":'
        body["output"][0]["content"][0]["text"] = raw
        wire = json.dumps(body)
        if fault == "duplicate_envelope":
            wire = wire[:-1] + ',"status":"completed"}'
        return httpx.Response(200, content=wire)

    transport(monkeypatch, handler)
    api["app"].state.ai = OpenAIProvider(settings())
    url = f"/api/v1/businesses/{api['business']}/drafts"
    assert api["client"].post(url, files={"text": (None, TEXT)}).status_code == 401
    assert (
        api["client"].post(url, headers=api["b"], files={"text": (None, TEXT)}).status_code == 404
    )
    assert not calls
    response = api["client"].post(url, headers=api["a"], files={"text": (None, TEXT)})
    assert response.status_code == 503 and response.json()["error"]["code"] == "AI_UNAVAILABLE"
    assert len(calls) == 1 and count(api, Draft) == count(api, Operation) == 0


def test_repaired_genitive_retains_customer_choice_and_tenant_scope(ledger_api):
    api = ledger_api
    local_ids = [uuid4(), uuid4()]
    with Session(api["engine"]) as db, db.begin():
        for ident in local_ids:
            db.add(Customer(id=ident, business_id=api["business"], display_name="Самат"))
        db.add(Customer(id=uuid4(), business_id=api["other"], display_name="Самат"))
    body = request_draft(
        api,
        "Саматтың тауар бағасы 3000. Получено 1000.",
        customer_query="Самат",
        total_evidence="3000",
        payment_evidence="Получено 1000",
    ).json()
    assert {c["id"] for c in body["customer_candidates"]} == {str(i) for i in local_ids}
    assert body["missing_fields"] == ["customer_id"]
    assert (body["total_minor"], body["received_minor"]) == (300000, 100000)
    assert count(api, Operation) == 0
    first = post(api, sale(api, draft_id=body["id"], customer_id=str(local_ids[0])), "s9-sale")
    assert first.status_code == 200 and first.json()["sale_balance_minor"] == 200000
    assert (
        post(api, sale(api, draft_id=body["id"], customer_id=str(local_ids[0])), "s9-sale").json()
        == first.json()
    )
    assert count(api, Operation) == 1
    sale_id = first.json()["operation"]["id"]
    paid = post(api, repayment(sale_id), "s9-repay")
    assert paid.status_code == 200 and paid.json()["sale_balance_minor"] == 150000
    undo = api["client"].post(
        f"/api/v1/businesses/{api['business']}/operations/{paid.json()['operation']['id']}/reverse",
        headers={**api["a"], "Idempotency-Key": "s9-reverse"},
        json={"description": "Synthetic correction"},
    )
    assert undo.status_code == 200
    assert summary(api).json()["outstanding_minor"] == 200000
    assert count(api, Operation) == 3


def test_validation_error_does_not_trigger_paid_fallback(ledger_api, monkeypatch):
    from test_ai import StubProvider

    secondary = StubProvider()
    transport(
        monkeypatch,
        lambda _: httpx.Response(200, content='{"status":"completed","status":"completed"}'),
    )
    provider = LimitedFallback(OpenAIProvider(settings()), secondary, 1)
    with pytest.raises(APIError):
        asyncio.run(extract(provider, text=TEXT))
    assert secondary.calls == []
