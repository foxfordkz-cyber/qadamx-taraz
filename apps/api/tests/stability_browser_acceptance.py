"""Opt-in real Chrome → FastAPI/JWT → isolated PostgreSQL acceptance.

Run this file explicitly with pytest after the default backend suite. Only the
Supabase sign-in transport is synthetic; all business reads/writes are real.
The regular pg_engine fixture rejects nonempty/non-test databases.
"""

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

import uvicorn
from sqlalchemy import text

from app.config import Settings
from app.main import create_app


def test_browser_finance_and_ai_failure(ledger_api, tmp_path):
    # Windows redirected terminals may default to cp1251, which lacks the KZT symbol.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    api = ledger_api
    web = Path(__file__).resolve().parents[2] / "web"
    app = create_app(
        Settings(
            _env_file=None,
            database_url=None,
            supabase_url="",
            jwt_issuer="",
            jwt_audience="",
            ai_api_key=None,
            ai_model="",
            allowed_origins=["http://127.0.0.1:4338"],
        )
    )
    app.state.engine = api["engine"]
    app.state.verifier = api["app"].state.verifier
    server = uvicorn.Server(
        uvicorn.Config(app, host="127.0.0.1", port=8338, access_log=False, log_level="warning")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    session_file = tmp_path / "synthetic-session.json"
    session_file.write_text(
        json.dumps(
            {
                "token": api["a"]["Authorization"][7:],
                "user": str(api["owner_a"]),
                "business": str(api["business"]),
            }
        )
    )
    try:
        deadline = time.monotonic() + 15
        while not server.started and time.monotonic() < deadline:
            time.sleep(0.05)
        assert server.started
        result = subprocess.run(
            [
                "node",
                "node_modules/@playwright/test/cli.js",
                "test",
                "-c",
                "e2e/stability-postgres.playwright.config.ts",
            ],
            cwd=web,
            env={**os.environ, "QADAM_QA_SESSION": str(session_file)},
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=240,
        )
        print(result.stdout)
        print(result.stderr)
        assert result.returncode == 0, (
            "See Playwright output; do not claim browser acceptance passed"
        )
        with api["engine"].connect() as connection:
            totals = connection.execute(
                text("""
                SELECT count(*), sum(sales_delta_minor), sum(receipts_delta_minor),
                       sum(sales_delta_minor - receipts_delta_minor)
                FROM qadam.operations WHERE business_id=:business
            """),
                {"business": api["business"]},
            ).one()
            assert tuple(totals) == (4, 420000, 220000, 200000)
        print("SQL verified: 4 journal rows; 4200 / 2200 / 2000 KZT; no AI-created operations")
    finally:
        server.should_exit = True
        thread.join(timeout=10)
