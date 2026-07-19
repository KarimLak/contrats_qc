from sqlalchemy import delete, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

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
