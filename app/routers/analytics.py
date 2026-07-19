from typing import Optional

from fastapi import APIRouter, Depends, Request

from app.database import get_db
from app.limiter import limiter
from app.services.token import get_current_user
from app.schemas.analytics import (
    ProfileKpis, DeadlinePipeline, RadarData, BuyerIntelligence, ReactionWindow, Trend,
)
from app.services.analytics import (
    get_kpis, get_pipeline, get_radar, get_buyers, get_reaction, get_trend_data,
)
from sqlalchemy.orm import Session

router = APIRouter(prefix='/analytics')

# Every block here is scoped to the caller's business profile (see
# app/repositories/analytics.py), so — unlike the old global-market version
# of this router — each endpoint needs both auth and a live db session; there
# is no per-request-independent cache to protect a connection-pool checkout
# against.

@router.get('/kpis', response_model=ProfileKpis)
@limiter.limit("30/minute")
def kpis(request: Request, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_kpis(username, db)

@router.get('/pipeline', response_model=DeadlinePipeline)
@limiter.limit("30/minute")
def pipeline(request: Request, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_pipeline(username, db)

@router.get('/radar', response_model=RadarData)
@limiter.limit("30/minute")
def radar(request: Request, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_radar(username, db)

@router.get('/buyers', response_model=BuyerIntelligence)
@limiter.limit("30/minute")
def buyers(request: Request, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_buyers(username, db)

@router.get('/reaction', response_model=ReactionWindow)
@limiter.limit("30/minute")
def reaction(request: Request, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_reaction(username, db)

@router.get('/trend', response_model=Optional[Trend])
@limiter.limit("30/minute")
def trend(request: Request, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_trend_data(username, db)
