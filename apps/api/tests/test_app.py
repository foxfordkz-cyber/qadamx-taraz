from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.schemas import SaleCreate


def test_health_without_database_or_keys():
    with TestClient(create_app(Settings(_env_file=None))) as client:
        for path in ("/health", "/api/v1/health"):
            response = client.get(path)
            assert response.status_code == 200
            assert response.json() == {
                "status": "ok",
                "service": "qadam-api",
                "stage": "mvp",
            }
            UUID(response.headers["x-request-id"])
        assert client.get("/docs").status_code == 200


def test_unknown_routes_are_errors_not_fake_success():
    with TestClient(create_app(Settings(_env_file=None))) as client:
        response = client.post("/api/v1/not-implemented", json={})
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
        assert response.json()["request_id"] == response.headers["x-request-id"]
        assert client.post("/health").json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_openapi_contains_contracts_and_resolvable_refs():
    with TestClient(create_app(Settings(_env_file=None))) as client:
        schema = client.get("/openapi.json").json()
    assert {"/health", "/api/v1/health", "/api/v1/me"} <= set(schema["paths"])
    assert "SaleCreate" in schema["components"]["schemas"]

    def walk(value):
        if isinstance(value, dict):
            if "$ref" in value:
                resolved = schema
                for part in value["$ref"].removeprefix("#/").split("/"):
                    resolved = resolved[part]
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(schema)


def test_cors_only_allows_configured_origin():
    settings = Settings(_env_file=None, allowed_origins=["http://localhost:5173"])
    with TestClient(create_app(settings)) as client:
        for origin, status in (("http://localhost:5173", 200), ("https://evil.test", 400)):
            response = client.options(
                "/health",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Authorization,Idempotency-Key",
                },
            )
            assert response.status_code == status
            assert (response.headers.get("access-control-allow-origin") == origin) == (
                status == 200
            )


@pytest.mark.parametrize("origin", ["*", "https://*.test", "https://test/path", "https://u:p@test"])
def test_wildcards_and_non_origins_are_rejected(origin):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, allowed_origins=[origin])


def test_database_config_does_not_fall_back_to_sqlite():
    with pytest.raises(ValueError, match="DATABASE_URL is required"):
        Settings(_env_file=None, database_url=None).postgres_url()
    with pytest.raises(ValueError, match="PostgreSQL"):
        Settings(_env_file=None, database_url="sqlite://").postgres_url()


def test_validation_errors_do_not_echo_sensitive_input():
    app = create_app(Settings(_env_file=None))

    @app.post("/test-only-validation")
    def validate(payload: SaleCreate):
        return payload

    with TestClient(app) as client:
        response = client.post("/test-only-validation", json={"private-note": "DO_NOT_ECHO"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_AMOUNT"
    assert "DO_NOT_ECHO" not in response.text
    assert response.json()["request_id"] == response.headers["x-request-id"]


def test_internal_error_hides_exception_details():
    app = create_app(Settings(_env_file=None))

    @app.get("/test-only-failure")
    def fail():
        raise RuntimeError("DO_NOT_ECHO")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test-only-failure")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "DO_NOT_ECHO" not in response.text
    assert response.json()["request_id"] == response.headers["x-request-id"]
