"""Stage 2: real Chrome → FastAPI/JWT → isolated PostgreSQL; mock AI only.

Run this file explicitly with pytest after the default backend suite. Supabase
sign-in and AI generation are synthetic; all business reads/writes are real.
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
from test_ai import VALID
from test_audio import wav_bytes
from test_stage2_reliability import PHRASES

from app.config import Settings
from app.errors import APIError
from app.main import create_app
from app.services.assistant import Assistant


class OfflineExtraction:
    """Explicit test double: actual audio decoding, no speech-recognition claim."""

    def __init__(self):
        self.calls = 0

    async def generate(self, *, text, audio, locale, retry):
        self.calls += 1
        assert retry is False
        if audio is not None:
            assert audio.startswith(b"RIFF")
            text = PHRASES[2][1]
        match = next((item for item in PHRASES if item[1] == text), None)
        if match is None:
            raise APIError(503, "AI_UNAVAILABLE", "Offline acceptance boundary")
        return json.dumps(
            {**VALID, "transcript": text, "customer_query": "Айжан", "payment_evidence": match[2]},
            ensure_ascii=False,
        )


async def offline_assistant(_settings, payload):
    data = json.loads(payload)
    assert data["locale"] in ("ru", "kk")
    return json.dumps(
        {
            "version": "fact-bindings-v1",
            "claims": [
                {"fact_id": "metric:today_sales"},
                {"fact_id": "metric:today_receipts"},
                {"fact_id": "metric:outstanding"},
            ],
            "actions": [],
        }
    )


def test_stage2_browser_drafts_confirmation_finance_and_assistant(ledger_api, tmp_path):
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
    app.state.ai = OfflineExtraction()
    app.state.assistant = Assistant(
        Settings(_env_file=None, assistant_enabled=True, ai_api_key=None, openai_api_key=None),
        generate=offline_assistant,
    )
    app.state.engine = api["engine"]
    app.state.verifier = api["app"].state.verifier
    server = uvicorn.Server(
        uvicorn.Config(app, host="127.0.0.1", port=8338, access_log=False, log_level="warning")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    audio_path = tmp_path / "synthetic-silence.wav"
    audio_path.write_bytes(wav_bytes())
    session_file = tmp_path / "synthetic-session.json"
    session_file.write_text(
        json.dumps(
            {
                "token": api["a"]["Authorization"][7:],
                "user": str(api["owner_a"]),
                "business": str(api["business"]),
                "audio_path": str(audio_path),
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
                "e2e/stage2-postgres.playwright.config.ts",
            ],
            cwd=web,
            env={**os.environ, "QADAM_QA_SESSION": str(session_file)},
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=360,
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
        assert app.state.ai.calls == 4  # Three successful drafts, one explicit failure; no retry.
        print("SQL verified: 4 journal rows; 4200 / 2200 / 2000 KZT; no AI-created operations")
    finally:
        server.should_exit = True
        thread.join(timeout=10)
