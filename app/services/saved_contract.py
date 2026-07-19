from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.contract import get_contract_by_id
from app.repositories.saved_contract import (
    create_saved_contract, delete_saved_contract, get_closing_soon_count,
    get_saved_contracts_list, update_saved_contract,
)
from app.repositories.user import get_user
from app.schemas.saved_contract import (
    SavedContractResponse, SavedContractsAlertsCount, SavedContractsResponse, SavedContractUpdate,
)


def _require_user(username: str, db: Session):
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def list_saved(username: str, db: Session) -> SavedContractsResponse:
    user = _require_user(username, db)
    rows = get_saved_contracts_list(user.id, db)
    contracts = [SavedContractResponse.model_validate(row) for row in rows]
    return SavedContractsResponse(items=contracts, total=len(contracts))


def create_saved(username: str, contract_id: int, db: Session) -> SavedContractResponse:
    user = _require_user(username, db)
    if get_contract_by_id(contract_id, db) is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    row = create_saved_contract(user.id, contract_id, db)
    return SavedContractResponse.model_validate(row)


def update_saved(username: str, saved_id: int, payload: SavedContractUpdate, db: Session) -> SavedContractResponse:
    user = _require_user(username, db)
    # exclude_unset: PATCH only ever touches fields the client actually sent
    # (e.g. {"status": "soumis"} alone must not blank out an existing note).
    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates:
        updates["status"] = updates["status"].value if hasattr(updates["status"], "value") else updates["status"]
    row = update_saved_contract(user.id, saved_id, updates, db)
    if row is None:
        raise HTTPException(status_code=404, detail="Saved contract not found")
    return SavedContractResponse.model_validate(row)


def delete_saved(username: str, saved_id: int, db: Session) -> None:
    user = _require_user(username, db)
    if not delete_saved_contract(user.id, saved_id, db):
        raise HTTPException(status_code=404, detail="Saved contract not found")


def get_alerts_count(username: str, db: Session) -> SavedContractsAlertsCount:
    user = _require_user(username, db)
    return SavedContractsAlertsCount(count=get_closing_soon_count(user.id, db))
