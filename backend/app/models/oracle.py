from enum import Enum

from pydantic import BaseModel, Field, field_validator


class RenderKey(str, Enum):
    MAP = "map"
    FORM = "form"
    QUIZ = "quiz"
    ELECTION_SIMULATOR = "election_simulator"
    CONFUSION_HEATMAP = "confusion_heatmap"
    CIVIC_SCORE = "civic_score"
    SUMMARY = "summary"


class CognitiveLevel(str, Enum):
    SIMPLE = "simple"
    DETAILED = "detailed"
    LEGAL = "legal"


class JourneyNode(BaseModel):
    id: str = Field(..., min_length=1)
    timestamp: int = Field(..., gt=0)
    render_key: RenderKey
    user_input: str = Field(..., min_length=1, max_length=2000)


class OracleRequest(BaseModel):
    user_input: str = Field(..., min_length=1, max_length=2000)
    cognitive_level: CognitiveLevel
    session_id: str = Field(..., min_length=1)
    journey_history: list[JourneyNode] = Field(default_factory=list)
    locale: str = Field(default="en", pattern=r"^[a-z]{2}(-[A-Z]{2})?$")

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("session_id must be at least 8 characters")
        return value


class OracleResponse(BaseModel):
    render_key: RenderKey
    explanation: str
    component_props: dict[str, object] = Field(default_factory=dict)
    predicted_next_keys: list[RenderKey] = Field(default_factory=list)
    civic_score_delta: int = Field(default=0, ge=0, le=100)
    confidence: float = Field(..., ge=0.0, le=1.0)
