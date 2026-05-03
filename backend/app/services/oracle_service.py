import hashlib
import json
import logging

import google.generativeai as genai
from google.generativeai import GenerativeModel

from ..models.oracle import OracleRequest, OracleResponse, RenderKey
from .cache_service import CacheService

logger = logging.getLogger(__name__)

ORACLE_SYSTEM_PROMPT = """
You are Electra's Oracle - a civic intelligence engine for India's 950M voters.
Given a user's civic query, their history, and their reading level, you MUST respond
with ONLY a valid JSON object matching this exact schema:
{
  "render_key": "<one of: map|form|quiz|election_simulator|confusion_heatmap|civic_score|summary>",
  "explanation": "<explanation in the requested cognitive level>",
  "component_props": {},
  "predicted_next_keys": ["<up to 3 likely next render keys>"],
  "civic_score_delta": <0-10>,
  "confidence": <0.0-1.0>
}
Return ONLY the JSON. No markdown. No preamble. No explanation outside the JSON.
"""


class OracleService:
    """Generate, validate, and cache structured civic Oracle responses."""

    def __init__(self, api_key: str, cache: CacheService) -> None:
        """Create an Oracle service using Gemini when an API key is configured."""

        self._api_key = api_key
        self._cache = cache
        self._model: GenerativeModel | None = None
        if api_key:
            genai.configure(api_key=api_key)
            self._model = GenerativeModel("gemini-1.5-pro")

    async def process(self, request: OracleRequest) -> OracleResponse:
        """Return a cached, generated, or local fallback response for a request."""

        cache_key = self._build_cache_key(request)
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.info("Cache hit for oracle query", extra={"key": cache_key})
            return OracleResponse.model_validate_json(cached)

        if self._model is None:
            parsed = self._mock_response(request)
            await self._cache.set(cache_key, parsed.model_dump_json(), ttl=3600)
            return parsed

        prompt = self._build_prompt(request)
        response = await self._model.generate_content_async(prompt)
        raw_text = response.text.strip()

        parsed = OracleResponse.model_validate(json.loads(raw_text))
        await self._cache.set(cache_key, parsed.model_dump_json(), ttl=3600)
        return parsed

    def _build_cache_key(self, request: OracleRequest) -> str:
        """Build a deterministic cache key for a request."""

        digest = hashlib.sha256(request.user_input.encode("utf-8")).hexdigest()
        return f"oracle:{request.session_id}:{digest}:{request.cognitive_level.value}"

    def _build_prompt(self, request: OracleRequest) -> str:
        """Build the model prompt from the request and recent journey history."""

        history_summary = "\n".join(
            f"- Step {index + 1}: {node.user_input} -> {node.render_key.value}"
            for index, node in enumerate(request.journey_history[-5:])
        )
        return f"""{ORACLE_SYSTEM_PROMPT}

User Input: {request.user_input}
Cognitive Level: {request.cognitive_level.value}
Locale: {request.locale}
Journey History (last 5 steps):
{history_summary if history_summary else "No history yet"}
"""

    def _mock_response(self, request: OracleRequest) -> OracleResponse:
        """Return a deterministic local response when Gemini is not configured."""

        return OracleResponse(
            render_key=RenderKey.FORM,
            explanation=f"Start with this civic step: {request.user_input}",
            component_props={},
            predicted_next_keys=[RenderKey.MAP, RenderKey.SUMMARY],
            civic_score_delta=5,
            confidence=0.92,
        )
