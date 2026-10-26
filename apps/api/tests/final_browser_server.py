"""Loopback-only final academic fixture. Never deploy this entry point."""

import sys

import research_browser_server as fixture
import stage9_browser_server as previous
import uvicorn
from diploma_browser_server import sql_snapshot
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware

from app.models import Business

PORT = 8322
fixture.ORIGIN = f"http://127.0.0.1:{PORT}"


def candidate():
    app = previous.combined()
    for m in app.user_middleware:
        if m.cls is CORSMiddleware:
            m.kwargs["allow_origins"] = ["http://127.0.0.1:4303"]
    with Session(app.state.engine) as db, db.begin():
        db.get(Business, fixture.EMPTY).name = "OFFLINE AI · SYNTHETIC · чистая точка"
        db.get(Business, fixture.SHOP).name = "OFFLINE AI · SYNTHETIC · история 180 дней"
        db.get(Business, fixture.OTHER).name = "OFFLINE AI · SYNTHETIC · другой владелец"
    return app


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sql_snapshot()
    else:
        uvicorn.run(candidate(), host="127.0.0.1", port=PORT, access_log=False)
