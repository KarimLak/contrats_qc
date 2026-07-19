from typing import List

from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from enum import Enum
from typing import Optional
from app.limiter import limiter
from app.database import get_db
from app.services.token import get_current_user
from app.schemas.contract import (
    ContractFilter, ContractFilterResponse, ContractResponse, ContractSortField, SortOrder,
    RecommendedContractsResponse, ContractFeedbackRequest, ContractFeedbackResponse, SavedContractsResponse,
)
from app.services.contract import (
    get_contracts, get_contract, get_recommended_contracts,
    set_contract_feedback, remove_contract_feedback, get_saved_contracts,
)

router = APIRouter(prefix='/contract')

# NOTE: list-typed filter fields are declared as explicit Query() params rather than
# via `ContractFilter = Depends()` — a bare Pydantic model dependency silently drops
# List[str] fields (they never even register as query params), so repeated params
# like ?region=A&region=B were being ignored and every filter behaved as "no filter".
@router.get('/', response_model=ContractFilterResponse)
@limiter.limit("100/minute")
def list_contracts(request: Request,
                   type_avis: Optional[List[str]] = Query(default=None),
                   statut: Optional[List[str]] = Query(default=None),
                   nature_contrat: Optional[List[str]] = Query(default=None),
                   categorie: Optional[List[str]] = Query(default=None),
                   region: Optional[List[str]] = Query(default=None),
                   date_publication: Optional[str] = Query(default=None, max_length=100),
                   date_fermeture: Optional[str] = Query(default=None, max_length=100),
                   skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                   sort_by: ContractSortField = Query(ContractSortField.date_publication),
                   sort_order: SortOrder = Query(SortOrder.desc),
                   db: Session = Depends(get_db)):
    filter = ContractFilter(
        type_avis=type_avis, statut=statut, nature_contrat=nature_contrat,
        categorie=categorie, region=region,
        date_publication=date_publication, date_fermeture=date_fermeture,
    )
    return get_contracts(filter, skip, limit, sort_by, sort_order, db)

# Registered before /{contract_id} so "recommended" isn't swallowed by the int path param.
@router.get('/recommended', response_model=RecommendedContractsResponse)
@limiter.limit("60/minute")
def list_recommended_contracts(request: Request,
                               cursor: Optional[str] = Query(default=None), limit: int = Query(20, ge=1, le=100),
                               username: str = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    return get_recommended_contracts(username, cursor, limit, db)

# Registered before /{contract_id} for the same reason as /recommended above.
@router.get('/saved', response_model=SavedContractsResponse)
@limiter.limit("60/minute")
def list_saved_contracts(request: Request,
                         skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                         username: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    return get_saved_contracts(username, skip, limit, db)

@router.post('/{contract_id}/feedback', response_model=ContractFeedbackResponse)
@limiter.limit("60/minute")
def set_feedback(request: Request, contract_id: int, payload: ContractFeedbackRequest,
                 username: str = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    return set_contract_feedback(username, contract_id, payload.action, db)

@router.delete('/{contract_id}/feedback', status_code=204)
@limiter.limit("60/minute")
def unset_feedback(request: Request, contract_id: int,
                   username: str = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    remove_contract_feedback(username, contract_id, db)

@router.get('/{contract_id}', response_model=ContractResponse)
@limiter.limit("100/minute")
def get_contract_detail(request: Request, contract_id: int, db: Session = Depends(get_db)):
    contract = get_contract(contract_id, db)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract
    
