import time
import logging
from fastapi import Request, HTTPException
from core.redis import redis_client

logger = logging.getLogger(__name__)

async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for static assets or health checks if needed
    if request.url.path.startswith("/health"):
        return await call_next(request)
        
    client_ip = request.client.host if request.client else "unknown"
    user_id = request.state.user.uid if hasattr(request.state, "user") else "anon"
    
    # Combined rate limit key based on UID and IP
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
        
        if request_count > 100: # 100 req / minute max
            raise HTTPException(status_code=429, detail="Too Many Requests", headers={"Retry-After": "60"})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        # If Redis is down, fail open to avoid total outage, but log error
        logger.error(f"Rate limiting error (Redis): {e}")

    return await call_next(request)
