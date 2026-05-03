import time


class RateLimiter:
    """Sliding-window request limiter keyed by caller identity."""

    def __init__(self, requests: int, window_seconds: int) -> None:
        """Create a limiter with a maximum number of hits per window."""

        self._requests = requests
        self._window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}

    async def allow(self, key: str) -> bool:
        """Return whether the key can make another request in the current window."""

        now = time.time()
        window_start = now - self._window_seconds
        hits = [hit for hit in self._hits.get(key, []) if hit >= window_start]
        if len(hits) >= self._requests:
            self._hits[key] = hits
            return False

        hits.append(now)
        self._hits[key] = hits
        return True
