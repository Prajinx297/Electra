from fastapi.testclient import TestClient

import backend.routes.civic_score as civic_score
from backend.main import app


def test_civic_score_event_increments_and_unlocks_badge(monkeypatch):
    monkeypatch.setattr(civic_score, "verify_token", lambda token: {"uid": "score-user"})
    civic_score.score_memory.clear()
    client = TestClient(app)

    response = client.post(
        "/api/civic-score/event",
        json={"type": "complete_onboarding"},
        headers={"Authorization": "Bearer valid-token"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["score"] == 50
    assert payload["newlyUnlocked"][0]["label"] == "Civic Newcomer"


def test_civic_score_get_returns_badges(monkeypatch):
    monkeypatch.setattr(civic_score, "verify_token", lambda token: {"uid": "badge-user"})
    civic_score.score_memory["badge-user"] = {"score": 225, "streakDays": 3}
    client = TestClient(app)

    response = client.get("/api/civic-score", headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["score"] == 225
    assert payload["streakDays"] == 3
    assert payload["highestBadge"]["label"] == "Informed Voter"


def test_civic_score_custom_points_and_unknown_event(monkeypatch):
    monkeypatch.setattr(civic_score, "verify_token", lambda token: {"uid": "custom-user"})
    civic_score.score_memory.clear()
    client = TestClient(app)

    custom = client.post(
        "/api/civic-score/event",
        json={"type": "judge_bonus", "points": 98},
        headers={"Authorization": "Bearer valid-token"},
    )
    unknown = client.post(
        "/api/civic-score/event",
        json={"type": "unknown_event"},
        headers={"Authorization": "Bearer valid-token"},
    )

    assert custom.status_code == 200
    assert custom.json()["score"] == 98
    assert custom.json()["addedPoints"] == 98
    assert unknown.status_code == 200
    assert unknown.json()["score"] == 98
    assert unknown.json()["addedPoints"] == 0


def test_civic_score_loads_and_saves_firestore_snapshot(monkeypatch):
    class Snapshot:
        exists = True

        def to_dict(self):
            return {"score": "500", "streakDays": 4.0}

    class Document:
        def __init__(self):
            self.saved = None

        def get(self):
            return Snapshot()

        def set(self, payload, merge=False):
            self.saved = (payload, merge)

    document = Document()

    class Collection:
        def document(self, uid):
            assert uid == "firestore-user"
            return document

    class Database:
        def collection(self, name):
            assert name == "civicScores"
            return Collection()

    monkeypatch.setattr(civic_score, "get_db", lambda: Database())
    civic_score.score_memory.clear()

    loaded = civic_score._load_score("firestore-user")
    civic_score._save_score("firestore-user", loaded)

    assert loaded.score == 500
    assert loaded.streakDays == 4
    assert document.saved[0]["score"] == 500
    assert document.saved[1] is True


def test_civic_score_firestore_failures_fall_back_to_memory(monkeypatch):
    def broken_db():
        raise RuntimeError("firestore down")

    monkeypatch.setattr(civic_score, "get_db", broken_db)
    civic_score.score_memory.clear()

    loaded = civic_score._load_score("offline-user")
    civic_score._save_score("offline-user", loaded)

    assert loaded.score == 0
    assert civic_score.score_memory["offline-user"]["score"] == 0


def test_civic_score_handles_invalid_numeric_values_and_missing_snapshot(monkeypatch):
    class Snapshot:
        exists = False

    class Document:
        def get(self):
            return Snapshot()

    class Collection:
        def document(self, uid):
            assert uid == "missing-user"
            return Document()

    class Database:
        def collection(self, name):
            assert name == "civicScores"
            return Collection()

    monkeypatch.setattr(civic_score, "get_db", lambda: Database())
    civic_score.score_memory.clear()

    assert civic_score._as_int("not-a-number", 7) == 7
    assert civic_score._as_int(object(), 9) == 9
    assert civic_score._load_score("missing-user").score == 0
