from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.profile import business_profile, update_business_profile
from app.repositories.user import get_user
from app.schemas.profile import BusinessProfileCreate, BusinessProfileResponse
from app.services.alert import ensure_default_alert_for

def get_my_business_profile(username: str, db: Session) -> BusinessProfileResponse:
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = business_profile(user.business_id, db)
    if profile is None:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return profile

def update_my_business_profile(username: str, payload: BusinessProfileCreate, db: Session) -> BusinessProfileResponse:
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = update_business_profile(db, user.business_id, payload)
    if profile is None:
        raise HTTPException(status_code=404, detail="Business profile not found")
    # "quand son profil d'entreprise est complété" — every profile is
    # already complete at registration in this app (business info is
    # mandatory on UserRegister), so this is the defensive/idempotent
    # second trigger point: covers accounts whose role changed to pro/
    # enterprise after registering, without needing a dedicated
    # role-upgrade endpoint (none exists in this codebase).
    ensure_default_alert_for(user, db)
    return profile
