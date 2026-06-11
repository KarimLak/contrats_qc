from sqlalchemy.orm import Session

from app.models.profile import BusinessProfile

def business_profile(id: str, db: Session) -> BusinessProfile:
    return db.get(BusinessProfile, id)