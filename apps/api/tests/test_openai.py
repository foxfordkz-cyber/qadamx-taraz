"""OpenAI protocol/error/cancellation tests use explicit doubles, never paid API calls."""

import asyncio
import json
import logging
import socket
import threading
import time

import httpx
import pytest
import uvicorn
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_ai import TEXT, VALID, StubProvider
from test_audio import wav_bytes

from app.config import Settings
from app.errors import APIError
from app.models import Draft, Operation
from app.services.ai import GeminiProvider, extract
from app.services.ai_provider import LimitedFallback, ProviderPlan
from app.services.ai_request import extract_connected
from app.services.openai_provider import OpenAIProvider


@pytest.fixture(autouse=True)
def isolated_ai_log_capture(monkeypatch, caplog):
    # Recovery's real Uvicorn tests configure parent loggers. Capture this logger
    # directly so privacy/usage assertions do not depend on suite execution order.
    logger = logging.getLogger("uvicorn.error.qadam.ai")
    monkeypatch.setattr(logger, "handlers", [caplog.handler])
    monkeypatch.setattr(logger, "propagate", False)


def settings(**changes):
    return Settings(
        _env_file=None,
        **{
            "openai_api_key": "synthetic-private-openai-key",
            "openai_model": "gpt-6-luna",
            "openai_transcription_model": "gpt-4o-mini-transcribe-2025-12-15",
            **changes,
        },
    )


def completion(**changes):
    return {
        "status": "completed",
        "output": [
            {"type": "message", "content": [{"type": "output_text", "text": json.dumps(VALID)}]}
        ],
        "usage": {"input_tokens": 100, "output_tokens": 50},
        **changes,
    }


def transport(monkeypatch, handler):
    real = httpx.AsyncClient
    monkeypatch.setattr(
        "app.services.openai_provider.httpx.AsyncClient",
        lambda **kw: real(**kw, transport=httpx.MockTransport(handler)),
    )


def test_explicit_provider_and_fallback_default_off():
    assert isinstance(ProviderPlan(settings()).for_request(), GeminiProvider)
    assert isinstance(ProviderPlan(settings(ai_provider="openai")).for_request(), OpenAIProvider)
    plan = ProviderPlan(settings(ai_fallback_openai=True))
    assert isinstance(plan.for_request(), LimitedFallback)
    assert plan.for_request() is not plan.for_request()


def test_openai_strict_schema_no_tools_no_storage_and_safe_usage(monkeypatch, caplog):
    captured = []
    caplog.set_level(logging.INFO, logger="uvicorn.error.qadam.ai")

    def handler(request):
        captured.append(request)
        return httpx.Response(200, json=completion())

    transport(monkeypatch, handler)
    result = asyncio.run(extract(OpenAIProvider(settings()), text=TEXT))
    assert result.total_minor == 300000 and result.received_minor == 100000
    request = captured[0]
    assert len(captured) == 1 and request.url == "https://api.openai.com/v1/responses"
    body = json.loads(request.content)
    assert body["store"] is False and body["background"] is False and "tools" not in body
    assert body["max_output_tokens"] == 2048 and body["reasoning"]["effort"] == "none"
    fmt = body["text"]["format"]
    assert fmt["strict"] and fmt["schema"]["additionalProperties"] is False
    assert set(fmt["schema"]["required"]) == set(fmt["schema"]["properties"])
    assert request.headers["authorization"] == "Bearer synthetic-private-openai-key"
    assert "synthetic-private-openai-key" not in caplog.text and TEXT not in caplog.text
    record = next(
        json.loads(r.message)
        for r in caplog.records
        if r.name == "uvicorn.error.qadam.ai" and '"openai_extraction"' in r.message
    )
    assert record["provider"] == "openai" and record["model"] == "gpt-6-luna"
    assert record["cost_estimate_usd"] == 0.000035
    assert record["request_body_bytes"] == len(request.content)
    assert record["input_chars"] == len(TEXT)


