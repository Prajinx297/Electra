from fastapi.testclient import TestClient

from backend.main import app


def test_get_recount_thresholds():
    client = TestClient(app)
    response = client.get("/api/simulations/recount-thresholds")
    assert response.status_code == 200
    assert "GA" in response.json()


def test_get_deadlines():
    client = TestClient(app)
    response = client.get("/api/simulations/deadlines?state=PA")
    assert response.status_code == 200
    assert response.json()["state"] == "PA"
    assert response.json()["registration_days_prior"] == 15


def test_deadline_endpoint_requires_state_query_param():
    client = TestClient(app)
    response = client.get("/api/simulations/deadlines")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "state"


def test_simulator_ingest_returns_typed_event_frame():
    client = TestClient(app)

    response = client.post("/api/simulator/ingest", json={
        "selection": {
            "president": "Rivera",
            "senator": "Okafor",
            "measureA": "yes"
        },
        "precinct": "PCT-014"
    })

    assert response.status_code == 200
    payload = response.json()
    assert payload["serial"].startswith("EL-")
    assert payload["precinct"] == "PCT-014"
    assert payload["signature"]


def test_simulator_tally_with_anomaly_returns_confidence_interval():
    client = TestClient(app)

    response = client.post("/api/simulator/tally", json={"anomaly": True, "precincts": 88})

    assert response.status_code == 200
    payload = response.json()
    assert payload["anomalyInjected"] is True
    assert payload["confidenceInterval"] > 1
    assert payload["affectedPrecinct"] == "PCT-044"


def test_simulator_certification_returns_provenance_chain():
    client = TestClient(app)
    tally = client.post("/api/simulator/tally", json={"anomaly": False}).json()

    response = client.post("/api/simulator/certify", json=tally)

    assert response.status_code == 200
    payload = response.json()
    assert payload["certificateId"].startswith("CERT-")
    assert len(payload["provenanceChain"]) >= 3


def test_simulator_audit_returns_clean_recommendation_without_anomaly():
    client = TestClient(app)
    tally = client.post("/api/simulator/tally", json={"anomaly": False}).json()

    response = client.post("/api/simulator/audit", json={"sampleSize": 20, "tally": tally})

    assert response.status_code == 200
    payload = response.json()
    assert payload["ballotsSampled"] == 50
    assert payload["discrepancy"] == 0
    assert "No material discrepancy" in payload["recommendation"]


def test_simulator_audit_escalates_when_tally_has_anomaly():
    client = TestClient(app)
    tally = client.post("/api/simulator/tally", json={"anomaly": True}).json()

    response = client.post("/api/simulator/audit", json={"sampleSize": 312, "tally": tally})

    assert response.status_code == 200
    payload = response.json()
    assert payload["discrepancy"] == 1
    assert payload["handCount"] == payload["machineCount"] - 1
    assert "chain-of-custody review" in payload["recommendation"]
