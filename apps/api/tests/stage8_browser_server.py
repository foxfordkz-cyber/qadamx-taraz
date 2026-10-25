"""Stage8 combined local integration fixture; never a deployment entry point."""

import sys

import research_browser_server as fixture
import uvicorn
from diploma_browser_server import PHRASE, make_demo, sql_snapshot
from extraction_browser_server import FrozenProvider
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware

from app.models import Business, Customer
from app.seed import demo_id

PORT = 8320
fixture.ORIGIN = f"http://127.0.0.1:{PORT}"


def combined():
    app = make_demo()
    previous = app.state.ai
    frozen = FrozenProvider()

    class Combined:
        max_attempts = 1
        calls = 0

        async def generate(self, **kwargs):
            self.calls += 1
            provider = previous if kwargs.get("text") == PHRASE else frozen
            return await provider.generate(**kwargs)

    app.state.ai = Combined()
    for middleware in app.user_middleware:
        if middleware.cls is CORSMiddleware:
            middleware.kwargs["allow_origins"] = ["http://127.0.0.1:4301"]
    with Session(app.state.engine) as db, db.begin():
        db.get(Business, fixture.EMPTY).name = "OFFLINE Stage8 · synthetic provider"
        for name in ("Асқар", "Ерлан"):
            db.add(
                Customer(id=demo_id(f"stage8-{name}"), business_id=fixture.EMPTY, display_name=name)
            )

    @app.get("/__qa/extraction")
    def counts():
        return {"calls": app.state.ai.calls, "source": "OFFLINE synthetic responses"}

    return app


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sql_snapshot()
    else:
        uvicorn.run(combined(), host="127.0.0.1", port=PORT, access_log=False)
