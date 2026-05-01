from fastapi.testclient import TestClient
import json
import pytest
from pydantic import BaseModel, Field

from backend.main import app
from backend.services.rate_limit import limiter


class TrustMetadata(BaseModel):
    sources: list[dict]
    confidence: float
    lastVerified: str
    rationale: str


class OracleResponseSchema(BaseModel):
    message: str
    render: str | None
    stateTransition: str
    trust: TrustMetadata
    primaryAction: dict = Field(default_factory=dict)


def make_client(host: str) -> TestClient:
    _ = host
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    limiter.reset()


def test_ask_oracle_success():
    """Test successful Oracle API response structure."""
    client = make_client("oracle-success")
    response = client.post("/api/oracle", json={
        "message": "I need help voting",
        "currentState": "WELCOME",
        "stateHistory": [],
        "cognitiveLevel": "normal",
        "language": "en"
    })

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "render" in data
    assert "stateTransition" in data
    assert "trust" in data
    OracleResponseSchema.model_validate(data)


def test_stream_oracle_success():
    """Test streaming Oracle endpoint yields newline-delimited JSON chunks."""
    client = make_client("oracle-stream")
    response = client.post("/api/oracle/stream", json={
        "message": "Make this simpler",
        "currentState": "WELCOME",
        "stateHistory": [],
        "cognitiveLevel": "citizen",
        "language": "en"
    })

    assert response.status_code == 200
    chunks = [
        json.loads(line)
        for line in response.text.splitlines()
        if line.strip()
    ]
    assert response.headers["content-type"].startswith("application/x-ndjson")
    assert "".join(chunk["delta"] for chunk in chunks).startswith("[MOCK]")
    assert chunks[-1]["done"] is True
    assert chunks[-1]["trust"]
    OracleResponseSchema.model_validate(chunks[-1]["response"])


def test_ask_oracle_rate_limit():
    """Test rate limiting on the oracle endpoint."""
    client = make_client("oracle-rate-limit")
    for _ in range(10):
        response = client.post("/api/oracle", json={
            "message": "Test",
            "currentState": "WELCOME"
        })
        assert response.status_code in {200, 429}

    blocked = client.post("/api/oracle", json={
        "message": "Fail me",
        "currentState": "WELCOME"
    })
    assert blocked.status_code == 429


def test_oracle_accepts_pydantic_validated_input():
    client = make_client("oracle-pydantic")
    response = client.post("/api/oracle", json={
        "message": "I need help voting",
        "currentState": "WELCOME",
        "stateHistory": [{"state": "WELCOME"}],
        "cognitiveLevel": "citizen",
        "language": "en",
        "sessionId": "session-1",
        "profile": {"location": "Atlanta, GA"}
    })

    assert response.status_code == 200
    OracleResponseSchema.model_validate(response.json())


def test_malformed_request_body_returns_422_with_readable_error():
    client = make_client("oracle-malformed")
    response = client.post("/api/oracle", json={"currentState": "WELCOME"})

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"]


def test_oracle_service_timeout_is_handled_gracefully(monkeypatch):
    async def timeout_generate(**_kwargs):
        raise TimeoutError("gemini timed out")

    monkeypatch.setattr("backend.routes.oracle.oracle_service.generate", timeout_generate)
    client = make_client("oracle-timeout")

    response = client.post("/api/oracle", json={
        "message": "hello",
        "currentState": "WELCOME"
    })

    assert response.status_code == 500
    assert "gemini timed out" in response.json()["detail"]


def test_unauthenticated_oracle_request_currently_uses_guest_mode_contract():
    client = make_client("oracle-guest")
    response = client.post("/api/oracle", json={
        "message": "guest mode",
        "currentState": "WELCOME"
    })

    assert response.status_code == 200
    assert response.json()["trust"]


def test_stream_oracle_error_response_is_readable(monkeypatch):
    async def broken_generate(**_kwargs):
        raise RuntimeError("stream broke")

    monkeypatch.setattr("backend.routes.oracle.oracle_service.generate", broken_generate)
    client = make_client("oracle-stream-error")

    response = client.post("/api/oracle/stream", json={
        "message": "hello",
        "currentState": "WELCOME"
    })

    assert response.status_code == 500
    assert response.json()["detail"] == "stream broke"
