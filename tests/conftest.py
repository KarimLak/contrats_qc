import pytest
from sqlalchemy import select

from app.database import SessionLocal, create_tables, ensure_alerts_support
from app.models.contract import Contract
from app.models.profile import BusinessProfile
from app.models.user import User
import app.models.saved_contract  # noqa: F401 — registers SavedContract with Base.metadata for create_tables() below
import app.models.alert  # noqa: F401 — registers Alert/AlertRecipient/etc. with Base.metadata for create_tables() below

# create_tables() is idempotent (CREATE TABLE only ever runs against tables
# SQLAlchemy doesn't already know about) and this repo has no migration
# tool (see app/database.py) — every table, including brand new ones like
# saved_contracts, only exists once something has called this. Session-
# scoped + autouse so it runs once before any test needs the table, the
# same way app/main.py does it for the live server. ensure_alerts_support()
# is the raw-DDL half of the same bootstrap (contracts.first_seen_at doesn't
# exist until that ALTER TABLE runs — create_tables() only creates whole
# tables, it can't add a column to one that already exists).
@pytest.fixture(scope="session", autouse=True)
def _ensure_tables():
    create_tables()
    ensure_alerts_support()

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


def _teardown_user_alert_rows(db, user_id: int) -> None:
    from sqlalchemy import text
    db.execute(text(
        "DELETE FROM alert_notifications WHERE alert_id IN (SELECT id FROM alerts WHERE user_id = :u)"
    ), {"u": user_id})
    db.execute(text(
        "DELETE FROM alert_recipient_links WHERE alert_id IN (SELECT id FROM alerts WHERE user_id = :u)"
    ), {"u": user_id})
    db.execute(text("DELETE FROM alerts WHERE user_id = :u"), {"u": user_id})
    db.execute(text("DELETE FROM alert_recipients WHERE user_id = :u"), {"u": user_id})


@pytest.fixture
def alerts_profile(db):
    """Dedicated out-of-band profile (id 999997) for the alerts test suite —
    kept separate from compatible_profile (999999) so alert tests don't
    entangle teardown ordering with the saved_contracts fixtures."""
    profile = BusinessProfile(
        id=999997, name="pytest-alerts-profile",
        sector=["Approvisionnement (biens)"], contract_type=[],
        expertise=["G17 - Ameublement"], region=["Montréal"],
        size=10, budget_min=0, budget_max=1,
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
def pro_user(db, alerts_profile):
    user = User(
        id=999997, username="pytest-alerts-pro", email="pytest-alerts-pro@example.com",
        hashed_password="not-a-real-hash", roles=["user", "pro"], is_active=True,
        business_id=alerts_profile.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    try:
        yield user
    finally:
        _teardown_user_alert_rows(db, user.id)
        db.delete(user)
        db.commit()


@pytest.fixture
def enterprise_user(db, alerts_profile):
    user = User(
        id=999996, username="pytest-alerts-enterprise", email="pytest-alerts-enterprise@example.com",
        hashed_password="not-a-real-hash", roles=["user", "enterprise"], is_active=True,
        business_id=alerts_profile.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    try:
        yield user
    finally:
        _teardown_user_alert_rows(db, user.id)
        db.delete(user)
        db.commit()


@pytest.fixture
def make_alert_test_contract(db):
    """Factory for throwaway Contract rows shaped to match alerts_profile
    (categorie/nature_contrat line up with its expertise/sector) so
    compatible_contracts_query — and therefore match=profil alerts —
    actually qualify them, with a caller-controlled first_seen_at so tests
    can place a row before/after a matching engine's `since` cutoff."""
    created_ids = []

    def _make(first_seen_at, **overrides):
        next_id = 9990000 + len(created_ids)
        # Core-level insert().values(...), not the ORM constructor: Contract
        # has search_vector as a Postgres GENERATED ALWAYS column, and an
        # ORM Contract(...) instance sends every mapped attribute (including
        # the untouched search_vector=None) in its INSERT, which Postgres
        # rejects for a generated column. Core insert only sends the columns
        # actually passed here, letting Postgres compute search_vector itself
        # — exactly what every real (non-test) row already relies on.
        values = dict(
            id=next_id,
            numero=f"TEST-{next_id}", numero_reference=f"TEST-REF-{next_id}",
            type_avis="Avis d'appel d'offres", statut="Publié", url="http://example.com/test",
            titre="Contrat de test pytest alerts", organisation="Organisation Test",
            nature_contrat="Approvisionnement (biens)", categorie="G17 - Ameublement",
            region="Montréal", accord="Aucun",
            date_publication="2026-01-01", date_fermeture=None,
            classifications="", documents=[],
            first_seen_at=first_seen_at,
        )
        values.update(overrides)
        db.execute(Contract.__table__.insert().values(**values))
        db.commit()
        created_ids.append(next_id)
        return db.get(Contract, next_id)

    yield _make

    from sqlalchemy import text
    for cid in created_ids:
        db.execute(text("DELETE FROM alert_notifications WHERE contract_id = :c"), {"c": cid})
        db.execute(text("DELETE FROM contracts WHERE id = :c"), {"c": cid})
    db.commit()
