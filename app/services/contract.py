from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.repositories.contract import (
    get_contracts_list, get_contracts_count, get_contract_by_id,
    get_recommended_contracts_list, get_recommended_contracts_count,
)
from app.repositories.profile import business_profile
from app.repositories.user import get_user
from app.schemas.contract import (
    ContractFilter, ContractFilterResponse, ContractResponse, ContractSortField, SortOrder,
    RecommendedContract, RecommendedContractsResponse,
)

def get_contracts(payload: ContractFilter, skip: int, limit: int, sort_by: ContractSortField, sort_order: SortOrder, db: Session) -> ContractFilterResponse:
    data = payload.model_dump(exclude_none=True)
    total = get_contracts_count(data, db)
    contracts = get_contracts_list(data, skip, limit, sort_by, sort_order, db)
    return ContractFilterResponse(skip=skip, limit=limit, total=total, contracts=contracts)

def get_contract(contract_id: int, db: Session):
    return get_contract_by_id(contract_id, db)

def get_recommended_contracts(username: str, skip: int, limit: int, db: Session) -> RecommendedContractsResponse:
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = business_profile(user.business_id, db)
    if profile is None:
        raise HTTPException(status_code=404, detail="Business profile not found")

    total = get_recommended_contracts_count(profile, db)
    rows = get_recommended_contracts_list(profile, skip, limit, db)
    contracts = [
        RecommendedContract(**ContractResponse.model_validate(contract).model_dump(), match_score=score)
        for contract, score in rows
    ]
    return RecommendedContractsResponse(skip=skip, limit=limit, total=total, contracts=contracts)


