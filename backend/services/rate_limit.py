import time
from collections import defaultdict, deque

from fastapi import Request


class InMemoryRateLimiter:
    def __init__(self, limit: int = 10, window_seconds: int = 60) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)

    def hit(self, request: Request) -> bool:
        key = request.client.host if request.client is not None else "anonymous"
        now = time.monotonic()
        window_start = now - self.window_seconds
        hits = self._hits[key]

        while hits and hits[0] < window_start:
            hits.popleft()

        if len(hits) >= self.limit:
            return False

        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


limiter = InMemoryRateLimiter()
