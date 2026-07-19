from fastapi import APIRouter, Depends, Request

from sqlalchemy.orm import Session

from app.database import get_db
from app.limiter import limiter
from app.schemas.saved_contract import (
    SavedContractCreate, SavedContractResponse, SavedContractsAlertsCount,
    SavedContractsResponse, SavedContractUpdate,
)
from app.services.saved_contract import create_saved, delete_saved, get_alerts_count, list_saved, update_saved
from app.services.token import get_current_user

# No PRO-gate dependency here: this app enforces PRO features entirely
# client-side (UpgradeGate component) with zero backend checks anywhere
# else (Analytics included) — adding one only here would be inconsistent,
# not more secure.
router = APIRouter(prefix='/saved')


# Registered before /{saved_id} so "alerts-count" isn't swallowed by the int path param.
@router.get('/alerts-count', response_model=SavedContractsAlertsCount)
@limiter.limit("100/minute")
def saved_contracts_alerts_count(request: Request,
                                 username: str = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    return get_alerts_count(username, db)


@router.get('/', response_model=SavedContractsResponse)
@limiter.limit("60/minute")
def list_saved_contracts(request: Request,
                         username: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    return list_saved(username, db)


@router.post('/', response_model=SavedContractResponse, status_code=201)
@limiter.limit("60/minute")
def create_saved_contract_endpoint(request: Request, payload: SavedContractCreate,
                                   username: str = Depends(get_current_user),
                                   db: Session = Depends(get_db)):
    return create_saved(username, payload.contract_id, db)


@router.patch('/{saved_id}', response_model=SavedContractResponse)
@limiter.limit("60/minute")
def update_saved_contract_endpoint(request: Request, saved_id: int, payload: SavedContractUpdate,
                                   username: str = Depends(get_current_user),
                                   db: Session = Depends(get_db)):
    return update_saved(username, saved_id, payload, db)


@router.delete('/{saved_id}', status_code=204)
@limiter.limit("60/minute")
def delete_saved_contract_endpoint(request: Request, saved_id: int,
                                   username: str = Depends(get_current_user),
                                   db: Session = Depends(get_db)):
    delete_saved(username, saved_id, db)
