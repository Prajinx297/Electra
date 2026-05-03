"""Versioned Oracle query endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_oracle_service, verify_rate_limit
from ..models.oracle import OracleRequest, OracleResponse
from ..services.oracle_service import OracleService

router = APIRouter(prefix="/api/v1", tags=["oracle"])
OracleServiceDependency = Annotated[OracleService, Depends(get_oracle_service)]
RateLimitDependency = Annotated[None, Depends(verify_rate_limit)]


@router.post(
    "/oracle",
    response_model=OracleResponse,
    status_code=status.HTTP_200_OK,
    summary="Query the Electra Oracle",
    description="Submit a civic query and receive a structured render directive.",
)
async def query_oracle(
    request: OracleRequest,
    service: OracleServiceDependency,
    _: RateLimitDependency,
) -> OracleResponse:
    """Process a validated Oracle request and map service errors to HTTP responses."""
    try:
        return await service.process(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Oracle processing failed",
        ) from exc
