from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Electra Oracle API"
    api_version: str = "v1"
    gemini_api_key: str = ""
    redis_url: str = "redis://localhost:6379/0"
    firebase_credentials_path: str = ""
    allowed_origins: list[str] = ["https://electra.app", "http://localhost:5173"]
    cache_ttl_seconds: int = 3600
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
