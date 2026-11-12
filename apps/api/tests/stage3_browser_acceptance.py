"""Explicit real Chrome / JWT / PostgreSQL acceptance, synthetic local DB only.

Supabase transport is a test double; business API, authorization, ledger and
aggregates are real. No hosted DB, AI provider, microphone or user data involved.
Run explicitly after pytest with an empty dedicated TEST_DATABASE_URL.
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


def test_stage3_customer_filters_report_financial_acceptance(ledger_api, tmp_path):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    api = ledger_api
    app = create_app(
        Settings(
            _env_file=None,
            database_url=None,
            supabase_url="",
            jwt_issuer="",
            jwt_audience="",
            ai_api_key=None,
            openai_api_key=None,
            assistant_enabled=False,
            allowed_origins=["http://127.0.0.1:4348"],
        )
    )
    app.state.engine = api["engine"]
    app.state.verifier = api["app"].state.verifier
    server = uvicorn.Server(
        uvicorn.Config(app, host="127.0.0.1", port=8348, access_log=False, log_level="warning")
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
                "other": str(api["other"]),
                "foreign_token": api["b"]["Authorization"][7:],
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
                "e2e/stage3-postgres.playwright.config.ts",
            ],
            cwd=Path(__file__).resolve().parents[2] / "web",
            env={**os.environ, "QADAM_QA_SESSION": str(session_file)},
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=540,
        )
        print(result.stdout)
        print(result.stderr)
        assert result.returncode == 0, "Browser acceptance failed; see test-results/stage3-postgres"
        with api["engine"].connect() as connection:
            result = connection.execute(
                text("""
                SELECT count(*), sum(sales_delta_minor), sum(receipts_delta_minor),
                       sum(sales_delta_minor-receipts_delta_minor)
                FROM qadam.operations WHERE business_id=:business
            """),
                {"business": api["business"]},
            ).one()
            assert tuple(result) == (4, 420000, 220000, 200000)
        print("SQL: four journal rows, sales 4200 / receipts 2200 / debt 2000 KZT.")
    finally:
        server.should_exit = True
        thread.join(timeout=10)
