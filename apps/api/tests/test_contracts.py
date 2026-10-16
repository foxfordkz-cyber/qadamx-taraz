import json

from fastapi.testclient import TestClient

from app.config import Settings
from app.examples import EXAMPLES, model_for_example
from app.export_contracts import OUTPUT, artifacts
from app.main import create_app


def test_examples_and_export_are_current():
    for name, example in EXAMPLES.items():
        model_for_example(name).model_validate_json(json.dumps(example))
    for name, content in artifacts().items():
        assert (OUTPUT / name).read_text(encoding="utf-8") == content


def test_openapi_refs_auth_and_operation_union():
    schema = json.loads(artifacts()["openapi.json"])

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
    public = {
        ("/health", "get"),
        ("/api/v1/health", "get"),
        ("/api/v1/venues", "get"),
        ("/api/v1/businesses", "get"),
        ("/api/v1/businesses/{slug}", "get"),
        ("/api/v1/businesses/{id}/inquiries", "post"),
        ("/api/v1/livestock/listings", "get"),
        ("/api/v1/livestock/listings/{id}", "get"),
        ("/api/v1/livestock/listings/{id}/photos/{photo_id}", "get"),
        ("/api/v1/livestock/prices", "get"),
    }
    for path, methods in schema["paths"].items():
        for method, route in methods.items():
            if (path, method) in public:
                assert not route.get("security")
            else:
                assert route["security"] == [{"HTTPBearer": []}]
    route = schema["paths"]["/api/v1/businesses/{id}/operations"]["post"]
    body = route["requestBody"]["content"]["application/json"]["schema"]
    assert body["discriminator"]["propertyName"] == "kind"


def test_health_errors_and_cors():
    settings = Settings(
        _env_file=None,
        database_url=None,
        supabase_url="",
        jwt_issuer="",
        jwt_audience="",
        allowed_origins=["http://localhost:5173"],
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/docs").status_code == 200
        response = client.get("/not-a-route")
        assert response.json()["error"]["code"] == "NOT_FOUND"
        assert response.json()["request_id"] == response.headers["x-request-id"]
        for origin, status in (("http://localhost:5173", 200), ("https://evil.test", 400)):
            response = client.options(
                "/health", headers={"Origin": origin, "Access-Control-Request-Method": "GET"}
            )
            assert response.status_code == status
