import logging
import os
import time
from contextlib import asynccontextmanager

import firebase_admin
from anthropic import AsyncAnthropic
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.routes.civic_score import router as civic_score_router
from backend.routes.oracle import router as oracle_router
from backend.routes.simulator import router as simulator_router
from backend.routes.simulations import router as simulations_router
from backend.services.firebase_admin import init_firebase
from backend.services.rate_limit import limiter

try:
    import structlog

    log = structlog.get_logger()
except ImportError:
    class FallbackLog:
        def info(self, event: str, **kwargs: object) -> None:
            logging.getLogger("electra").info("%s %s", event, kwargs)

        def error(self, event: str, **kwargs: object) -> None:
            logging.getLogger("electra").error("%s %s", event, kwargs)

    log = FallbackLog()

START_TIME = time.time()


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    init_firebase()
    log.info("electra.startup", app=fastapi_app.title, version="2.0.0")
    yield
    log.info("electra.shutdown", uptime_seconds=time.time() - START_TIME)


app = FastAPI(
    title="Electra Civic Intelligence OS",
    description="Agentic UI backend for the Electra project.",
    version="2.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# CORS setup - limit to frontend domain in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# CSP / Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # Allow inline styles for Framer Motion, strict otherwise
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://maps.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com;"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response

app.include_router(oracle_router, prefix="/api")
app.include_router(simulations_router, prefix="/api")
app.include_router(simulator_router, prefix="/api")
app.include_router(civic_score_router, prefix="/api")

@app.get("/health")
async def health_check() -> dict[str, object]:
    return {
        "status": "healthy",
        "version": "2.0.0",
        "uptime_seconds": time.time() - START_TIME,
        "services": {
            "firebase": "connected" if firebase_admin._apps else "not_initialized",
            "claude": "ready" if os.environ.get("ANTHROPIC_API_KEY") else "not_configured",
        },
    }


@app.get("/health/firebase", response_model=None)
async def firebase_health() -> dict[str, str] | JSONResponse:
    """Return Firebase Admin SDK connectivity status."""
    try:
        firebase_app = firebase_admin.get_app()
        return {"firebase": "connected", "app_name": firebase_app.name}
    except Exception as error:
        return JSONResponse(
            status_code=503,
            content={"firebase": "disconnected", "error": str(error)},
        )


@app.get("/health/claude", response_model=None)
async def claude_health() -> dict[str, str] | JSONResponse:
    """Return Claude API connectivity status."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JSONResponse(
            status_code=503,
            content={"claude": "not_configured", "detail": "ANTHROPIC_API_KEY is not set"},
        )

    try:
        client = AsyncAnthropic(api_key=api_key)
        await client.messages.create(
            model=os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
            max_tokens=1,
            messages=[{"role": "user", "content": "ping"}],
        )
        return {"claude": "ready"}
    except Exception as error:
        return JSONResponse(
            status_code=503,
            content={"claude": "error", "detail": str(error)},
        )
