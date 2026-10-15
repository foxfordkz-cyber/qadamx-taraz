"""Provider boundary tests use explicit doubles, not live Gemini."""

import asyncio
import json

import httpx
import pytest

from app.config import Settings
from app.errors import APIError
from app.services.ai import GeminiProvider, extract

TEXT = "Продал товар на 3000, Асқар заплатил 1000"
VALID = dict(
    transcript=TEXT,
    kind="sale",
    customer_query="Асқар",
    description="товар",
    total_minor=300000,
    received_minor=100000,
    amount_minor=None,
    payment_status="partial",
    total_evidence="3000",
    payment_evidence="заплатил 1000",
    amount_evidence=None,
    uncertain_fields=[],
)


class StubProvider:
    def __init__(self, *responses):
        self.responses = list(responses or [json.dumps(VALID)])
        self.calls = []

    async def generate(self, **kwargs):
        self.calls.append(kwargs)
        response = self.responses[min(len(self.calls) - 1, len(self.responses) - 1)]
        if isinstance(response, Exception):
            raise response
        return response


def test_invalid_json_retries_once_within_same_extraction():
    stub = StubProvider("not JSON", json.dumps(VALID))
    result = asyncio.run(extract(stub, text=TEXT))
    assert result.total_minor == 300000 and result.received_minor == 100000
    assert [call["retry"] for call in stub.calls] == [False, True]


@pytest.mark.parametrize(
    "raw",
    [
        "not JSON",
        "[]",
        "{}",
        "```json\n{}\n```",
        "null",
        json.dumps({**VALID, "customer_id": "untrusted-ID"}),
        json.dumps({**VALID, "received_minor": True}),
        json.dumps({**VALID, "total_minor": 3000.5}),
        json.dumps({**VALID, "payment_evidence": "not in source"}),
    ],
)
def test_invalid_output_never_becomes_a_draft(raw):
    stub = StubProvider(raw)
    with pytest.raises(APIError) as error:
        asyncio.run(extract(stub, text=TEXT))
    assert (error.value.status, error.value.code) == (503, "AI_UNAVAILABLE")
    assert len(stub.calls) == 2


def test_timeout_cancels_and_does_not_retry():
    class Slow:
        calls = 0
        cancelled = False

        async def generate(self, **kwargs):
            self.calls += 1
            try:
                await asyncio.sleep(10)
            finally:
                self.cancelled = True

    stub = Slow()
    with pytest.raises(APIError) as error:
        asyncio.run(extract(stub, text=TEXT, timeout_seconds=0.02))
    assert error.value.code == "AI_TIMEOUT"
    assert stub.calls == 1 and stub.cancelled


def test_retry_does_not_reset_total_deadline():
    class SlowInvalid:
        calls = 0

        async def generate(self, **kwargs):
            self.calls += 1
            await asyncio.sleep(0.2 if self.calls == 1 else 0.9)
            return "bad json"

    stub = SlowInvalid()
    with pytest.raises(APIError) as error:
        asyncio.run(extract(stub, text=TEXT, timeout_seconds=1))
    assert error.value.code == "AI_TIMEOUT" and stub.calls == 2


@pytest.mark.parametrize(
    "changes,received",
    [
        ({"payment_status": "unknown"}, None),
        ({"payment_evidence": None}, None),
        ({"uncertain_fields": ["received_minor"]}, None),
        ({"received_minor": 400000}, None),
        ({"payment_status": "paid"}, 300000),
        ({"payment_status": "debt"}, 0),
    ],
)
def test_conservative_payment(changes, received):
    result = asyncio.run(extract(StubProvider(json.dumps({**VALID, **changes})), text=TEXT))
    assert result.received_minor == received


def test_text_transcript_cannot_be_rewritten_by_model():
    stub = StubProvider(json.dumps({**VALID, "transcript": "imagined speech"}))
    assert asyncio.run(extract(stub, text=TEXT)).transcript == TEXT


def test_gemini_http_contract_and_secret_header(monkeypatch):
    real_client = httpx.AsyncClient
    captured = []

    def handle(request):
        captured.append(request)
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {"parts": [{"text": json.dumps(VALID)}]},
                    }
                ]
            },
        )

    monkeypatch.setattr(
        "app.services.ai.httpx.AsyncClient",
        lambda **kwargs: real_client(**kwargs, transport=httpx.MockTransport(handle)),
    )
    provider = GeminiProvider(
        Settings(_env_file=None, ai_api_key="synthetic-test-key", ai_model="gemini-test-model")
    )
    result = asyncio.run(extract(provider, text=TEXT))
    assert result.total_minor == 300000
    request = captured[0]
    assert request.headers["x-goog-api-key"] == "synthetic-test-key"
    assert "synthetic-test-key" not in str(request.url)
    assert request.url.host == "generativelanguage.googleapis.com"
    body = json.loads(request.content)
    assert "tools" not in body
    assert body["generationConfig"]["responseMimeType"] == "application/json"
    assert "customer_id" not in body["generationConfig"]["responseJsonSchema"]["properties"]


def test_no_key_is_explicit_unavailable():
    with pytest.raises(APIError) as error:
        asyncio.run(
            extract(
                GeminiProvider(Settings(_env_file=None, ai_api_key=None, ai_model="")), text=TEXT
            )
        )
    assert error.value.code == "AI_UNAVAILABLE"