def test_audio_and_identical_transcript_use_identical_extraction_request(monkeypatch):
    bodies = []

    def handler(request):
        if request.url.path.endswith("transcriptions"):
            return httpx.Response(200, json={"text": TEXT})
        bodies.append(request.content)
        return httpx.Response(200, json=completion())

    transport(monkeypatch, handler)
    provider = OpenAIProvider(settings(openai_transcription_model="gpt-transcribe"))
    audio_result = asyncio.run(extract(provider, audio=wav_bytes()))
    text_result = asyncio.run(extract(provider, text=audio_result.transcript))
    assert audio_result == text_result and bodies[0] == bodies[1]


def test_audio_transcribed_once_and_stt_is_authoritative(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request)
        if request.url.path.endswith("transcriptions"):
            assert b"audio/wav" in request.content and b"gpt-4o-mini-transcribe" in request.content
            return httpx.Response(200, json={"text": TEXT})
        return httpx.Response(
            200,
            json=completion(
                output=[
                    {
                        "type": "message",
                        "content": [
                            {
                                "type": "output_text",
                                "text": json.dumps({**VALID, "transcript": "invented"}),
                            }
                        ],
                    }
                ]
            ),
        )

    transport(monkeypatch, handler)
    result = asyncio.run(extract(OpenAIProvider(settings()), audio=wav_bytes()))
    assert result.transcript == TEXT and len(calls) == 2
    assert json.loads(calls[1].content)["input"] == json.dumps(
        {"locale": "auto", "text": TEXT}, ensure_ascii=False
    )


@pytest.mark.parametrize(
    "transcript,reason,chars",
    [
        ({}, "missing_text", None),
        ({"text": None}, "wrong_text_type", None),
        ({"text": ["private sentinel"]}, "wrong_text_type", None),
        ({"text": " \n\t"}, "empty_text", 0),
        ({"text": "private sentinel" * 300}, "text_too_long", 4800),
    ],
)
def test_invalid_transcript_is_diagnosed_without_extraction_or_leak(
    monkeypatch, caplog, transcript, reason, chars
):
    calls = []
    caplog.set_level(logging.INFO, logger="uvicorn.error.qadam.ai")

    def handler(request):
        calls.append(request.url.path)
        return httpx.Response(200, json=transcript)

    transport(monkeypatch, handler)
    with pytest.raises(APIError) as error:
        asyncio.run(
            extract(
                OpenAIProvider(settings(openai_transcription_model="gpt-transcribe")),
                audio=wav_bytes(),
            )
        )
    assert error.value.code == "AI_UNAVAILABLE"
    assert calls == ["/v1/audio/transcriptions"]
    events = [json.loads(r.message) for r in caplog.records]
    event = next(e for e in events if e["stage"] == "openai_transcript_validation")
    assert event["validation_reason"] == reason and event["input_chars"] == chars
    assert event["provider"] == "openai" and event["model"] == "gpt-transcribe"
    assert event["error_type"] == "ValidationError"
    assert "private sentinel" not in caplog.text
    assert "synthetic-private-openai-key" not in caplog.text


def test_multilingual_transcribe_hints_and_duration_cost(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger="uvicorn.error.qadam.ai")

    def handler(request):
        if request.url.path.endswith("transcriptions"):
            assert request.content.count(b'name="languages[]"') == 2
            assert b"\r\nru\r\n" in request.content and b"\r\nkk\r\n" in request.content
            assert b'name="language"' not in request.content
            return httpx.Response(200, json={"text": TEXT})
        return httpx.Response(200, json=completion())

    transport(monkeypatch, handler)
    asyncio.run(
        extract(
            OpenAIProvider(settings(openai_transcription_model="gpt-transcribe")), audio=wav_bytes()
        )
    )
    event = next(
        json.loads(r.message)
        for r in caplog.records
        if r.name == "uvicorn.error.qadam.ai" and '"openai_transcription"' in r.message
    )
    assert event["audio_seconds"] == 1 and event["cost_estimate_usd"] == 0.000075


def test_transcription_and_extraction_share_one_deadline(monkeypatch):
    calls = []

    async def handler(request):
        calls.append(request.url.path)
        await asyncio.sleep(0.2 if len(calls) == 1 else 1)
        return httpx.Response(200, json={"text": TEXT} if len(calls) == 1 else completion())

    transport(monkeypatch, handler)
    with pytest.raises(APIError) as error:
        asyncio.run(extract(OpenAIProvider(settings()), audio=wav_bytes(), timeout_seconds=0.5))
    assert error.value.code == "AI_TIMEOUT" and len(calls) == 2


