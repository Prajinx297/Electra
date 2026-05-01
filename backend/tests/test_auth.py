from fastapi.testclient import TestClient

import backend.routes.civic_score as civic_score
from backend.main import app


def test_protected_civic_score_rejects_unauthenticated_requests():
    client = TestClient(app)

    assert client.get("/api/civic-score").status_code == 401
    assert client.post("/api/civic-score/event", json={"type": "ask_oracle"}).status_code == 401


def test_protected_civic_score_accepts_valid_firebase_token(monkeypatch):
    monkeypatch.setattr(
        civic_score,
        "verify_token",
        lambda token: {"uid": "test-user"} if token == "valid-token" else None,
    )
    client = TestClient(app)

    response = client.get("/api/civic-score", headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 200
    assert response.json()["score"] >= 0


def test_expired_token_returns_helpful_401(monkeypatch):
    monkeypatch.setattr(civic_score, "verify_token", lambda token: None)
    client = TestClient(app)

    response = client.get("/api/civic-score", headers={"Authorization": "Bearer expired"})

    assert response.status_code == 401
    assert "Invalid or expired" in response.json()["detail"]
