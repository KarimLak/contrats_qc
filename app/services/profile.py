from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.profile import business_profile, update_business_profile
from app.repositories.user import get_user
from app.schemas.profile import BusinessProfileCreate, BusinessProfileResponse

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
    return profile
