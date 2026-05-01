import os
import json
import logging
from typing import Any
import firebase_admin
from firebase_admin import credentials, auth, firestore

logger = logging.getLogger(__name__)

def init_firebase() -> None:
    """Initialize Firebase Admin SDK."""
    if not firebase_admin._apps:
        try:
            # First try env var JSON string (easier for cloud deployment)
            creds_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
            if creds_json:
                creds_dict = json.loads(creds_json)
                cred = credentials.Certificate(creds_dict)
            else:
                # Fallback to local file for dev
                cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "firebase-adminsdk.json")
                cred = credentials.Certificate(cred_path)
            
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize Firebase Admin SDK: {e}. Some features may be disabled.")

def verify_token(token: str) -> dict[str, Any] | None:
    """Verify a Firebase ID token."""
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None

def get_db() -> Any:
    """Get Firestore client."""
    return firestore.client()
