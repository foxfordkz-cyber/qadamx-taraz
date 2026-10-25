import asyncio
import copy
import json
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_ai import TEXT, VALID, StubProvider
from test_openai import completion, settings, transport

from app.errors import APIError
from app.models import Customer, Operation
from app.services.ai import extract
from app.services.drafts import save_draft
from app.services.openai_provider import OpenAIProvider
from tools.stage8_eval.evaluate import (
    FIELDS,
    analyze,
    implementations,
    load_corpus,
    project,
    ready,
    run,
    summarize,
)


def test_stage8_freeze_is_unchanged_and_guard_refuses_relabeling_new_runtime():
    rows, _ = load_corpus()
    assert len(rows) == 120
    assert {lang: sum(r["language"] == lang for r in rows) for lang in ("ru", "kk", "mixed")} == {
        "ru": 40,
        "kk": 40,
        "mixed": 40,
    }
    with pytest.raises(ValueError, match="Stage7 implementation changed"):
        implementations()


def test_metric_denominators_do_not_hide_invalid_or_uncertain_cases():
    rows, _ = load_corpus()
    exact = [{**r, "before": {"result": r["expected"]}} for r in rows]
    scores = summarize(exact, "before")
    assert scores["transaction_type"]["denominator"] == 108
    assert scores["sales_amount"]["denominator"] == 84
    assert scores["repayment_amount"]["denominator"] == 12
    assert scores["invalid_rejected"]["denominator"] == 12
    assert scores["full_all"]["numerator"] == 120
    assert scores["unsafe_ready"]["numerator"] == 0
    assert summarize([], "before")["full_all"]["rate"] is None


def test_false_rejection_and_conservative_loss_are_different():
    case = load_corpus()[0][0]
    before = copy.deepcopy(case["expected"])
    after = {**before, "received_minor": None, "clarification_fields": ["received_minor"]}
    row = {**case, "before": {"result": before}, "after": {"result": after}}
    assert ready(before) and not ready(after)
    assert analyze(row)["regressed"] and analyze(row)["more_conservative"]
    assert summarize([row], "after")["false_output_rejection"]["numerator"] == 0


def test_duplicate_key_core_and_openai_adapter_both_reject_after_stage9(monkeypatch):
    """Stage8's recorded failure now rejects before OpenAI re-encoding."""
    raw = json.dumps(VALID)[:-1] + ',"received_minor":100000}'
    direct = copy.deepcopy(load_corpus()[0][-1])
    direct.update(input=TEXT, provider_raw=raw)
    assert asyncio.run(run(extract, direct))["result"]["outcome"] == "unavailable"

    def handler(request):
        body = completion()
        body["output"][0]["content"][0]["text"] = raw
        return httpx.Response(200, json=body)

    transport(monkeypatch, handler)
    provider = OpenAIProvider(settings())
    with pytest.raises(APIError) as exc:
        asyncio.run(extract(provider, text=TEXT))
    assert exc.value.code == "AI_UNAVAILABLE"


@pytest.mark.postgres
@pytest.mark.parametrize("case_index", list(range(36, 48)) + [0, 24])
def test_offline_candidate_and_clarification_projection_matches_postgres(ledger_api, case_index):
    case = load_corpus()[0][case_index]
    api = ledger_api
    refs = {}
    with Session(api["engine"]) as db, db.begin():
        for customer in case["customers"]:
            ident = uuid4()
            refs[str(ident)] = customer["ref"]
            db.add(
                Customer(
                    id=ident,
                    display_name=customer["name"],
                    business_id=api["business"]
                    if customer["business"] == "shop-a"
                    else api["other"],
                )
            )
    provider = StubProvider(case["provider_raw"])
    provider.max_attempts = 1
    extraction = asyncio.run(extract(provider, text=case["input"]))
    offline = project(extraction, case)
    with Session(api["engine"]) as db:
        actual = save_draft(db, api["business"], api["owner_a"], extraction, "kk")
        fields = {
            "outcome": "draft",
            "kind": actual.kind,
            "total_minor": actual.total_minor,
            "received_minor": actual.received_minor,
            "amount_minor": actual.amount_minor,
            "customer_query": actual.customer_query,
            "customer_refs": sorted(refs[str(c.id)] for c in actual.customer_candidates),
            "clarification_fields": sorted(actual.missing_fields),
        }
        assert {f: offline[f] for f in FIELDS} == fields
        assert db.scalar(select(func.count()).select_from(Operation)) == 0
        assert all(
            c.business_id == api["business"]
            for c in db.scalars(
                select(Customer).where(Customer.id.in_([c.id for c in actual.customer_candidates]))
            )
        )
