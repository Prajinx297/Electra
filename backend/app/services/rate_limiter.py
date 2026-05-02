import time


class RateLimiter:
    def __init__(self, requests: int, window_seconds: int) -> None:
        self._requests = requests
        self._window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}

    async def allow(self, key: str) -> bool:
        now = time.time()
        window_start = now - self._window_seconds
        hits = [hit for hit in self._hits.get(key, []) if hit >= window_start]
        if len(hits) >= self._requests:
            self._hits[key] = hits
            return False

        hits.append(now)
        self._hits[key] = hits
        return True
