from sqlalchemy.orm import Session
from app.schemas.profile import BuisnessProfileResponse
from app.repositories.profile import business_profile

def get_business_profile(id: int, db: Session) -> BuisnessProfileResponse:
    return business_profile(id, db)
