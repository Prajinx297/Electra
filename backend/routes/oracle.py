import json
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from services.gemini_service import oracle_service
from dependencies import get_current_user

router = APIRouter()

from pydantic import BaseModel, Field, constr

class OracleRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1024, strict=True)
    currentState: constr(pattern="^[a-zA-Z0-9_-]+$") = Field(strict=True)
    stateHistory: List[Dict[str, Any]] = Field(default_factory=list, max_length=10)
    cognitiveLevel: constr(pattern="^(normal|simplified|expert)$") = Field(default="normal", strict=True)
    language: constr(min_length=2, max_length=5) = Field(default="en", strict=True)
    persona: Optional[str] = Field(default=None, max_length=50)
    sessionId: Optional[str] = Field(default=None, max_length=100)
    profile: Optional[Dict[str, Any]] = Field(default=None)

@router.post("/oracle")
async def ask_oracle(request: Request, body: OracleRequest, user: dict = Depends(get_current_user)):
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
async def stream_oracle(request: Request, body: OracleRequest, user: dict = Depends(get_current_user)):
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