def test_cancel_during_fallback_discards_late_response():
    class Late:
        async def generate(self, **kwargs):
            try:
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                return json.dumps(VALID)

    with pytest.raises(APIError) as error:
        asyncio.run(
            extract(
                LimitedFallback(StubProvider(http_error(503)), Late(), 0.01),
                text=TEXT,
                timeout_seconds=0.03,
            )
        )
    assert error.value.code == "AI_TIMEOUT"


@pytest.mark.parametrize("status", [400, 401, 403, 429, 503])
def test_provider_failure_no_retry_or_leak(monkeypatch, status, caplog):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(status, json={"error": {"message": "private response sentinel"}})

    transport(monkeypatch, handler)
    with pytest.raises(APIError) as error:
        asyncio.run(extract(OpenAIProvider(settings()), text=TEXT))
    expected = "AI_QUOTA_EXCEEDED" if status == 429 else "AI_UNAVAILABLE"
    assert error.value.code == expected and len(calls) == 1
    assert "private response sentinel" not in caplog.text


@pytest.mark.parametrize(
    "body",
    [
        {"status": "incomplete", "output": []},
        completion(output=[{"type": "message", "content": [{"type": "refusal"}]}]),
        completion(output=None),
        completion(output=[None]),
        completion(output=[{"type": "message", "content": None}]),
        completion(
            output=[{"type": "message", "content": [{"type": "output_text", "text": "bad"}]}]
        ),
    ],
)
def test_invalid_output_never_retries_paid_call(monkeypatch, body):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json=body)

    transport(monkeypatch, handler)
    with pytest.raises(APIError):
        asyncio.run(extract(OpenAIProvider(settings()), text=TEXT))
    assert len(calls) == 1


def http_error(status):
    request = httpx.Request("POST", "https://example.test")
    return httpx.HTTPStatusError(
        "private", request=request, response=httpx.Response(status, request=request)
    )


@pytest.mark.parametrize("error", [http_error(503), httpx.ReadTimeout("private")])
def test_fallback_only_once_on_transient_provider_failure(error):
    primary, secondary = StubProvider(error), StubProvider()
    route = LimitedFallback(primary, secondary, 0.1)
    assert asyncio.run(extract(route, text=TEXT)).received_minor == 100000
    assert len(primary.calls) == len(secondary.calls) == 1


@pytest.mark.parametrize(
    "error",
    [
        http_error(400),
        http_error(401),
        http_error(403),
        http_error(429),
        APIError(404, "NOT_FOUND", "private"),
        APIError(503, "AI_UNAVAILABLE", "configuration"),
        "invalid JSON",
    ],
)
def test_no_fallback_for_auth_access_config_validation_or_quota(error):
    primary, secondary = StubProvider(error), StubProvider()
    with pytest.raises(APIError):
        asyncio.run(extract(LimitedFallback(primary, secondary, 0.1), text=TEXT))
    assert secondary.calls == []


def test_invalid_fallback_does_not_retry_or_loop():
    primary, secondary = StubProvider(http_error(503)), StubProvider("bad JSON")
    with pytest.raises(APIError):
        asyncio.run(extract(LimitedFallback(primary, secondary, 0.1), text=TEXT))
    assert len(primary.calls) == len(secondary.calls) == 1


def test_primary_deadline_then_fallback_within_shared_deadline():
    class Slow(StubProvider):
        async def generate(self, **kwargs):
            await asyncio.sleep(1)

    primary, secondary = Slow(), StubProvider()
    route = LimitedFallback(primary, secondary, 0.01)
    assert asyncio.run(extract(route, text=TEXT, timeout_seconds=0.1)).kind == "sale"
    assert len(secondary.calls) == 1


def test_late_answer_cannot_resurrect_timed_out_result():
    class SuppressesCancel:
        async def generate(self, **kwargs):
            try:
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                return json.dumps(VALID)

    with pytest.raises(APIError) as error:
        asyncio.run(extract(SuppressesCancel(), text=TEXT, timeout_seconds=0.01))
    assert error.value.code == "AI_TIMEOUT"


