"""New empty test PostgreSQL, real JWT/HTTP/audio decoding; explicit offline AI double."""

import json

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_ai import VALID, StubProvider
from test_audio import encode
from test_ledger import post, sale
from test_stage2_reliability import PHRASES

from app.models import Customer, Draft, Operation

pytestmark = pytest.mark.postgres


def test_three_languages_text_and_real_webm_require_explicit_confirmation(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as db, db.begin():
        customer = Customer(business_id=api["business"], display_name="Айжан")
        db.add(customer)
        db.flush()
        customer_id = str(customer.id)
    blob = encode("webm", "libopus")  # Actual container, synthetic silence, not physical speech.
    for locale, transcript, payment in PHRASES:
        for audio in (False, True):
            provider = api["app"].state.ai = StubProvider(
                json.dumps(
                    {
                        **VALID,
                        "transcript": transcript,
                        "customer_query": "Айжан",
                        "payment_evidence": payment,
                    }
                )
            )
            files = (
                {"audio": ("synthetic.webm", blob, "audio/webm")}
                if audio
                else {
                    "text": (None, transcript),
                }
            )
            response = api["client"].post(
                f"/api/v1/businesses/{api['business']}/drafts",
                files={**files, "locale": (None, locale)},
                headers=api["a"],
            )
            assert response.status_code == 200, response.text
            body = response.json()
            assert (body["total_minor"], body["received_minor"]) == (300000, 100000)
            assert body["customer_candidates"] == [{"id": customer_id, "display_name": "Айжан"}]
            assert len(provider.calls) == 1
            if audio:
                assert provider.calls[0]["audio"].startswith(b"RIFF")
                assert provider.calls[0]["text"] is None
            with Session(api["engine"]) as db:
                assert db.scalar(select(func.count()).select_from(Operation)) == 0
    assert "sale_id" not in body["missing_fields"]
    payload = sale(api, draft_id=body["id"], customer_id=customer_id)
    assert post(api, payload, "stage2-explicit-confirm").status_code == 200
    assert post(api, payload, "stage2-explicit-confirm").status_code == 200
    assert post(api, payload, "stage2-new-key").status_code == 409
    assert (
        api["client"]
        .post(
            f"/api/v1/businesses/{api['business']}/drafts",
            files={"text": (None, PHRASES[0][1])},
            headers=api["b"],
        )
        .status_code
        == 404
    )
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(Operation)) == 1
        assert db.scalar(select(func.count()).select_from(Draft)) == 6


def test_ambiguous_customer_future_payment_and_unknown_name_stay_unresolved(ledger_api):
    api = ledger_api
    with Session(api["engine"]) as db, db.begin():
        db.add_all([Customer(business_id=api["business"], display_name="Айжан") for _ in range(2)])
        db.add(Customer(business_id=api["other"], display_name="Айжан"))
    transcript = "Айжанға 3000 теңгеге саттым, ертең 1000 төледі"
    api["app"].state.ai = StubProvider(
        json.dumps(
            {
                **VALID,
                "transcript": transcript,
                "customer_query": "Айжан",
                "payment_evidence": "1000 төледі",
            }
        )
    )
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        files={"text": (None, transcript), "locale": (None, "kk")},
        headers=api["a"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["received_minor"] is None
    assert set(body["missing_fields"]) >= {"received_minor", "customer_id"}
    assert len(body["customer_candidates"]) == 2  # Foreign third candidate never appears.
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(Operation)) == 0
