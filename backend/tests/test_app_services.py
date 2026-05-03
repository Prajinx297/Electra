from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import backend.app.dependencies as app_dependencies
from backend.app.dependencies import get_oracle_service, verify_rate_limit
from backend.app.main import app
from backend.app.models.civic import CivicScore
from backend.app.models.oracle import CognitiveLevel, JourneyNode, OracleRequest, OracleResponse, RenderKey
import backend.app.services.oracle_service as oracle_service_module
from backend.app.routers.oracle import query_oracle
from backend.app.services.cache_service import CacheService
from backend.app.services.oracle_service import OracleService
from backend.app.services.rate_limiter import RateLimiter


def _request() -> OracleRequest:
    return OracleRequest(
        user_input="Where do I vote?",
        cognitive_level=CognitiveLevel.SIMPLE,
        session_id="session-abc",
        journey_history=[
            JourneyNode(
                id="node-1",
                timestamp=1,
                render_key=RenderKey.FORM,
                user_input="Register me",
            )
        ],
        locale="en",
    )


@pytest.mark.asyncio
async def test_cache_service_get_set_and_expiry() -> None:
    cache = CacheService()

    assert await cache.get("missing") is None
    await cache.set("short", "value", ttl=-1)
    assert await cache.get("short") is None
    await cache.set("fresh", "value", ttl=60)

    assert await cache.get("fresh") == "value"


@pytest.mark.asyncio
async def test_rate_limiter_blocks_after_window_capacity() -> None:
    limiter = RateLimiter(requests=1, window_seconds=60)

    assert await limiter.allow("user") is True
    assert await limiter.allow("user") is False


@pytest.mark.asyncio
async def test_oracle_service_mock_response_and_cache_hit() -> None:
    service = OracleService(api_key="", cache=CacheService())
    request = _request()

    first = await service.process(request)
    second = await service.process(request)

    assert first.render_key is RenderKey.FORM
    assert second == first
    assert "Register me" in service._build_prompt(request)
    assert "session-abc" in service._build_cache_key(request)


@pytest.mark.asyncio
async def test_oracle_service_model_response_is_validated() -> None:
    service = OracleService(api_key="", cache=CacheService())

    async def generate_content_async(_prompt: str) -> SimpleNamespace:
        return SimpleNamespace(
            text=OracleResponse(
                render_key=RenderKey.MAP,
                explanation="Your polling station is nearby.",
                component_props={},
                predicted_next_keys=[RenderKey.SUMMARY],
                civic_score_delta=3,
                confidence=0.9,
            ).model_dump_json()
        )

    service._model = SimpleNamespace(
        generate_content_async=generate_content_async,
    )

    result = await service.process(_request())

    assert result.render_key is RenderKey.MAP


def test_oracle_service_configures_gemini_when_api_key_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configured: dict[str, str] = {}

    monkeypatch.setattr(
        oracle_service_module.genai,
        "configure",
        lambda api_key: configured.setdefault("api_key", api_key),
    )
    monkeypatch.setattr(
        oracle_service_module,
        "GenerativeModel",
        lambda model_name: SimpleNamespace(model_name=model_name),
    )

    service = OracleService(api_key="key-123", cache=CacheService())

    assert configured["api_key"] == "key-123"
    assert service._model is not None


@pytest.mark.asyncio
async def test_query_oracle_translates_service_errors() -> None:
    class BrokenService:
        async def process(self, _request: OracleRequest) -> OracleResponse:
            raise RuntimeError("down")

    with pytest.raises(HTTPException) as exc:
        await query_oracle(_request(), service=BrokenService(), _=None)  # type: ignore[arg-type]

    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_query_oracle_translates_validation_errors() -> None:
    class InvalidService:
        async def process(self, _request: OracleRequest) -> OracleResponse:
            raise ValueError("bad oracle json")

    with pytest.raises(HTTPException) as exc:
        await query_oracle(_request(), service=InvalidService(), _=None)  # type: ignore[arg-type]

    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_verify_rate_limit_rejects_blocked_client(monkeypatch: pytest.MonkeyPatch) -> None:
    class BlockedLimiter:
        async def allow(self, _key: str) -> bool:
            return False

    monkeypatch.setattr(app_dependencies, "get_rate_limiter", lambda: BlockedLimiter())

    with pytest.raises(HTTPException) as exc:
        await verify_rate_limit(SimpleNamespace(client=SimpleNamespace(host="blocked")))  # type: ignore[arg-type]

    assert exc.value.status_code == 429


def test_civic_score_model_validation() -> None:
    score = CivicScore(user_id="user-1", score=125, streak_days=4)

    assert score.score == 125
    assert score.streak_days == 4


def test_api_v1_oracle_dependency_override_success(monkeypatch) -> None:
    async def mock_generate(*args, **kwargs) -> dict[str, object]:
        return {"message": "Done.", "trust": {}}

    async def allow_rate_limit() -> None:
        return None

    import backend.services.gemini_service as gemini_service
    monkeypatch.setattr(gemini_service.oracle_service, "generate", mock_generate)
    app.dependency_overrides[verify_rate_limit] = allow_rate_limit
    try:
        response = TestClient(app, base_url="http://testserver").post(
            "/api/oracle",
            json={
                "message": "Summarize",
                "currentState": "home",
                "cognitiveLevel": "simplified",
                "language": "en",
                "sessionId": "session-xyz",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["message"] == "Done."
