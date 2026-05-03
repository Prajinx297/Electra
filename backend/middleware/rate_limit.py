import time
import logging
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)


from typing import Callable, Awaitable
from fastapi import Response

async def rate_limit_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Token bucket rate limiter. Fails open if Redis is unavailable."""
    # Skip rate limiting for health checks
    if request.url.path.startswith("/health"):
        return await call_next(request)

    from backend.core.redis import redis_client
    if redis_client is None:
        # Redis not available — fail open
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    user_id = getattr(getattr(request.state, "user", None), "uid", "anon")

    key = f"rate_limit:{user_id}:{client_ip}"
    current = int(time.time())

    try:
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, current - 60)
        pipe.zcard(key)
        pipe.zadd(key, {str(current): current})
        pipe.expire(key, 60)
        results = pipe.execute()

        request_count = results[1]

        if request_count > 100:  # 100 req / minute max
            raise HTTPException(
                status_code=429,
                detail="Too Many Requests",
                headers={"Retry-After": "60"},
            )
    except HTTPException:
        raise
    except Exception as e:
        # If Redis errors during a request, fail open
        logger.error("Rate limiting error (Redis): %s", e)

    return await call_next(request)
