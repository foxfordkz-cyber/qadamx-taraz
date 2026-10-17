import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.schemas import ErrorResponse
from scripts.legacy_customer_guard import protect_legacy_app


@pytest.fixture
def guarded():
    legacy = FastAPI()
    writes = []

    @legacy.post("/api/v1/businesses/{business}/customers")
    def old_create(business: str):
        writes.append(business)
        return {"legacy_would_insert": True}

    @legacy.get("/api/v1/businesses/{business}/customers")
    def old_read(business: str):
        return {"legacy_read": business}

    @legacy.post("/api/v1/businesses/{business}/operations")
    def old_operation(business: str):
        return {"passed_to_original_ledger": business}

    with TestClient(protect_legacy_app(legacy, ["https://preview.example"])) as client:
        yield client, writes


@pytest.mark.parametrize("key", [None, "same-intent"])
@pytest.mark.parametrize("trailing", ["", "/"])
def test_paused_customer_post_never_reaches_legacy_handler(guarded, key, trailing):
    client, writes = guarded
    headers = {"Origin": "https://preview.example"}
    if key is not None:
        headers["Idempotency-Key"] = key
    response = client.post("/api/v1/businesses/test/customers" + trailing, headers=headers)
    assert response.status_code == 503
    error = ErrorResponse.model_validate(response.json())
    assert error.error.code == "CUSTOMER_RECOVERY_PAUSED"
    assert str(error.request_id) == response.headers["x-request-id"]
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["access-control-allow-origin"] == "https://preview.example"
    assert writes == []


def test_lookup_is_unknown_and_unrelated_routes_are_not_intercepted(guarded):
    client, writes = guarded
    result = client.get("/api/v1/businesses/test/customer-creation-result")
    assert result.status_code == 503
    assert "status" not in result.json()  # Never turn maintenance into not_observed.
    assert client.get("/api/v1/businesses/test/customers").json() == {"legacy_read": "test"}
    assert client.post("/api/v1/businesses/test/operations").json() == {
        "passed_to_original_ledger": "test"
    }
    assert writes == []


def test_guard_has_exact_cors_and_preflight_does_not_create_customers(guarded):
    client, writes = guarded
    for origin, expected in [("https://preview.example", 200), ("https://other.example", 400)]:
        response = client.options(
            "/api/v1/businesses/test/customers",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
            },
        )
        assert response.status_code == expected
    assert writes == []
