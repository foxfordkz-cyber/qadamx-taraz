import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/livestock/markets",
        "/api/v1/livestock/markets/",
        "/api/v1/livestock/listings",
        "/api/v1/livestock/listings/unknown",
        "/api/v1/livestock/listings/unknown/photos",
        "/api/v1/livestock/prices",
        "/api/v1/livestock",
        "/api/v1/me?market_id=",
        "/api/v1/me?market%5Fid=x",
    ],
)
@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "PATCH"])
def test_guard_fails_closed_before_old_routes(path, method):
    with TestClient(
        create_app(Settings(database_url="", allowed_origins=["https://qadamx-taraz.pages.dev"]))
    ) as client:
        response = client.request(
            method, path, headers={"Origin": "https://qadamx-taraz.pages.dev"}
        )
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "MARKETS_MAINTENANCE"
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["access-control-allow-origin"] == "https://qadamx-taraz.pages.dev"


def test_health_ids_and_recovery_contract_remain():
    with TestClient(create_app(Settings(database_url=""))) as client:
        assert client.get("/health").status_code == 200
        paths = client.get("/openapi.json").json()["paths"]
        customers = paths["/api/v1/businesses/{id}/customers"]["get"]
        assert "ids" in {p["name"] for p in customers["parameters"]}
        assert "/api/v1/businesses/{id}/customer-creation-result" in paths
