import time


class CacheService:
    """Small async-compatible in-memory cache with TTL support."""

    def __init__(self) -> None:
        """Initialize the cache store."""

        self._store: dict[str, tuple[float, str]] = {}

    async def get(self, key: str) -> str | None:
        """Return a cached value when present and not expired."""

        cached = self._store.get(key)
        if cached is None:
            return None

        expires_at, value = cached
        if expires_at < time.time():
            self._store.pop(key, None)
            return None

        return value

    async def set(self, key: str, value: str, ttl: int) -> None:
        """Store a value for the provided number of seconds."""

        self._store[key] = (time.time() + ttl, value)
