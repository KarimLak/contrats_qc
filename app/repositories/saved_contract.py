from typing import List, Optional

from sqlalchemy import asc, delete, func, nullslast, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload

from app.models.contract import Contract
from app.models.saved_contract import SavedContract

# Statuses that still need attention before the deadline — a contract marked
# non_retenu/abandonne no longer counts toward "closing soon" alerts even if
# its date_fermeture is still in the future.
ACTIVE_STATUSES = ("a_evaluer", "en_preparation")


# Idempotent save: a second "Sauvegarder" click on an already-saved contract
# must not reset its status back to a_evaluer (the user may have already
# moved it to en_preparation/soumis) — on_conflict_do_nothing + a follow-up
# read, rather than upsert_feedback's do_update pattern, preserves whatever
# is already there.
def create_saved_contract(user_id: int, contract_id: int, db: Session) -> SavedContract:
    stmt = (
        pg_insert(SavedContract)
        .values(user_id=user_id, contract_id=contract_id, status="a_evaluer")
        .on_conflict_do_nothing(constraint="uq_saved_contracts_user_contract")
    )
    db.execute(stmt)
    db.commit()
    row = db.execute(
        select(SavedContract)
        .where(SavedContract.user_id == user_id, SavedContract.contract_id == contract_id)
        .options(selectinload(SavedContract.contract))
    ).scalar_one()
    return row


# No skip/limit: this is a personal pipeline tracker, not a browsable catalog
# (see /explorer, /recommended for those) — realistic row counts are in the
# dozens, and the page groups everything by status client-side, which needs
# the full set in hand anyway. join() (for ORDER BY on the related table) is
# kept alongside selectinload() (for eager-loading the relationship without
# N+1) since a selectinload query alone can't sort by columns it fetches in
# its own separate follow-up query.
def get_saved_contracts_list(user_id: int, db: Session) -> List[SavedContract]:
    query = (
        select(SavedContract)
        .join(Contract, SavedContract.contract_id == Contract.id)
        .where(SavedContract.user_id == user_id)
        .options(selectinload(SavedContract.contract))
        .order_by(nullslast(asc(Contract.date_fermeture)))
    )
    return list(db.execute(query).scalars().all())


def get_saved_contract_by_id(user_id: int, saved_id: int, db: Session) -> Optional[SavedContract]:
    return db.execute(
        select(SavedContract)
        .where(SavedContract.id == saved_id, SavedContract.user_id == user_id)
        .options(selectinload(SavedContract.contract))
    ).scalar_one_or_none()


# updates is built by the service from SavedContractUpdate.model_dump(exclude_unset=True)
# so this only ever touches fields the caller actually sent.
def update_saved_contract(user_id: int, saved_id: int, updates: dict, db: Session) -> Optional[SavedContract]:
    row = db.execute(
        select(SavedContract).where(SavedContract.id == saved_id, SavedContract.user_id == user_id)
    ).scalar_one_or_none()
    if row is None:
        return None
    for key, value in updates.items():
        setattr(row, key, value)
    db.commit()
    return get_saved_contract_by_id(user_id, saved_id, db)


def delete_saved_contract(user_id: int, saved_id: int, db: Session) -> bool:
    result = db.execute(
        delete(SavedContract).where(SavedContract.id == saved_id, SavedContract.user_id == user_id)
    )
    db.commit()
    return result.rowcount > 0


# Sidebar badge: active-status items whose contract closes within 7 days and
# hasn't closed yet. safe_timestamptz() is the same Postgres function
# Analytics already relies on to parse date_fermeture's raw ISO-8601 text.
def get_closing_soon_count(user_id: int, db: Session) -> int:
    fermeture_ts = func.safe_timestamptz(Contract.date_fermeture)
    days_remaining = func.extract("epoch", fermeture_ts - func.now()) / 86400.0
    query = (
        select(func.count())
        .select_from(SavedContract)
        .join(Contract, SavedContract.contract_id == Contract.id)
        .where(
            SavedContract.user_id == user_id,
            SavedContract.status.in_(ACTIVE_STATUSES),
            fermeture_ts.is_not(None),
            days_remaining >= 0,
            days_remaining < 7,
        )
    )
    return db.execute(query).scalar() or 0
