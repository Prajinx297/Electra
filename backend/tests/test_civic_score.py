from fastapi.testclient import TestClient

from backend.main import app


def test_civic_score_endpoint_not_registered_yet():
    client = TestClient(app)

    assert client.post("/api/civic-score", json={"delta": 1}).status_code == 404
    assert client.get("/api/civic-score").status_code == 404
