"""Real JWT/HTTP/PostgreSQL; deliberately faulty offline extraction responses."""

import json
from uuid import UUID

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_ai import VALID, StubProvider
from test_ledger import post, repayment, sale, summary

from app.models import Draft, Operation

pytestmark = pytest.mark.postgres


def request_draft(api, text, **changes):
    provider = StubProvider(json.dumps({**VALID, **changes}))
    provider.max_attempts = 1
    api["app"].state.ai = provider
    return api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        files={"text": (None, text), "locale": (None, "kk")},
        headers=api["a"],
    )


def count(api, model):
    with Session(api["engine"]) as db:
        return db.scalar(select(func.count()).select_from(model))


def test_grounded_kazakh_amount_and_receipt_persist_only_after_confirmation(ledger_api):
    api = ledger_api
    response = request_draft(
        api,
        "Асқарға үш мың теңгеге тауар бердім, мыңын төледі",
        total_minor=3000,
        received_minor=3000,
        payment_status="paid",
        total_evidence="үш мың теңге",
        payment_evidence="мыңын төледі",
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["total_minor"], body["received_minor"]) == (300000, 100000)
    assert body["missing_fields"] == [] and body["customer_candidates"][0]["id"] == str(
        api["customer"]
    )
    assert count(api, Operation) == 0 and count(api, Draft) == 1
    with Session(api["engine"]) as db:
        assert db.get(Draft, UUID(body["id"])).response_json["received_minor"] == 100000
    operation = post(api, sale(api, draft_id=body["id"]), "stage7-confirm")
    assert operation.status_code == 200 and operation.json()["sale_balance_minor"] == 200000
    assert post(api, sale(api, draft_id=body["id"]), "stage7-confirm").json() == operation.json()
    assert count(api, Operation) == 1


def test_grounded_repayment_still_requires_scoped_sale_selection(ledger_api):
    api = ledger_api
    sale_id = post(api, sale(api)).json()["operation"]["id"]
    body = request_draft(
        api,
        "Асқар тағы бес жүз теңге қайтарды",
        kind="repayment",
        amount_minor=500,
        total_evidence=None,
        payment_evidence=None,
        amount_evidence="бес жүз теңге",
    ).json()
    assert body["amount_minor"] == 50000 and body["missing_fields"] == ["sale_id"]
    assert [item["id"] for item in body["sale_candidates"]] == [sale_id]
    assert count(api, Operation) == 1
    confirmed = post(api, {**repayment(sale_id), "draft_id": body["id"]})
    assert confirmed.status_code == 200 and confirmed.json()["sale_balance_minor"] == 150000
    assert summary(api).json()["sales_minor"] == 300000


@pytest.mark.parametrize(
    "text,query",
    [
        ("Асқар или Ерлан купил товар за 3000, оплатил 1000", "Асқар"),
        ("Тауар 3000, оплатил 1000", "Асқар"),
    ],
)
def test_unsupported_customer_is_not_bound_to_an_existing_customer(ledger_api, text, query):
    api = ledger_api
    body = request_draft(api, text, customer_query=query, payment_evidence="оплатил 1000").json()
    assert body["customer_query"] is None and body["customer_candidates"] == []
    assert "customer_id" in body["missing_fields"]
    assert count(api, Operation) == 0


def test_unknown_payment_is_saved_as_null_with_kazakh_question(ledger_api):
    api = ledger_api
    body = request_draft(
        api,
        "Асқарға үш мыңға саттым, қалғаны кейін",
        total_evidence="үш мың",
        payment_evidence="қалғаны кейін",
        payment_status="debt",
        received_minor=0,
    ).json()
    assert body["received_minor"] is None and "received_minor" in body["missing_fields"]
    assert "Қазір қанша төленді?" in body["questions"]
    assert count(api, Operation) == 0


def test_substring_amount_is_clarification_not_a_wrong_sale(ledger_api):
    api = ledger_api
    body = request_draft(
        api,
        "Асқар купил за 1500, оплатил 1000",
        total_minor=50000,
        total_evidence="500",
        payment_evidence="оплатил 1000",
    ).json()
    assert body["total_minor"] is None and "total_minor" in body["missing_fields"]
    assert count(api, Operation) == 0


def test_duplicate_provider_field_fails_without_even_a_draft(ledger_api):
    api = ledger_api
    provider = StubProvider(json.dumps(VALID)[:-1] + ',"total_minor": 999999}')
    provider.max_attempts = 1
    api["app"].state.ai = provider
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        files={"text": (None, VALID["transcript"]), "locale": (None, "ru")},
        headers=api["a"],
    )
    assert response.status_code == 503 and response.json()["error"]["code"] == "AI_UNAVAILABLE"
    assert count(api, Draft) == count(api, Operation) == 0 and len(provider.calls) == 1
