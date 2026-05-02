from fastapi import APIRouter

router = APIRouter()

# Placeholder for any specific simulation backend endpoints.
# Most simulation math in Electra V2 is handled client-side for immediate feedback,
# but we expose this router for complex logic (e.g., retrieving state-specific geocoding rules
# or fetching official candidate data if it were integrated in v2).

@router.get("/simulations/recount-thresholds")
async def get_recount_thresholds() -> dict[str, float]:
    """Return static mock data for recount thresholds by state."""
    return {
        "GA": 0.5,
        "PA": 0.5,
        "WI": 0.25,
        "AZ": 0.5
    }

@router.get("/simulations/deadlines")
async def get_deadlines(state: str) -> dict[str, int | str]:
    """Return mock deadlines for a specific state."""
    return {
        "state": state,
        "registration_days_prior": 15,
        "absentee_days_prior": 7
    }
