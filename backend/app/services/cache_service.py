import time


class CacheService:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, str]] = {}

    async def get(self, key: str) -> str | None:
        cached = self._store.get(key)
        if cached is None:
            return None

        expires_at, value = cached
        if expires_at < time.time():
            self._store.pop(key, None)
            return None

        return value

    async def set(self, key: str, value: str, ttl: int) -> None:
        self._store[key] = (time.time() + ttl, value)
