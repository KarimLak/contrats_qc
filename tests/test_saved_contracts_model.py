"""Model-level coverage for saved_contracts (app/models/saved_contract.py).

Note on scope: the task that introduced this table also asked for a test
that a saved contract survives cleanup_expired() in sync_s3_to_postgres.py —
that script isn't part of this repository (confirmed: no file, no function,
no scripts/etl/sync directory anywhere in this codebase), so that specific
test can't be written here. What *can* and is verified here is the
saved_contracts side of the contract: the table itself, its constraints,
and the selectinload relationship the listing endpoint depends on to avoid
N+1 — i.e. everything on this side of the boundary with the (external)
sync pipeline.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.models.saved_contract import SavedContract


def _make(db, test_user, sample_contract_id, **overrides):
    row = SavedContract(user_id=test_user.id, contract_id=sample_contract_id, **overrides)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_default_status_is_a_evaluer(db, test_user, sample_contract_id):
    row = _make(db, test_user, sample_contract_id)
    assert row.status == "a_evaluer"
    assert row.note is None
    assert row.created_at is not None
    assert row.updated_at is not None


def test_unique_user_contract_constraint(db, test_user, sample_contract_id):
    _make(db, test_user, sample_contract_id)
    with pytest.raises(IntegrityError):
        db.add(SavedContract(user_id=test_user.id, contract_id=sample_contract_id))
        db.commit()
    db.rollback()


def test_contract_fk_is_enforced(db, test_user):
    db.add(SavedContract(user_id=test_user.id, contract_id=-1))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_selectinload_avoids_lazy_load(db, test_user, sample_contract_id):
    """contract has lazy="raise" — accessing it without eager-loading must
    fail loudly (catches an accidental N+1 at test time) and succeed
    cleanly once selectinload is used, which is exactly what the /saved
    listing endpoint does."""
    _make(db, test_user, sample_contract_id)

    unloaded = db.execute(
        select(SavedContract).where(SavedContract.user_id == test_user.id)
    ).scalar_one()
    with pytest.raises(Exception):
        _ = unloaded.contract.titre

    db.expire_all()
    eager = db.execute(
        select(SavedContract)
        .where(SavedContract.user_id == test_user.id)
        .options(selectinload(SavedContract.contract))
    ).scalar_one()
    assert eager.contract.id == sample_contract_id
    assert eager.contract.titre  # no additional query needed to reach this
