from fastapi.testclient import TestClient

from backend.main import app


def test_get_recount_thresholds():
    client = TestClient(app)
    response = client.get("/api/simulations/recount-thresholds")
    assert response.status_code == 200
    assert "GA" in response.json()


def test_get_deadlines():
    client = TestClient(app)
    response = client.get("/api/simulations/deadlines?state=PA")
    assert response.status_code == 200
    assert response.json()["state"] == "PA"
    assert response.json()["registration_days_prior"] == 15


def test_deadline_endpoint_requires_state_query_param():
    client = TestClient(app)
    response = client.get("/api/simulations/deadlines")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "state"


def test_simulation_opus_endpoints_are_not_registered_yet():
    client = TestClient(app)

    assert client.post("/api/simulations/ballot-ingestion", json={}).status_code == 404
    assert client.post("/api/simulations/tallying", json={"anomaly": True}).status_code == 404
    assert client.post("/api/simulations/certification", json={}).status_code == 404
