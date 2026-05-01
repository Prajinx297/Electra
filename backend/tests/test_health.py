from types import SimpleNamespace

from fastapi.testclient import TestClient

import backend.main as main
from backend.main import app


def test_health_returns_status_and_version():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["version"] == "2.0.0"


def test_app_lifespan_runs_startup_and_shutdown():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200


def test_health_firebase_endpoint_returns_connectivity_status():
    client = TestClient(app)
    response = client.get("/health/firebase")

    assert response.status_code in {200, 503}
    assert "firebase" in response.json()


def test_health_gemini_endpoint_returns_observability_status():
    client = TestClient(app)
    response = client.get("/health/gemini")

    assert response.status_code in {200, 503}
    assert "gemini" in response.json()


def test_health_firebase_success_branch(monkeypatch):
    monkeypatch.setattr(main.firebase_admin, "get_app", lambda: SimpleNamespace(name="[DEFAULT]"))
    client = TestClient(app)

    response = client.get("/health/firebase")

    assert response.status_code == 200
    assert response.json() == {"firebase": "connected", "app_name": "[DEFAULT]"}


def test_health_gemini_success_branch(monkeypatch):
    class Messages:
        async def create(self, **_kwargs):
            return SimpleNamespace()

    class FakeAnthropic:
        def __init__(self, api_key: str):
            self.api_key = api_key
            self.messages = Messages()

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(main, "AsyncAnthropic", FakeAnthropic)
    client = TestClient(app)

    response = client.get("/health/gemini")

    assert response.status_code == 200
    assert response.json() == {"gemini": "ready"}


def test_health_gemini_error_branch(monkeypatch):
    class Messages:
        async def create(self, **_kwargs):
            raise RuntimeError("gemini down")

    class FakeAnthropic:
        def __init__(self, api_key: str):
            self.api_key = api_key
            self.messages = Messages()

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(main, "AsyncAnthropic", FakeAnthropic)
    client = TestClient(app)

    response = client.get("/health/gemini")

    assert response.status_code == 503
    assert response.json()["gemini"] == "error"
