"""Versioned health endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", summary="Health check")
async def health() -> dict[str, str]:
    """Return versioned API health status."""
    return {"status": "healthy", "service": "electra-oracle"}
