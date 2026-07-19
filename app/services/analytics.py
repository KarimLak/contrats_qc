from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.analytics import (
    get_profile_kpis, get_deadline_pipeline, get_radar_data,
    get_buyer_intelligence, get_reaction_window, get_trend,
)
from app.repositories.profile import business_profile
from app.repositories.user import get_user
from app.models.profile import BusinessProfile
from app.schemas.analytics import (
    ProfileKpis, DeadlinePipeline, RadarData, BuyerIntelligence, ReactionWindow, Trend,
)

def _resolve_profile(username: str, db: Session) -> BusinessProfile:
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    profile = business_profile(user.business_id, db)
    if profile is None:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return profile

def get_kpis(username: str, db: Session) -> ProfileKpis:
    profile = _resolve_profile(username, db)
    return ProfileKpis(**get_profile_kpis(profile, db))

def get_pipeline(username: str, db: Session) -> DeadlinePipeline:
    profile = _resolve_profile(username, db)
    return DeadlinePipeline(**get_deadline_pipeline(profile, db))

def get_radar(username: str, db: Session) -> RadarData:
    profile = _resolve_profile(username, db)
    return RadarData(**get_radar_data(profile, db))

def get_buyers(username: str, db: Session) -> BuyerIntelligence:
    profile = _resolve_profile(username, db)
    return BuyerIntelligence(**get_buyer_intelligence(profile, db))

def get_reaction(username: str, db: Session) -> ReactionWindow:
    profile = _resolve_profile(username, db)
    return ReactionWindow(**get_reaction_window(profile, db))

def get_trend_data(username: str, db: Session) -> Optional[Trend]:
    profile = _resolve_profile(username, db)
    data = get_trend(profile, db)
    return Trend(**data) if data is not None else None
