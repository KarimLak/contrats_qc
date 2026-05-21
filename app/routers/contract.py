from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.contract import ContractFilter, ContractFilterResponse, ContractResponse
from app.services.contract import get_contracts

router = APIRouter(prefix='/contract')

@router.get('/', response_model=ContractFilterResponse)
def list_contracts(filter: ContractFilter = Depends(), skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    return get_contracts(filter, skip, limit, db)
    
