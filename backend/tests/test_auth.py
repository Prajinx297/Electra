from fastapi.testclient import TestClient

from backend.main import app


def test_no_protected_routes_are_registered_yet():
    protected_routes = [
        route.path
        for route in app.routes
        if getattr(route, "path", "").startswith("/api/")
        and "oracle" not in getattr(route, "path", "")
        and "simulations" not in getattr(route, "path", "")
    ]

    assert protected_routes == []


def test_expired_token_contract_not_registered_yet():
    client = TestClient(app)
    response = client.get("/api/protected", headers={"Authorization": "Bearer expired"})

    assert response.status_code == 404
