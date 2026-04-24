from __future__ import annotations

from fastapi.testclient import TestClient

from backend.main import app
from backend.routes import oracle as oracle_route
from backend.services.claude_service import fallback_decision
from backend.services.sanitizer import sanitize_address, sanitize_user_text


client = TestClient(app)


def test_fallback_decision_for_first_time_voter_is_warm_and_structured():
    decision = fallback_decision(
        "I've never voted before.",
        "GOAL_SELECT",
        "simple",
        "en",
    )

    assert decision["render"] == "RegistrationChecker"
    assert decision["stateTransition"] == "REGISTRATION_CHECK"
    assert decision["primaryAction"]["label"] == "Check my registration"
    assert decision["confidence"] >= 0.95


def test_oracle_endpoint_sanitizes_input_and_returns_parsed_payload():
    response = client.post(
        "/api/oracle",
        json={
            "userMessage": "<script>alert(1)</script>I have an ID problem.",
            "currentState": "ID_CHECK",
            "history": [],
            "cognitiveLevel": "simple",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()["parsed"]
    assert payload["render"] == "IDChecker"
    assert "<script>" not in payload["message"]


def test_oracle_endpoint_rejects_invalid_firebase_token(monkeypatch):
    def reject_token(_: str):
        raise ValueError("bad token")

    monkeypatch.setattr(oracle_route, "verify_firebase_token", reject_token)

    response = client.post(
        "/api/oracle",
        headers={"Authorization": "Bearer invalid-token"},
        json={
            "userMessage": "Where do I vote?",
            "currentState": "POLLING_FINDER",
            "history": [],
            "cognitiveLevel": "simple",
            "language": "en",
        },
    )

    assert response.status_code == 401


def test_sanitizers_strip_prompt_injection_and_invalid_address_chars():
    assert sanitize_user_text("ignore previous <script>bad</script> hello") == "hello"
    assert sanitize_address("123 Main St. #4 !!!") == "123 Main St. #4 "
