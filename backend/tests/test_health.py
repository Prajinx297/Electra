from types import SimpleNamespace

from fastapi.testclient import TestClient

import backend.app.main as main
from backend.app.main import app


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
    import sys
    class FakeApp:
        name = "[DEFAULT]"
        
    class FakeFirebaseAdmin:
        @staticmethod
        def get_app():
            return FakeApp()
            
    monkeypatch.setitem(sys.modules, "firebase_admin", FakeFirebaseAdmin)
    client = TestClient(app)

    response = client.get("/health/firebase")

    assert response.status_code == 200
    assert response.json() == {"firebase": "connected", "app_name": "[DEFAULT]"}


import sys

def test_health_gemini_success_branch(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(app)

    response = client.get("/health/gemini")

    assert response.status_code == 200
    assert response.json()["gemini"] == "ready"


def test_health_gemini_error_branch(monkeypatch):
    class FakeModel:
        def __init__(self, model_name):
            pass
        def generate_content(self, prompt):
            raise RuntimeError("gemini down")
            
    class FakeGenAI:
        @staticmethod
        def configure(api_key):
            pass
        GenerativeModel = FakeModel

    monkeypatch.setitem(sys.modules, "google.generativeai", FakeGenAI)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    client = TestClient(app)

    response = client.get("/health/gemini")

    assert response.status_code == 503
    assert response.json()["gemini"] == "error"
