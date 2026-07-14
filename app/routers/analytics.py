from fastapi import APIRouter, Request, Response

from app.limiter import limiter
from app.repositories.analytics import CACHE_TTL_SECONDS
from app.schemas.analytics import PulseStats, RadarData, BuyerIntelligence, CompetitiveSignals
from app.services.analytics import get_pulse, get_radar, get_buyers, get_signals

router = APIRouter(prefix='/analytics')

# Results are cached server-side (see repositories/analytics.py) on a TTL that
# matches the daily sync cadence, so these endpoints deliberately don't take a
# `db: Session = Depends(get_db)` - that dependency checks out a pool
# connection on every request whether or not the handler uses it, which would
# defeat the point of caching on cache hits. A session is only opened, inside
# the repository, on an actual cache miss.
_CACHE_CONTROL = f"public, max-age={CACHE_TTL_SECONDS}"

@router.get('/pulse', response_model=PulseStats)
@limiter.limit("30/minute")
def pulse(request: Request, response: Response):
    response.headers["Cache-Control"] = _CACHE_CONTROL
    return get_pulse()

@router.get('/radar', response_model=RadarData)
@limiter.limit("30/minute")
def radar(request: Request, response: Response):
    response.headers["Cache-Control"] = _CACHE_CONTROL
    return get_radar()

@router.get('/buyers', response_model=BuyerIntelligence)
@limiter.limit("30/minute")
def buyers(request: Request, response: Response):
    response.headers["Cache-Control"] = _CACHE_CONTROL
    return get_buyers()

@router.get('/signals', response_model=CompetitiveSignals)
@limiter.limit("30/minute")
def signals(request: Request, response: Response):
    response.headers["Cache-Control"] = _CACHE_CONTROL
    return get_signals()
