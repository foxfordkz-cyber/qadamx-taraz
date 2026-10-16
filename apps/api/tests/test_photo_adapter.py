"""HTTP transport stubs, not proof of a live Supabase Storage upload."""

import httpx
import pytest

from app.config import Settings
from app.errors import APIError
from app.services.photos import SupabasePhotoStore


def settings(**changes):
    return Settings(
        _env_file=None,
        database_url=None,
        supabase_url="https://storage-test.example",
        jwt_issuer="",
        jwt_audience="",
        storage_bucket="livestock-photos",
        storage_service_key="synthetic-key",
        **changes,
    )


def test_private_upload_download_transport(monkeypatch):
    original = httpx.Client
    seen = []

    def handle(request):
        seen.append(request)
        assert request.headers["authorization"] == "Bearer synthetic-key"
        assert request.headers["apikey"] == "synthetic-key"
        if request.method == "POST":
            assert request.headers["x-upsert"] == "true"
            assert request.headers["content-type"] == "image/jpeg"
            assert request.content == b"clean-jpeg"
        return httpx.Response(200, content=b"clean-jpeg")

    monkeypatch.setattr(
        httpx, "Client", lambda **kw: original(**kw, transport=httpx.MockTransport(handle))
    )
    adapter = SupabasePhotoStore(settings())
    adapter.put("owner/id.jpg", b"clean-jpeg")
    assert adapter.get("owner/id.jpg") == b"clean-jpeg"
    assert [r.url.path for r in seen] == [
        "/storage/v1/object/livestock-photos/owner/id.jpg",
        "/storage/v1/object/authenticated/livestock-photos/owner/id.jpg",
    ]


@pytest.mark.parametrize("failure", ["timeout", "forbidden", "redirect"])
def test_storage_failure_sanitized_without_redirect_or_retry(monkeypatch, failure):
    original = httpx.Client
    calls = []

    def handle(request):
        calls.append(request)
        if failure == "timeout":
            raise httpx.ReadTimeout("sensitive provider detail", request=request)
        return httpx.Response(
            403 if failure == "forbidden" else 302,
            headers={"Location": "https://untrusted.example"},
            content=b"sensitive provider body",
        )

    monkeypatch.setattr(
        httpx, "Client", lambda **kw: original(**kw, transport=httpx.MockTransport(handle))
    )
    with pytest.raises(APIError) as exc:
        SupabasePhotoStore(settings()).put("owner/id.jpg", b"clean")
    assert exc.value.status == 503 and "sensitive" not in exc.value.message
    assert len(calls) == 1
