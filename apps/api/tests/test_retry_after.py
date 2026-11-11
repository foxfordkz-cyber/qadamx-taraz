import asyncio
from datetime import UTC, datetime

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import APIError
from app.main import create_app
from app.services.ai import extract
from app.services.retry_after import retry_after_seconds


@pytest.mark.parametrize(
    "header,expected",
    [
        ("30", 30),
        ("0", 0),
        ("-1", None),
        ("1.5", None),
        ("private", None),
        ("9999999999999999", None),
        (None, None),
        ("Wed, 11 Nov 2026 00:01:00 GMT", 60),
        ("Wed, 11 Nov 2026 00:00:00 GMT", 0),
    ],
)
def test_normalize_retry_after(header, expected):
    assert retry_after_seconds(header, now=datetime(2026, 11, 11, tzinfo=UTC)) == expected


def test_provider_429_exposes_only_safe_delay_and_never_retries():
    class Limited:
        calls = 0

        async def generate(self, **kwargs):
            self.calls += 1
            response = httpx.Response(
                429,
                headers={"Retry-After": "30", "X-Secret": "private"},
                text="private billing details",
                request=httpx.Request("POST", "https://example.test"),
            )
            response.raise_for_status()

    provider = Limited()
    with pytest.raises(APIError) as caught:
        asyncio.run(extract(provider, text="synthetic sale"))
    assert caught.value.retry_after == 30
    assert caught.value.status == 503  # Published client error code remains compatible.
    assert provider.calls == 1
    assert "private" not in caught.value.message


def test_retry_after_header_is_available_cross_origin_without_changing_envelope():
    app = create_app(
        Settings(
            _env_file=None,
            database_url=None,
            supabase_url="",
            jwt_issuer="",
            jwt_audience="",
            allowed_origins=["https://seller.example.test"],
        )
    )

    @app.get("/synthetic-rate-limit")
    async def limited():
        raise APIError(503, "AI_QUOTA_EXCEEDED", "AI request limited", retry_after=30)

    with TestClient(app) as client:
        response = client.get(
            "/synthetic-rate-limit", headers={"Origin": "https://seller.example.test"}
        )
    assert response.status_code == 503
    assert response.headers["Retry-After"] == "30"
    assert "Retry-After" in response.headers["Access-Control-Expose-Headers"]
    assert set(response.json()) == {"error", "request_id"}
