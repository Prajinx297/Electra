from __future__ import annotations

from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_vote_count_simulation_returns_requested_number_of_precincts():
    response = client.post(
        "/api/simulate/vote-count",
        json={
            "region": "Test County",
            "precincts": 4,
            "totalVoters": 1200,
            "turnoutPercent": 75,
            "seedMargin": 4,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["snapshots"]) == 4
    assert all("candidateA" in snapshot for snapshot in payload["snapshots"])


def test_recount_trigger_returns_margin_math():
    response = client.post(
        "/api/simulate/recount-trigger",
        json={
            "candidateAVotes": 1005,
            "candidateBVotes": 1000,
            "thresholdPercent": 1.0,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert round(payload["marginPercent"], 2) == 0.25
    assert payload["recountTriggered"] is True
    assert payload["marginVotes"] == 5


def test_polling_locations_fallback_returns_accessibility_fields():
    response = client.get("/api/polling-locations", params={"address": "123 Main St"})

    assert response.status_code == 200
    location = response.json()["locations"][0]
    assert location["accessible"] is True
    assert "languages" in location
    assert "parking" in location


def test_session_endpoint_uses_memory_store_when_firestore_missing():
    response = client.post(
        "/api/session",
        json={
            "journeyId": "journey-1",
            "currentState": "POLLING_FINDER",
            "stateHistory": [],
            "oracleHistory": [],
            "cognitiveLevel": "simple",
            "language": "en",
            "bookmarkedStates": ["WELCOME"],
            "completedJourneys": [],
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "memory"
