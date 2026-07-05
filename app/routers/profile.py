from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Request

from app.limiter import limiter
from app.database import get_db
from app.services.token import get_current_user
from app.schemas.profile import BusinessProfileCreate, BusinessProfileResponse
from app.services.profile import get_my_business_profile, update_my_business_profile

router = APIRouter(prefix='/profile')

# Scoped to the authenticated user's own business_id (resolved server-side from the
# token) rather than accepting a business_id from the client — a path like
# /profile/{business_id} would let any logged-in user read or overwrite someone
# else's profile just by changing the number in the URL.
@router.get('/me', response_model=BusinessProfileResponse)
@limiter.limit("30/minute")
def get_my_profile(request: Request, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_my_business_profile(username, db)

@router.put('/me', response_model=BusinessProfileResponse)
@limiter.limit("10/minute")
def update_my_profile(request: Request, payload: BusinessProfileCreate,
                      username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_my_business_profile(username, payload, db)
