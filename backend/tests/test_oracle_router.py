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
async def test_oracle_endpoint_success(mock_oracle_response: OracleResponse) -> None:
    service = AsyncMock()
    service.process.return_value = mock_oracle_response
    app.dependency_overrides[get_oracle_service] = lambda: service
    app.dependency_overrides[verify_rate_limit] = lambda: None

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/oracle",
            json={
                "user_input": "Where is my polling station?",
                "cognitive_level": "simple",
                "session_id": "test-session-abc",
                "locale": "en",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["render_key"] == "map"


@pytest.mark.asyncio
async def test_oracle_endpoint_validation_error() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/oracle", json={"user_input": ""})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
