from __future__ import annotations

import os
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from backend.routes.oracle import limiter, router as oracle_router
from backend.routes.simulations import router as simulations_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="ELECTRA Oracle API", version="1.0.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):  # noqa: ANN001
    logger.warning(f"Rate limit exceeded for {request.client.host}")
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again in a moment."},
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):  # noqa: ANN001
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self';"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(oracle_router)
app.include_router(simulations_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Mount static files for SPA delivery in production
public_path = Path("public")
if public_path.exists() and public_path.is_dir():
    app.mount("/assets", StaticFiles(directory="public/assets"), name="assets")

    # Catch-all route to serve SPA index.html
    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def serve_spa(full_path: str):
        file_path = public_path / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(public_path / "index.html")
else:
    logger.info("Public directory not found. Static files will not be served (normal during dev).")
