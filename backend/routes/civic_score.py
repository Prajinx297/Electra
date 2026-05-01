from datetime import UTC, datetime
from typing import Annotated, TypedDict

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from backend.services.firebase_admin import get_db, verify_token

router = APIRouter()

POINTS_BY_EVENT = {
    "complete_onboarding": 50,
    "ask_oracle": 10,
    "complete_journey_step": 25,
    "complete_full_journey": 200,
    "flag_outdated_source_reviewed": 30,
    "run_election_simulator": 100,
    "share_civic_score": 20,
    "return_streak": 75,
}


class BadgeSpec(TypedDict):
    id: str
    label: str
    threshold: int
    icon: str


BADGES: list[BadgeSpec] = [
    {"id": "civic-newcomer", "label": "Civic Newcomer", "threshold": 50, "icon": "Ballot"},
    {"id": "informed-voter", "label": "Informed Voter", "threshold": 200, "icon": "Checklist"},
    {"id": "civic-champion", "label": "Civic Champion", "threshold": 500, "icon": "Scales"},
    {"id": "democracy-defender", "label": "Democracy Defender", "threshold": 1000, "icon": "Capitol"},
    {"id": "constitutional-scholar", "label": "Constitutional Scholar", "threshold": 2000, "icon": "Scroll"},
]

score_memory: dict[str, dict[str, int | str]] = {}


class CurrentUser(BaseModel):
    uid: str


class CivicEvent(BaseModel):
    type: str
    points: int | None = None


class CivicBadge(BaseModel):
    id: str
    label: str
    threshold: int
    icon: str
    earned: bool


class CivicScoreResponse(BaseModel):
    score: int
    badges: list[CivicBadge]
    streakDays: int
    highestBadge: CivicBadge | None


class ScoreUpdate(CivicScoreResponse):
    addedPoints: int
    newlyUnlocked: list[CivicBadge]
    reason: str


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Firebase ID token.")

    decoded = verify_token(authorization.replace("Bearer ", "", 1))
    if not decoded or "uid" not in decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase ID token.")

    return CurrentUser(uid=str(decoded["uid"]))


def _badges_for_score(score: int) -> list[CivicBadge]:
    return [
        CivicBadge(
            id=str(badge["id"]),
            label=str(badge["label"]),
            threshold=int(badge["threshold"]),
            icon=str(badge["icon"]),
            earned=score >= int(badge["threshold"]),
        )
        for badge in BADGES
    ]


def _as_int(value: object, default: int = 0) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, float | str):
        try:
            return int(value)
        except ValueError:
            return default
    return default


def _response_for_score(score: int, streak_days: int = 1) -> CivicScoreResponse:
    badges = _badges_for_score(score)
    highest = next((badge for badge in reversed(badges) if badge.earned), None)
    return CivicScoreResponse(
        score=score,
        badges=badges,
        streakDays=streak_days,
        highestBadge=highest,
    )


def _load_score(uid: str) -> CivicScoreResponse:
    if uid in score_memory:
        stored = score_memory[uid]
        return _response_for_score(
            score=_as_int(stored.get("score", 0)),
            streak_days=_as_int(stored.get("streakDays", 1), 1),
        )

    try:
        snapshot = get_db().collection("civicScores").document(uid).get()
        if snapshot.exists:
            data = snapshot.to_dict() or {}
            return _response_for_score(
                score=_as_int(data.get("score", 0)),
                streak_days=_as_int(data.get("streakDays", 1), 1),
            )
    except Exception:
        return _response_for_score(0)

    return _response_for_score(0)


def _save_score(uid: str, response: CivicScoreResponse) -> None:
    payload: dict[str, int | str] = {
        "score": response.score,
        "streakDays": response.streakDays,
        "updatedAt": datetime.now(tz=UTC).isoformat(),
    }
    score_memory[uid] = payload

    try:
        get_db().collection("civicScores").document(uid).set(payload, merge=True)
    except Exception:
        return


@router.post("/civic-score/event", response_model=ScoreUpdate)
async def record_event(
    event: CivicEvent,
    authorization: Annotated[str | None, Header()] = None,
) -> ScoreUpdate:
    """Record a civic action and return the updated score."""
    user = await get_current_user(authorization)
    current = _load_score(user.uid)
    previous_badges = {badge.id for badge in current.badges if badge.earned}
    points = event.points if event.points is not None else POINTS_BY_EVENT.get(event.type, 0)
    next_response = _response_for_score(current.score + points, current.streakDays)
    newly_unlocked = [
        badge
        for badge in next_response.badges
        if badge.earned and badge.id not in previous_badges
    ]
    _save_score(user.uid, next_response)

    return ScoreUpdate(
        **next_response.model_dump(),
        addedPoints=points,
        newlyUnlocked=newly_unlocked,
        reason=event.type,
    )


@router.get("/civic-score", response_model=CivicScoreResponse)
async def get_score(
    authorization: Annotated[str | None, Header()] = None,
) -> CivicScoreResponse:
    """Return current score, all badges, and streak count."""
    user = await get_current_user(authorization)
    return _load_score(user.uid)
