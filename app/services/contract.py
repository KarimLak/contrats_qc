from sqlalchemy.orm import Session
from app.repositories.contract import get_contracts_list
from app.schemas.contract import ContractFilter, ContractFilterResponse, ContractResponse

def get_contracts(payload: ContractFilter, skip: int, limit: int, db: Session) -> ContractFilterResponse:
    data = payload.model_dump(exclude_none=True)
    contracts = get_contracts_list(data, skip, limit, db)
    return ContractFilterResponse(skip = skip, limit = limit, contracts = contracts)


