from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials, firestore


@lru_cache(maxsize=1)
def get_firebase_app() -> firebase_admin.App | None:
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")

    if not project_id or not client_email or not private_key:
        return None

    if firebase_admin._apps:
        return firebase_admin.get_app()

    credential = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key.replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    return firebase_admin.initialize_app(credential)


def verify_firebase_token(id_token: str) -> dict[str, Any]:
    app = get_firebase_app()
    if app is None:
        return {"uid": "guest", "guest": True}
    return auth.verify_id_token(id_token, app=app)


def get_firestore_client():
    app = get_firebase_app()
    if app is None:
        return None
    return firestore.client(app=app)
