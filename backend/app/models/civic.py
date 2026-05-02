from pydantic import BaseModel, Field


class CivicScore(BaseModel):
    user_id: str = Field(..., min_length=1)
    score: int = Field(default=0, ge=0, le=10_000)
    streak_days: int = Field(default=0, ge=0)
