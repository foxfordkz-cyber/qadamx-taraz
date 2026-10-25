"""Gold is fixed; candidate parity and financial safety are separate assertions."""

import asyncio
import json
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_ai import StubProvider

from app.models import Customer, Operation
from app.services.ai import extract
from app.services.drafts import save_draft
from tools.stage8_eval.evaluate import ROOT, project, run
from tools.stage10_eval.evaluate import baseline, corpus


def test_new_challenge_freeze_and_separate_strata():
    rows, _ = corpus()
    assert len({r["id"] for r in rows}) == 42
    assert len([r for r in rows if r["expected"]["outcome"] == "draft"]) == 33
    assert all(sum(r["language"] == lang for r in rows) == 14 for lang in ("ru", "kk", "mixed"))
    old_stage7 = json.loads(
        (ROOT / "apps/api/tests/fixtures/extraction_stage7.json").read_text(encoding="utf-8")
    )
    old_stage8 = [
        json.loads(line)
        for line in (ROOT / "docs/diploma-evidence/ai-evaluation-stage8/dataset.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()
    ]
    assert not {r["input"] for r in rows} & (
        {r["text"] for r in old_stage7} | {r["input"] for r in old_stage8}
    )


def test_candidate_does_not_regress_from_verified_stage9_on_new_challenge():
    async def compare():
        old = baseline()
        for case in corpus()[0]:
            before, after = await run(old, case), await run(extract, case)
            # This checks preservation, not a disguised claim all gold is correct.
            if before["result"] == case["expected"]:
                assert after["result"] == case["expected"], case["id"]

    asyncio.run(compare())


@pytest.mark.postgres
@pytest.mark.parametrize("case", corpus()[0][:33], ids=lambda c: c["id"])
def test_challenge_customer_projection_matches_real_sql_without_financial_write(ledger_api, case):
    api = ledger_api
    refs = {}
    with Session(api["engine"]) as db, db.begin():
        for c in case["customers"]:
            ident = uuid4()
            refs[str(ident)] = c["ref"]
            db.add(
                Customer(
                    id=ident,
                    display_name=c["name"],
                    business_id=api["business"] if c["business"] == "local" else api["other"],
                )
            )
    provider = StubProvider(case["provider_raw"])
    provider.max_attempts = 1
    value = asyncio.run(extract(provider, text=case["input"]))
    offline = project(value, case)
    with Session(api["engine"]) as db:
        draft = save_draft(
            db,
            api["business"],
            api["owner_a"],
            value,
            case["language"] if case["language"] != "mixed" else "auto",
        )
        assert (
            sorted(refs[str(c.id)] for c in draft.customer_candidates) == offline["customer_refs"]
        )
        assert sorted(draft.missing_fields) == offline["clarification_fields"]
        assert db.scalar(select(func.count()).select_from(Operation)) == 0
