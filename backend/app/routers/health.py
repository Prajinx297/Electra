from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", summary="Health check")
async def health() -> dict[str, str]:
    return {"status": "healthy", "service": "electra-oracle"}
