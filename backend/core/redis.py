import os
import logging

logger = logging.getLogger(__name__)

redis_client = None

try:
    import redis
    redis_host = os.environ.get("REDIS_HOST", "127.0.0.1")
    redis_port = int(os.environ.get("REDIS_PORT", "6379"))
    _client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True, socket_connect_timeout=2)
    _client.ping()
    redis_client = _client
    logger.info("Redis connected at %s:%s", redis_host, redis_port)
except Exception as e:
    logger.warning("Redis not available, rate limiting disabled: %s", e)
    redis_client = None
