import time
from typing import Any

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.services.claude_service import ClaudeOracleService
from backend.services.firebase_admin import verify_firebase_token
from backend.services.sanitizer import sanitize_user_text

router = APIRouter(prefix="/api", tags=["oracle"])
limiter = Limiter(key_func=get_remote_address)
oracle_service = ClaudeOracleService()


class OracleRequestModel(BaseModel):
    userMessage: str = Field(min_length=1, max_length=500)
    currentState: str
    history: list[dict[str, Any]] = Field(default_factory=list)
    cognitiveLevel: str = "simple"
    language: str = "en"


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        return {"uid": "guest", "guest": True}
    token = authorization.replace("Bearer ", "").strip()
    try:
        return verify_firebase_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid Firebase token.") from exc


@router.post("/oracle")
@limiter.limit("10/minute")
async def oracle_endpoint(
    request: Request,
    payload: OracleRequestModel = Body(...),
    user: dict[str, Any] = Depends(get_current_user),
):
    _ = user
    started = time.perf_counter()
    parsed = oracle_service.generate(
        sanitize_user_text(payload.userMessage),
        payload.currentState,
        payload.history,
        payload.cognitiveLevel,
        payload.language,
    )
    return {
        "parsed": parsed,
        "latencyMs": round((time.perf_counter() - started) * 1000),
    }
