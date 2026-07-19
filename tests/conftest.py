import pytest

from app.database import SessionLocal
from app.models.profile import BusinessProfile

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
