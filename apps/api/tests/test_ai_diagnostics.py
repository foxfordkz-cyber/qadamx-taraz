"""Explicit doubles verify log metadata/redaction; these are not live Gemini checks."""

import asyncio
import json
import logging
from uuid import uuid4

import httpx
import pytest
from test_ai import TEXT, VALID, StubProvider

from app.config import Settings
from app.errors import APIError
from app.services.ai import GeminiProvider, extract
from app.services.ai_diagnostics import diagnostic_request, request_id

LOGGER = "uvicorn.error.qadam.ai"
PRIVATE = "synthetic-private-payload-do-not-log"


def events(caplog):
    records = [r for r in caplog.records if r.name == LOGGER]
    for record in records:
        assert record.exc_info is None
        assert PRIVATE not in record.getMessage() and TEXT not in record.getMessage()
    return [json.loads(r.getMessage()) for r in records]


@pytest.mark.parametrize("status", [400, 429, 503])
def test_provider_status_is_preserved_without_key_body_or_exception_text(
    caplog, monkeypatch, status
):
    caplog.set_level(logging.INFO, logger=LOGGER)
    real_client = httpx.AsyncClient
    calls = []

    def handle(request):
        calls.append(request)
        return httpx.Response(status, json={"error": {"message": PRIVATE}})

    monkeypatch.setattr(
        "app.services.ai.httpx.AsyncClient",
        lambda **kwargs: real_client(**kwargs, transport=httpx.MockTransport(handle)),
    )
    provider = GeminiProvider(Settings(_env_file=None, ai_api_key=PRIVATE, ai_model="gemini-test"))
    identity = uuid4()
    with diagnostic_request(identity), pytest.raises(APIError):
        asyncio.run(extract(provider, text=PRIVATE, audio=PRIVATE.encode()))
    captured = events(caplog)
    failure = next(e for e in captured if e["stage"] == "provider_http")
    assert failure["provider_status"] == status and failure["error_type"] == "HTTPStatusError"
    assert all(e["request_id"] == str(identity) and e["duration_ms"] >= 0 for e in captured)
    assert request_id.get() == "-" and len(calls) == 1


@pytest.mark.parametrize("failure", ["timeout", "validation", "configuration"])
def test_failure_stage_distinguishes_timeout_validation_configuration(caplog, failure):
    caplog.set_level(logging.INFO, logger=LOGGER)
    provider = {
        "timeout": StubProvider(httpx.ReadTimeout(PRIVATE)),
        "validation": StubProvider(PRIVATE),
        "configuration": GeminiProvider(Settings(_env_file=None, ai_api_key=None, ai_model="")),
    }[failure]
    with diagnostic_request(uuid4()), pytest.raises(APIError):
        asyncio.run(extract(provider, text=PRIVATE))
    captured = events(caplog)
    if failure == "timeout":
        assert captured[-1]["error_code"] == "AI_TIMEOUT"
    else:
        assert any(e["stage"] == failure and e["error_type"] for e in captured)
    assert all(e["provider_status"] is None for e in captured)


def test_concurrent_requests_keep_independent_correlation(caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)

    class Slow(StubProvider):
        async def generate(self, **kwargs):
            await asyncio.sleep(0.01)
            return await super().generate(**kwargs)

    identities = [str(uuid4()), str(uuid4())]

    async def run(identity):
        with diagnostic_request(identity):
            await extract(Slow(json.dumps(VALID)), text=TEXT)

    async def both():
        await asyncio.gather(*(run(identity) for identity in identities))

    asyncio.run(both())
    captured = events(caplog)
    for identity in identities:
        assert [e["stage"] for e in captured if e["request_id"] == identity] == [
            "validation",
            "extraction",
        ]
    assert request_id.get() == "-"


def test_deadline_logs_cancelled_transport_then_ai_timeout(caplog, monkeypatch):
    caplog.set_level(logging.INFO, logger=LOGGER)
    real_client = httpx.AsyncClient

    async def handle(request):
        await asyncio.sleep(1)
        return httpx.Response(200, json={})

    monkeypatch.setattr(
        "app.services.ai.httpx.AsyncClient",
        lambda **kwargs: real_client(**kwargs, transport=httpx.MockTransport(handle)),
    )
    provider = GeminiProvider(Settings(_env_file=None, ai_api_key=PRIVATE, ai_model="gemini-test"))
    with diagnostic_request(uuid4()), pytest.raises(APIError):
        asyncio.run(extract(provider, text=PRIVATE, timeout_seconds=0.01))
    captured = events(caplog)
    transport = next(e for e in captured if e["stage"] == "provider_http")
    assert transport["error_type"] == "CancelledError" and transport["provider_status"] is None
    assert captured[-1]["error_code"] == "AI_TIMEOUT"


@pytest.mark.postgres
def test_http_error_correlates_audio_stage_with_response_id(ledger_api, caplog):
    caplog.set_level(logging.INFO, logger=LOGGER)
    api = ledger_api
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        headers=api["a"],
        files={"audio": ("private-name.webm", PRIVATE.encode(), "audio/webm")},
    )
    assert response.status_code == 415
    captured = events(caplog)
    assert all(e["request_id"] == response.headers["x-request-id"] for e in captured)
    assert any(
        e["stage"] == "audio_decode" and e["error_code"] == "AUDIO_UNSUPPORTED" for e in captured
    )
    assert "private-name.webm" not in caplog.text
