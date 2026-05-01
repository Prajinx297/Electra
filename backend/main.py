import logging
import os
import time
from contextlib import asynccontextmanager

import firebase_admin
import google.generativeai as genai
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.civic_score import router as civic_score_router
from routes.oracle import router as oracle_router
from routes.simulator import router as simulator_router
from routes.simulations import router as simulations_router
from services.firebase_admin import init_firebase
from middleware.rate_limit import rate_limit_middleware

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

# Rate limiting middleware (Redis-based)
from starlette.middleware.base import BaseHTTPMiddleware
app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)

# CORS setup - strict origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://electra-os.com",
        "https://staging.electra-os.com",
        "http://localhost:5173"
    ] if os.environ.get("ENVIRONMENT") != "development" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Trace-Id"],
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

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

public_dir = "public"
if not os.path.exists(public_dir) and os.path.exists("../public"):
    public_dir = "../public"

if os.path.exists(public_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(public_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Fallback to index.html for React Router
        index_path = os.path.join(public_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse(status_code=404, content={"detail": "Not Found"})

@app.get("/health")
async def health_check() -> dict[str, object]:
    return {
        "status": "healthy",
        "version": "2.0.0",
        "uptime_seconds": time.time() - START_TIME,
        "services": {
            "firebase": "connected" if firebase_admin._apps else "not_initialized",
            "gemini": "ready" if os.environ.get("GEMINI_API_KEY") else "not_configured",
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


@app.get("/health/gemini", response_model=None)
async def gemini_health() -> dict[str, str] | JSONResponse:
    """Return Gemini API connectivity status."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return JSONResponse(
            status_code=503,
            content={"gemini": "not_configured", "detail": "GEMINI_API_KEY is not set"},
        )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        model.generate_content("ping")
        return {"gemini": "ready"}
    except Exception as error:
        return JSONResponse(
            status_code=503,
            content={"gemini": "error", "detail": str(error)},
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