def test_observed_disconnect_discards_late_answer_and_no_fallback():
    secondary = StubProvider()

    class Request:
        async def receive(self):
            return {"type": "http.disconnect"}

    class Late:
        async def generate(self, **kwargs):
            try:
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                return json.dumps(VALID)

    with pytest.raises(APIError):
        asyncio.run(
            extract_connected(Request(), LimitedFallback(Late(), secondary, 0.2), text=TEXT)
        )
    assert secondary.calls == []


@pytest.mark.postgres
def test_openai_route_keeps_membership_clarification_and_no_money(ledger_api, monkeypatch):
    api = ledger_api
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(
            200,
            json=completion(
                output=[
                    {
                        "type": "message",
                        "content": [
                            {
                                "type": "output_text",
                                "text": json.dumps(
                                    {
                                        **VALID,
                                        "received_minor": None,
                                        "payment_status": "unknown",
                                        "payment_evidence": None,
                                        "customer_query": None,
                                        "uncertain_fields": ["customer_query"],
                                    }
                                ),
                            }
                        ],
                    }
                ]
            ),
        )

    transport(monkeypatch, handler)
    api["app"].state.ai = ProviderPlan(settings(ai_provider="openai"))
    url = f"/api/v1/businesses/{api['business']}/drafts"
    assert api["client"].post(url, files={"text": (None, TEXT)}).status_code == 401
    assert (
        api["client"].post(url, headers=api["b"], files={"text": (None, TEXT)}).status_code == 404
    )
    assert calls == []
    response = api["client"].post(url, headers=api["a"], files={"text": (None, TEXT)})
    assert response.status_code == 200 and response.json()["received_minor"] is None
    assert set(response.json()["missing_fields"]) >= {"received_minor", "customer_id"}
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(Draft)) == 1
        assert db.scalar(select(func.count()).select_from(Operation)) == 0


@pytest.mark.postgres
def test_real_http_disconnect_cancels_before_draft_save(ledger_api):
    """Real loopback TCP + test PostgreSQL; only the AI transport is a double."""
    api = ledger_api
    started, cancelled = threading.Event(), threading.Event()

    class Late:
        async def generate(self, **kwargs):
            started.set()
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                cancelled.set()
                return json.dumps(VALID)

    api["app"].state.ai = Late()
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
    server = uvicorn.Server(
        # Do not replace pytest's logging handlers/levels for subsequent diagnostic tests.
        uvicorn.Config(
            api["app"], lifespan="off", access_log=False, log_config=None, log_level=None
        )
    )
    thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
    thread.start()
    try:
        deadline = time.monotonic() + 5
        while not server.started and time.monotonic() < deadline:
            time.sleep(0.01)
        assert server.started
        body = (
            '--qadam\r\nContent-Disposition: form-data; name="text"\r\n\r\n'
            + TEXT
            + "\r\n--qadam--\r\n"
        ).encode()
        with socket.create_connection(("127.0.0.1", port), timeout=5) as connection:
            headers = (
                f"POST /api/v1/businesses/{api['business']}/drafts HTTP/1.1\r\n"
                f"Host: 127.0.0.1:{port}\r\nAuthorization: {api['a']['Authorization']}\r\n"
                "Content-Type: multipart/form-data; boundary=qadam\r\n"
                f"Content-Length: {len(body)}\r\n\r\n"
            )
            connection.sendall(headers.encode() + body)
            assert started.wait(5)
        assert cancelled.wait(5)
    finally:
        server.should_exit = True
        thread.join(5)
        listener.close()
    assert not thread.is_alive()
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(Draft)) == 0
        assert db.scalar(select(func.count()).select_from(Operation)) == 0


@pytest.mark.postgres
def test_fallback_saves_one_draft_and_no_money(ledger_api):
    api = ledger_api
    primary, secondary = StubProvider(http_error(503)), StubProvider()
    api["app"].state.ai = LimitedFallback(primary, secondary, 0.1)
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        headers=api["a"],
        files={"text": (None, TEXT)},
    )
    assert response.status_code == 200
    assert len(primary.calls) == len(secondary.calls) == 1
    with Session(api["engine"]) as db:
        assert db.scalar(select(func.count()).select_from(Draft)) == 1
        assert db.scalar(select(func.count()).select_from(Operation)) == 0
