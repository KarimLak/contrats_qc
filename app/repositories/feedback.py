from datetime import datetime
from typing import List, Tuple

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.contract import Contract
from app.models.feedback import UserContractFeedback

# One feedback row per (user, contract): a second "saved" or "not_relevant"
# click just overwrites the previous action/timestamp instead of erroring on
# the unique constraint or accumulating duplicate rows.
def upsert_feedback(user_id: int, contract_id: int, action: str, db: Session) -> UserContractFeedback:
    stmt = (
        pg_insert(UserContractFeedback)
        .values(user_id=user_id, contract_id=contract_id, action=action)
        .on_conflict_do_update(
            constraint="uq_user_contract_feedback_user_contract",
            set_={"action": action, "created_at": func.now()},
        )
        .returning(UserContractFeedback)
    )
    row = db.execute(stmt).scalar_one()
    db.commit()
    return row

# Powers "Annuler" in the toast: removing the row makes the contract
# reappear in recommendations (if "not_relevant") with no trace left behind.
def delete_feedback(user_id: int, contract_id: int, db: Session) -> bool:
    result = db.execute(
        delete(UserContractFeedback).where(
            UserContractFeedback.user_id == user_id,
            UserContractFeedback.contract_id == contract_id,
        )
    )
    db.commit()
    return result.rowcount > 0

def get_saved_contracts_count(user_id: int, db: Session) -> int:
    query = (
        select(func.count()).select_from(Contract)
        .join(UserContractFeedback, UserContractFeedback.contract_id == Contract.id)
        .where(UserContractFeedback.user_id == user_id, UserContractFeedback.action == "saved")
    )
    return db.execute(query).scalar() or 0

def get_saved_contracts_list(user_id: int, skip: int, limit: int, db: Session) -> List[Tuple[Contract, datetime]]:
    query = (
        select(Contract, UserContractFeedback.created_at.label("saved_at"))
        .join(UserContractFeedback, UserContractFeedback.contract_id == Contract.id)
        .where(UserContractFeedback.user_id == user_id, UserContractFeedback.action == "saved")
        .order_by(UserContractFeedback.created_at.desc())
        .offset(skip).limit(limit)
    )
    return db.execute(query).all()
