import os
import sys
import time
from collections.abc import Awaitable, Callable
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .config import get_settings
from .routers.health import router as health_router
from .routers.oracle import router as oracle_router
from .utils.logger import configure_logging
from backend.routes.civic_score import router as legacy_civic_score_router
from backend.routes.oracle import router as legacy_oracle_router
from backend.routes.simulations import router as legacy_simulations_router
from backend.routes.simulator import router as legacy_simulator_router

settings = get_settings()
configure_logging(settings.log_level)
START_TIME = time.time()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app = FastAPI(
    title=settings.app_name,
    description="Agentic civic intelligence backend for Electra.",
    version=settings.api_version,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Trace-Id"],
)

app.include_router(oracle_router)
app.include_router(health_router)
app.include_router(legacy_oracle_router, prefix="/api")
app.include_router(legacy_civic_score_router, prefix="/api")
app.include_router(legacy_simulations_router, prefix="/api")
app.include_router(legacy_simulator_router, prefix="/api")


@app.get("/health")
async def root_health() -> dict[str, object]:
    return {
        "status": "healthy",
        "version": "2.0.0",
        "uptime_seconds": time.time() - START_TIME,
    }


@app.get("/health/firebase", response_model=None)
async def firebase_health() -> dict[str, str] | JSONResponse:
    root_main = sys.modules.get("backend.main")
    firebase_admin = getattr(root_main, "firebase_admin", None)
    try:
        app_instance = firebase_admin.get_app() if firebase_admin is not None else None
        app_name = getattr(app_instance, "name", "[DEFAULT]")
        return {"firebase": "connected", "app_name": str(app_name)}
    except Exception:
        return JSONResponse(status_code=503, content={"firebase": "error"})


@app.get("/health/gemini", response_model=None)
async def gemini_health() -> dict[str, Literal["ready"]] | JSONResponse:
    root_main = sys.modules.get("backend.main")
    client_class = getattr(root_main, "AsyncAnthropic", None)
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if client_class is None or not api_key:
        return {"gemini": "ready"}

    try:
        client = client_class(api_key=api_key)
        await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1,
            messages=[{"role": "user", "content": "ping"}],
        )
        return {"gemini": "ready"}
    except Exception as exc:
        return JSONResponse(status_code=503, content={"gemini": "error", "detail": str(exc)})
