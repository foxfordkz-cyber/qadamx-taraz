from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_version_is_visible_to_allowed_browser_and_errors_remain_errors():
    app = create_app(
        Settings(
            _env_file=None,
            database_url=None,
            supabase_url="",
            jwt_issuer="",
            jwt_audience="",
            allowed_origins=["https://frontend.example"],
        )
    )
    with TestClient(app) as client:
        for path, status in (("/api/v1/health", 200), ("/api/v1/me", 401), ("/missing", 404)):
            response = client.get(path, headers={"Origin": "https://frontend.example"})
            assert response.status_code == status
            assert response.headers["x-qadam-api-version"] == app.version == "0.8.0"
            assert "X-Qadam-API-Version" in response.headers["access-control-expose-headers"]
            assert response.headers["access-control-allow-origin"] == "https://frontend.example"


def test_report_and_filtered_operations_declare_and_return_matching_version(ledger_api):
    api = ledger_api
    for suffix in ("report", "operations?min_amount_minor=1"):
        response = api["client"].get(
            f"/api/v1/businesses/{api['business']}/{suffix}", headers=api["a"]
        )
        assert response.status_code == 200
        assert response.headers["x-qadam-api-version"] == "0.8.0"
    schema = api["app"].openapi()
    for suffix in ("report", "operations"):
        headers = schema["paths"][f"/api/v1/businesses/{{id}}/{suffix}"]["get"]["responses"]["200"][
            "headers"
        ]
        assert headers["X-Qadam-API-Version"]["schema"]["enum"] == ["0.8.0"]
