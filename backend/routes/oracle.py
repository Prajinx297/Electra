import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.services.gemini_service import oracle_service
from backend.services.rate_limit import limiter

router = APIRouter()

class OracleRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1024, strict=True)
    currentState: str = Field(pattern="^[a-zA-Z0-9_-]+$", strict=True)
    stateHistory: list[dict[str, object]] = Field(default_factory=list, max_length=10)
    cognitiveLevel: str = Field(default="normal", pattern="^(normal|simplified|expert|citizen)$", strict=True)
    language: str = Field(default="en", min_length=2, max_length=5, strict=True)
    persona: str | None = Field(default=None, max_length=50)
    sessionId: str | None = Field(default=None, max_length=100)
    profile: dict[str, object] | None = Field(default=None)

@router.post("/oracle")
async def ask_oracle(request: Request, body: OracleRequest) -> dict[str, object]:
    """
    Agentic UI core endpoint. Takes user input and state, returns JSON for UI rendering.
    Rate limited to 10 requests per minute per user IP.
    """
    if not limiter.hit(request):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    try:
        response_data = await oracle_service.generate(
            user_message=body.message,
            current_state=body.currentState,
            state_history=body.stateHistory,
            cognitive_level=body.cognitiveLevel,
            language=body.language,
            persona=body.persona
        )
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/oracle/stream")
async def stream_oracle(request: Request, body: OracleRequest) -> StreamingResponse:
    """Stream the Oracle response as JSON text for token-by-token UI rendering."""
    if not limiter.hit(request):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    try:
        response_data = await oracle_service.generate(
            user_message=body.message,
            current_state=body.currentState,
            state_history=body.stateHistory,
            cognitive_level=body.cognitiveLevel,
            language=body.language,
            persona=body.persona
        )

        async def token_stream() -> AsyncIterator[str]:
            message = str(response_data.get("message", ""))
            for index in range(0, len(message), 6):
                yield json.dumps({"delta": message[index:index + 6]}) + "\n"
            yield json.dumps(
                {
                    "delta": "",
                    "done": True,
                    "trust": response_data.get("trust"),
                    "response": response_data,
                }
            ) + "\n"

        return StreamingResponse(token_stream(), media_type="application/x-ndjson")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
