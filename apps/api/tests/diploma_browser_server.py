"""Isolated academic demo: real app/SQL/JWT; explicitly OFFLINE provider doubles.

Never a deployment entry point. Reuses the guarded NEW EMPTY loopback fixture.
No external credentials, provider requests, production auth override or shared DB.
"""

import hashlib
import json
import sys

import uvicorn
from research_browser_server import EMPTY, PORT, SHOP, database, make_fixture
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.errors import APIError
from app.models import Business, Customer, Operation, ResearchFeedback
from app.services.assistant import Assistant

PHRASE = "Продажа 1200, оплатили сразу полностью"


class OfflineDraft:
    max_attempts = 1

    def __init__(self):
        self.calls = 0

    async def generate(self, *, text=None, audio=None, **_kwargs):
        self.calls += 1
        if text != PHRASE or audio is not None:
            raise APIError(
                503, "AI_UNAVAILABLE", "Offline fixture supports its documented text only"
            )
        return json.dumps(
            dict(
                transcript=text,
                kind="sale",
                customer_query=None,
                description="OFFLINE QA товар",
                total_minor=120000,
                received_minor=120000,
                amount_minor=None,
                payment_status="paid",
                total_evidence="1200",
                payment_evidence="полностью",
                amount_evidence=None,
                uncertain_fields=[],
            )
        )


def make_demo():
    app = make_fixture()
    with Session(app.state.engine) as db, db.begin():
        db.get(Business, EMPTY).name = "OFFLINE QA · чистая точка · AI stub"
        db.get(Business, SHOP).name = "OFFLINE QA · история 180 дней · AI stub"
    draft = OfflineDraft()
    calls = {"assistant": 0}

    async def generate(_settings, payload):
        calls["assistant"] += 1
        data = json.loads(payload)
        if data["question"] == "QA malformed":
            return "not json"
        if data["question"] == "QA unknown metric":
            return json.dumps(
                {
                    "version": "fact-bindings-v1",
                    "claims": [{"fact_id": "metric:profit"}],
                    "actions": [],
                }
            )
        ids = [fact["fact_id"] for fact in data["facts"]]
        debtor = next((key for key in ids if key.startswith("debtor:")), None)
        selected = [
            key for key in ("metric:today_sales", "metric:outstanding", debtor) if key in ids
        ]
        return json.dumps(
            {
                "version": "fact-bindings-v1",
                "claims": [{"fact_id": key} for key in selected],
                "actions": ([{"kind": "reminder_draft", "fact_id": debtor}] if debtor else [])
                + [{"kind": "open_debts", "fact_id": None}],
            }
        )

    app.state.ai = draft
    app.state.assistant = Assistant(
        Settings(_env_file=None, assistant_enabled=True, assistant_daily_limit=100),
        generate=generate,
    )

    @app.get("/__qa/integration")
    def evidence():
        return {"source": "OFFLINE synthetic provider doubles", **calls, "draft": draft.calls}

    return app


def sql_snapshot():
    engine = create_engine(database())
    with Session(engine) as db:
        journal = [
            tuple(str(value) for value in row)
            for row in db.execute(select(*Operation.__table__.columns).order_by(Operation.id))
        ]
        operations = db.scalars(
            select(Operation).where(Operation.business_id == EMPTY).order_by(Operation.created_at)
        ).all()
        print(
            json.dumps(
                {
                    "source": "isolated synthetic fixture; not merchant/participant data",
                    "all_business_ledger_sha256": hashlib.sha256(
                        json.dumps(journal).encode()
                    ).hexdigest(),
                    "operations": [
                        {
                            "id": str(o.id),
                            "kind": o.kind,
                            "sales": o.sales_delta_minor,
                            "receipts": o.receipts_delta_minor,
                        }
                        for o in operations
                    ],
                    "sales": sum(o.sales_delta_minor for o in operations),
                    "receipts": sum(o.receipts_delta_minor for o in operations),
                    "debt": sum(o.sales_delta_minor - o.receipts_delta_minor for o in operations),
                    "customers": len(
                        db.scalars(select(Customer).where(Customer.business_id == EMPTY)).all()
                    ),
                    "feedback": len(
                        db.scalars(
                            select(ResearchFeedback).where(ResearchFeedback.business_id == EMPTY)
                        ).all()
                    ),
                }
            )
        )
    engine.dispose()


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sql_snapshot()
    else:
        uvicorn.run(make_demo(), host="127.0.0.1", port=PORT, access_log=False)
