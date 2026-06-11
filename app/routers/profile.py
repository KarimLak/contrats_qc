from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Path
from app import limiter
from app.database import get_db
from app.schemas.profile import BusisnessProfileResponse 

router = APIRouter(prefix='/profile')

@router.get('/{business_id}', response_model=BusinessProfileResponse)
@limiter.limit("10/minute")
def get_business_profile(business_id: Annotated[int, Path(ge=0)], db: Session = Depends(get_db)):
    return get_business_profile(business_id, db)
