from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.dependencies import get_oracle_service, verify_rate_limit
from backend.app.main import app
from backend.app.models.oracle import OracleResponse, RenderKey


@pytest.fixture
def mock_oracle_response() -> OracleResponse:
    return OracleResponse(
        render_key=RenderKey.MAP,
        explanation="Your polling station is nearby.",
        component_props={},
        predicted_next_keys=[],
        civic_score_delta=5,
        confidence=0.95,
    )


@pytest.mark.asyncio
async def test_oracle_endpoint_success(monkeypatch) -> None:
    async def mock_generate(*args, **kwargs) -> dict[str, object]:
        return {"message": "Your polling station is nearby.", "trust": {}}

    import backend.services.gemini_service as gemini_service
    monkeypatch.setattr(gemini_service.oracle_service, "generate", mock_generate)
    app.dependency_overrides[verify_rate_limit] = lambda: None

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post(
            "/api/oracle",
            json={
                "message": "Where is my polling station?",
                "currentState": "home",
                "cognitiveLevel": "simplified",
                "language": "en",
                "sessionId": "test-session-abc",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["message"] == "Your polling station is nearby."


@pytest.mark.asyncio
async def test_oracle_endpoint_validation_error() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post("/api/oracle", json={"message": ""})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
