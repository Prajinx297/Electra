import json
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from backend.services.claude_service import oracle_service
from backend.services.rate_limit import limiter

router = APIRouter()

class OracleRequest(BaseModel):
    message: str
    currentState: str
    stateHistory: List[Dict[str, Any]] = []
    cognitiveLevel: str = "normal"
    language: str = "en"
    persona: Optional[str] = None
    sessionId: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None

@router.post("/oracle")
@limiter.limit("10/minute")
async def ask_oracle(request: Request, body: OracleRequest):
    """
    Agentic UI core endpoint. Takes user input and state, returns JSON for UI rendering.
    Rate limited to 10 requests per minute per user IP.
    """
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
@limiter.limit("10/minute")
async def stream_oracle(request: Request, body: OracleRequest):
    """Stream the Oracle response as JSON text for token-by-token UI rendering."""
    try:
        response_data = await oracle_service.generate(
            user_message=body.message,
            current_state=body.currentState,
            state_history=body.stateHistory,
            cognitive_level=body.cognitiveLevel,
            language=body.language,
            persona=body.persona
        )

        async def token_stream():
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
