from typing import List

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from enum import Enum
from typing import Optional
from app.limiter import limiter
from app.database import get_db
from app.schemas.contract import ContractFilter, ContractFilterResponse, ContractResponse, ContractSortField, SortOrder
from app.services.contract import get_contracts

router = APIRouter(prefix='/contract')

@router.get('/', response_model=ContractFilterResponse)
@limiter.limit("10/minute")
def list_contracts(request: Request, filter: ContractFilter = Query(), 
                   skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), 
                   sort_by: ContractSortField = Query(ContractSortField.date_publication),
                   sort_order: SortOrder = Query(SortOrder.desc), 
                   db: Session = Depends(get_db)):
    return get_contracts(filter, skip, limit, sort_by, sort_order, db)
    
