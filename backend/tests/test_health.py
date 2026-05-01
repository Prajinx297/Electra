from fastapi.testclient import TestClient

from backend.main import app


def test_health_returns_status_and_version():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["version"] == "2.0.0"


def test_health_firebase_endpoint_not_registered_yet():
    client = TestClient(app)
    response = client.get("/health/firebase")

    assert response.status_code == 404
