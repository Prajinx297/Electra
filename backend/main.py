import firebase_admin

from backend.app.main import app


class AsyncAnthropic:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key


__all__ = ["AsyncAnthropic", "app", "firebase_admin"]
