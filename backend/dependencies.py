from typing import Annotated
from fastapi import Header, HTTPException
from pydantic import BaseModel
from services.firebase_admin import verify_token

class CurrentUser(BaseModel):
    uid: str

async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Firebase ID token.")

    decoded = verify_token(authorization.replace("Bearer ", "", 1))
    if not decoded or "uid" not in decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase ID token.")

    return CurrentUser(uid=str(decoded["uid"]))
