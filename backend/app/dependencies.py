from functools import lru_cache

from fastapi import HTTPException, Request, status

from .config import get_settings
from .services.cache_service import CacheService
from .services.oracle_service import OracleService
from .services.rate_limiter import RateLimiter


@lru_cache
def get_cache_service() -> CacheService:
    """Return the shared in-memory cache service."""

    return CacheService()


@lru_cache
def get_rate_limiter() -> RateLimiter:
    """Return the shared rate limiter configured from settings."""

    settings = get_settings()
    return RateLimiter(settings.rate_limit_requests, settings.rate_limit_window_seconds)


@lru_cache
def get_oracle_service() -> OracleService:
    """Return the shared Oracle service with its cache dependency."""

    settings = get_settings()
    return OracleService(settings.gemini_api_key, get_cache_service())


async def verify_rate_limit(request: Request) -> None:
    """Reject a request when the caller has exceeded the configured rate limit."""

    limiter = get_rate_limiter()
    host = request.client.host if request.client is not None else "anonymous"
    if not await limiter.allow(host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
