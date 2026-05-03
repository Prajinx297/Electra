"""FastAPI application setup and health endpoints."""

import os
import time
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .config import get_settings
from .routers.health import router as health_router
from .routers.oracle import router as versioned_oracle_router
from .utils.logger import configure_logging

# Unified routers — single source of truth for all API endpoints
from backend.routes.oracle import router as oracle_router
from backend.routes.civic_score import router as civic_score_router
from backend.routes.simulations import router as simulations_router
from backend.routes.simulator import router as simulator_router

settings = get_settings()
configure_logging(settings.log_level)
START_TIME = time.time()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach browser security headers to every API response."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Apply security headers after downstream request handling completes."""

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
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "electra-backend-whx3lmx2pa-el.a.run.app",
        "localhost",
        "127.0.0.1",
        "testserver",
    ],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Trace-Id"],
)

# Single router set — no duplicates
app.include_router(health_router)
app.include_router(versioned_oracle_router)
app.include_router(oracle_router, prefix="/api")
app.include_router(civic_score_router, prefix="/api")
app.include_router(simulations_router, prefix="/api")
app.include_router(simulator_router, prefix="/api")


@app.get("/health")
async def root_health() -> dict[str, object]:
    """Return the root service health payload."""

    return {
        "status": "healthy",
        "version": "2.0.0",
        "uptime_seconds": time.time() - START_TIME,
    }


@app.get("/health/firebase", response_model=None)
async def firebase_health() -> dict[str, str] | JSONResponse:
    """Report whether the configured Firebase application is reachable."""

    import firebase_admin as _fb_admin
    try:
        app_instance = _fb_admin.get_app()
        app_name = getattr(app_instance, "name", "[DEFAULT]")
        return {"firebase": "connected", "app_name": str(app_name)}
    except Exception:
        return JSONResponse(status_code=503, content={"firebase": "error"})


@app.get("/health/gemini", response_model=None)
async def gemini_health() -> dict[str, str] | JSONResponse:
    """Verify Gemini API connectivity."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {"gemini": "ready"}

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content("Reply with only the word: OK")
        if response and response.text:
            return {"gemini": "ready"}
        return JSONResponse(
            status_code=503,
            content={"gemini": "error", "detail": "Empty response"},
        )
    except Exception as exc:
        return JSONResponse(status_code=503, content={"gemini": "error", "detail": str(exc)})
