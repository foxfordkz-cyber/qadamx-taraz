"""Stage 7 loopback-only browser fixture: real routes/SQL, frozen OFFLINE provider.

The lookup below belongs exclusively to a test double, never production extraction.
No real provider, Supabase account, merchant records or shared database is used.
"""

import json
import sys
from pathlib import Path

import research_browser_server as fixture
import uvicorn
from diploma_browser_server import sql_snapshot
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware

from app.errors import APIError
from app.models import Business, Customer
from app.seed import demo_id

PORT = 8317
fixture.ORIGIN = f"http://127.0.0.1:{PORT}"


class FrozenProvider:
    max_attempts = 1

    def __init__(self):
        cases = json.loads(
            (Path(__file__).parent / "fixtures/extraction_stage7.json").read_text(encoding="utf-8")
        )
        self.responses = {
            row["text"]: row["provider_raw"]
            for row in cases
            if row["id"] in {"S7-022", "S7-053", "S7-096"}
        }
        self.calls = 0

    async def generate(self, *, text=None, audio=None, **_kwargs):
        self.calls += 1
        if text not in self.responses or audio is not None:
            raise APIError(503, "AI_UNAVAILABLE", "Only documented OFFLINE text fixtures")
        return self.responses[text]


def make_demo():
    app = fixture.make_fixture()
    # Test-only origin change before middleware stack is built.
    for middleware in app.user_middleware:
        if middleware.cls is CORSMiddleware:
            middleware.kwargs["allow_origins"] = ["http://127.0.0.1:4299"]
    with Session(app.state.engine) as db, db.begin():
        db.get(Business, fixture.EMPTY).name = "OFFLINE QA Stage7 · synthetic AI"
        for name in ("Асқар", "Ерлан"):
            db.add(
                Customer(
                    id=demo_id(f"stage7-{name}"),
                    business_id=fixture.EMPTY,
                    display_name=name,
                )
            )
    app.state.ai = FrozenProvider()

    @app.get("/__qa/extraction")
    def evidence():
        return {"source": "frozen OFFLINE provider responses", "calls": app.state.ai.calls}

    return app


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sql_snapshot()
    else:
        uvicorn.run(make_demo(), host="127.0.0.1", port=PORT, access_log=False)
