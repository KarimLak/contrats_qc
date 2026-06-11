from sqlalchemy.orm import Session

from app.models.profile import BusinessProfile

def business_profile(id: str, db: Session) -> BusinessProfile:
    return db.get(BusinessProfile, id)

def last_business_id(db: Session) -> int:
    return 1

def create_business_profile(db, payload.business):
    return 1