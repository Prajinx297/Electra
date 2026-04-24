from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from backend.services.firebase_admin import get_firestore_client, verify_firebase_token
from backend.services.sanitizer import sanitize_address

router = APIRouter(prefix="/api", tags=["simulations"])
MEMORY_SESSIONS: dict[str, dict[str, Any]] = {}


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        return {"uid": "guest", "guest": True}
    token = authorization.replace("Bearer ", "").strip()
    try:
        return verify_firebase_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid Firebase token.") from exc


class VoteCountRequest(BaseModel):
    region: str
    precincts: int = Field(ge=1, le=100)
    totalVoters: int = Field(ge=1)
    turnoutPercent: float = Field(ge=0, le=100)
    seedMargin: float = Field(ge=-25, le=25)


class RecountRequest(BaseModel):
    candidateAVotes: int = Field(ge=0)
    candidateBVotes: int = Field(ge=0)
    thresholdPercent: float = Field(default=0.5, ge=0, le=100)


class SessionRequest(BaseModel):
    journeyId: str
    currentState: str
    stateHistory: list[dict[str, Any]]
    oracleHistory: list[dict[str, Any]]
    cognitiveLevel: str
    language: str
    bookmarkedStates: list[str]
    completedJourneys: list[str]


@router.post("/simulate/vote-count")
async def simulate_vote_count(payload: VoteCountRequest):
    turnout = round(payload.totalVoters * (payload.turnoutPercent / 100))
    precinct_size = max(1, turnout // payload.precincts)
    snapshots = []
    for index in range(payload.precincts):
        reporting = 58 + ((index * 7) % 37)
        reported_votes = round(precinct_size * (reporting / 100))
        candidate_a = round(reported_votes * (0.5 + payload.seedMargin / 100))
        snapshots.append(
            {
                "precinct": f"P-{index + 1}",
                "reportedPercent": reporting,
                "candidateA": candidate_a,
                "candidateB": reported_votes - candidate_a,
                "outstanding": precinct_size - reported_votes,
            }
        )
    return {"snapshots": snapshots}


@router.post("/simulate/recount-trigger")
async def recount_trigger(payload: RecountRequest):
    total_votes = payload.candidateAVotes + payload.candidateBVotes
    margin_votes = abs(payload.candidateAVotes - payload.candidateBVotes)
    margin_percent = 0 if total_votes == 0 else (margin_votes / total_votes) * 100
    return {
        "marginPercent": margin_percent,
        "recountTriggered": margin_percent <= payload.thresholdPercent,
        "thresholdPercent": payload.thresholdPercent,
        "marginVotes": margin_votes,
    }


@router.get("/polling-locations")
async def polling_locations(address: str = Query(..., min_length=3)):
    safe_address = sanitize_address(address)
    api_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {
            "locations": [
                {
                    "id": "fallback-1",
                    "name": "Fallback Civic Center",
                    "address": safe_address,
                    "hours": "6:00 AM - 9:00 PM",
                    "lat": 40.7128,
                    "lng": -74.0060,
                    "accessible": True,
                    "curbside": True,
                    "languages": ["English", "Spanish"],
                    "parking": "Street parking nearby",
                }
            ]
        }

    async with httpx.AsyncClient(timeout=10) as client:
        geocode = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": safe_address, "key": api_key},
        )
        geocode.raise_for_status()
        geo_json = geocode.json()
        result = geo_json.get("results", [{}])[0]
        location = result.get("geometry", {}).get("location", {"lat": 40.7128, "lng": -74.0060})

    return {
        "locations": [
            {
                "name": "Nearest Election Center",
                "id": "google-1",
                "address": result.get("formatted_address", safe_address),
                "hours": "6:00 AM - 9:00 PM",
                "lat": location["lat"],
                "lng": location["lng"],
                "accessible": True,
                "curbside": True,
                "languages": ["English", "Spanish"],
                "parking": "Accessible parking",
            },
            {
                "name": "Transit-Accessible Poll Site",
                "id": "google-2",
                "address": f"Near {result.get('formatted_address', safe_address)}",
                "hours": "7:00 AM - 8:00 PM",
                "lat": location["lat"] + 0.008,
                "lng": location["lng"] + 0.006,
                "accessible": True,
                "curbside": False,
                "languages": ["English", "French"],
                "parking": "Transit stop nearby",
            },
            {
                "name": "Neighborhood School Gym",
                "id": "google-3",
                "address": f"Near {result.get('formatted_address', safe_address)}",
                "hours": "7:00 AM - 8:00 PM",
                "lat": location["lat"] - 0.006,
                "lng": location["lng"] - 0.004,
                "accessible": False,
                "curbside": False,
                "languages": ["English"],
                "parking": "Small lot",
            }
        ]
    }


@router.post("/session")
async def save_session(payload: SessionRequest, user: dict[str, Any] = Depends(get_current_user)):
    uid = user["uid"]
    db = get_firestore_client()
    serialized = payload.model_dump()

    if db is None:
        MEMORY_SESSIONS[f"{uid}:{payload.journeyId}"] = serialized
        return {"status": "memory", "journeyId": payload.journeyId}

    doc_ref = (
        db.collection("users")
        .document(uid)
        .collection("sessions")
        .document(payload.journeyId)
    )
    doc_ref.set(serialized, merge=True)
    return {"status": "firestore", "journeyId": payload.journeyId}
