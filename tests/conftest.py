import pytest
from sqlalchemy import select

from app.database import SessionLocal, create_tables
from app.models.contract import Contract
from app.models.profile import BusinessProfile
from app.models.user import User
import app.models.saved_contract  # noqa: F401 — registers SavedContract with Base.metadata for create_tables() below

# create_tables() is idempotent (CREATE TABLE only ever runs against tables
# SQLAlchemy doesn't already know about) and this repo has no migration
# tool (see app/database.py) — every table, including brand new ones like
# saved_contracts, only exists once something has called this. Session-
# scoped + autouse so it runs once before any test needs the table, the
# same way app/main.py does it for the live server.
@pytest.fixture(scope="session", autouse=True)
def _ensure_tables():
    create_tables()

# No test-database isolation exists anywhere in this repo (no migration
# tool, no docker-compose test service — see app/database.py's comments on
# why) — every other verification this project has relied on runs against
# the real configured DATABASE_URL. These tests follow that same
# convention: real read queries against real data, plus a throwaway
# BusinessProfile row that's created and torn down per test.

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def compatible_profile(db):
    """A profile shaped like real production data (see
    client/lib/businessProfileOptions.ts — codes/labels straight off the
    live SEAO taxonomy, not the cleaner app/type/tender.py enum) so it
    actually qualifies contracts via compatible_contracts_query, instead of
    silently matching zero rows the way a profile with made-up category
    strings would."""
    # businessprofile's id sequence is behind the actual max id in this
    # database (rows were loaded with explicit ids at some point, bypassing
    # the SERIAL counter) — a bare insert can collide with a real row.
    # An arbitrarily high, out-of-band id sidesteps that without touching
    # shared sequence state.
    profile = BusinessProfile(
        id=999999,
        name="pytest-compatibility-consistency",
        sector=["Approvisionnement (biens)", "Travaux de construction"],
        contract_type=[],
        expertise=["G17 - Ameublement", "G15 - Alimentation", "G1 - Aérospatiale"],
        region=["Montréal"],
        size=10,
        budget_min=0,
        budget_max=1,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    try:
        yield profile
    finally:
        db.delete(profile)
        db.commit()


@pytest.fixture
def test_user(db, compatible_profile):
    """Out-of-band id (999999), same rationale as compatible_profile — this
    table's id sequence is also behind its real max id."""
    user = User(
        id=999999,
        username="pytest-saved-contracts",
        email="pytest-saved-contracts@example.com",
        hashed_password="not-a-real-hash",
        roles=["user"],
        is_active=True,
        business_id=compatible_profile.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    try:
        yield user
    finally:
        # Any saved_contracts row a test created against this user (FK:
        # saved_contracts.user_id -> users.id, default RESTRICT) would
        # otherwise block this delete and leave both this row *and*
        # compatible_profile's teardown stranded for the next run.
        from sqlalchemy import text
        db.execute(text("DELETE FROM saved_contracts WHERE user_id = :uid"), {"uid": user.id})
        db.delete(user)
        db.commit()


@pytest.fixture
def sample_contract_id(db):
    """A real, existing contract id — read-only, never mutated. saved_contracts
    tests need a genuine FK target, not a fabricated one, since the whole
    point is exercising the real contracts table relationship."""
    return db.execute(select(Contract.id).limit(1)).scalar_one()
