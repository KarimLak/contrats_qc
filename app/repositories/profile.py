from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.profile import BusinessProfile
from app.schemas.profile import BusinessProfileCreate

def business_profile(id: str, db: Session) -> BusinessProfile:
    return db.get(BusinessProfile, id)

def last_business_id(db: Session) -> int:
    return db.execute(select(BusinessProfile.id).order_by(desc(BusinessProfile.id)).limit(1)).scalars().one_or_none()

def create_business_profile(db: Session, id: int, payload: BusinessProfileCreate):
    business_profile = BusinessProfile(id = id, name = payload.name, sector = payload.sector, 
                                       contract_type = payload.contract_type, expertise = payload.expertise, 
                                       region = payload.region, size = payload.size,
                                       budget_min = payload.budget_min, budget_max = payload.budget_max)
    db.add(business_profile)
    db.commit()
    db.refresh(business_profile)
