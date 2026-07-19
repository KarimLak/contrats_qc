import base64
import json
from datetime import date, datetime
from typing import List, Optional, Tuple
from sqlalchemy import select, func, case, or_, and_, false, tuple_
from sqlalchemy.orm import Session, load_only
from app.models.contract import Contract
from app.models.profile import BusinessProfile
from app.models.feedback import UserContractFeedback
from app.schemas.contract import ContractSortField, SortOrder
from sqlalchemy import asc, desc

def _apply_filters(query, filters: dict):
    for k, v in filters.items():
        column = getattr(Contract, k, None)
        if column is None or v is None:
            continue
        if isinstance(v, list):
            if not v:
                continue
            query = query.where(column.in_(v))
        else:
            query = query.where(column == v)
    return query

def get_contracts_count(filters: dict, db: Session) -> int:
    query = _apply_filters(select(func.count()).select_from(Contract), filters)
    return db.execute(query).scalar() or 0

def get_contracts_list(filters: dict, skip: int, limit: int, sort_by: ContractSortField, sort_order: SortOrder, db: Session) -> List[Contract]:
    query = _apply_filters(select(Contract), filters)
    order_column = getattr(Contract, sort_by.value)
    order_func = desc if sort_order == SortOrder.desc else asc
    query = query.order_by(order_func(order_column)).offset(skip).limit(limit)
    return db.execute(query).scalars().all()

def get_contract_by_id(contract_id: int, db: Session) -> Contract | None:
    return db.execute(select(Contract).where(Contract.id == contract_id)).scalar_one_or_none()

# ── Recommendations ──────────────────────────────────────────────────────────
# Relevance is scored from the business profile fields that have a real counterpart
# on a contract, as a single indexed SQL query the DB filters/scores/sorts/paginates
# on its own — no need to pull the whole contracts table into app memory to rank it
# in Python. Each dimension contributes independently (additive points, cap 100):
#   - expertise (35): contract.categorie is one of the profile's expertise domains
#   - sector    (25): contract.nature_contrat is one of the profile's sectors
#   - region    (20): contract.region is one of the profile's regions of operation
#   - contract type (15): contract.type_avis is one of the profile's preferred notice types
#   - small-business bonus (5): contract is a notice reserved for small businesses
#     and the profile's headcount is at/under the SME threshold
# categorie is nested under (and sometimes shared across) several natureContrat values
# in the SEAO taxonomy, so an expertise match is weighted above a sector match alone.
# budget_min/budget_max aren't scored: the Contract model has no estimated-value field
# to compare them against (garantie_valeur is a bid security amount, not the contract's
# value), so faking a budget signal from it would be noise, not signal.
# A contract must match on expertise to be considered "recommended"/"compatible"
# at all — sector alone no longer qualifies (per explicit product decision:
# sector-only was too broad), it's now purely a scoring bonus on top of an
# already-qualifying expertise match. region/type/size work the same way —
# they only add points, they never qualify a contract by themselves
# (otherwise every open contract in your region would show up).
SCORE_EXPERTISE = 35
SCORE_SECTOR = 25
SCORE_REGION = 20
SCORE_CONTRACT_TYPE = 15
SCORE_SME_BONUS = 5

SME_SIZE_THRESHOLD = 100  # headcount at/under this is treated as a small/medium business

# contracts.type_avis holds raw SEAO text, which uses the typographic
# apostrophe U+2019 ("d'appel"), not the plain ASCII "'" (U+0027) — confirmed
# by querying live data. app/type/tender.py's TenderType enum and the
# frontend's hardcoded CONTRACT_TYPE_OPTIONS/SME constant were typed by hand
# with the ASCII apostrophe, so both the +15 contract-type match and the +5
# SME bonus below silently matched nothing. Normalize the apostrophe on the
# comparison values (not the column) so the existing index on type_avis
# still applies.
def _normalize_apostrophe(value: str) -> str:
    return value.replace("'", "’")

SME_RESERVED_TYPE_AVIS = _normalize_apostrophe(
    "Avis d'appel d'offres réservé aux petites entreprises du Québec et à celles d'ailleurs au Canada"
)

# profile.expertise/profile.sector are populated straight from the same raw
# SEAO taxonomy strings stored on the contract (client/lib/businessProfileOptions.ts
# mirrors the live distinct values of categorie/nature_contrat verbatim,
# code prefix and all — e.g. profile.expertise holds "G15 - Alimentation",
# and Contract.categorie stores that exact same string, not a clean enum
# label). Compare them as-is: an earlier revision here "normalized" both
# sides against app/type/tender.py's TenderCategory/TenderNature enums,
# which looked cleaner but don't actually match production data, and that
# silently zeroed out the expertise/sector points for most profiles.
def _match_expressions(profile: BusinessProfile):
    sector_match = Contract.nature_contrat.in_(profile.sector) if profile.sector else false()
    expertise_match = Contract.categorie.in_(profile.expertise) if profile.expertise else false()
    region_match = Contract.region.in_(profile.region) if profile.region else false()
    contract_type_values = [_normalize_apostrophe(v) for v in profile.contract_type] if profile.contract_type else []
    contract_type_match = Contract.type_avis.in_(contract_type_values) if contract_type_values else false()
    sme_bonus = (
        Contract.type_avis == SME_RESERVED_TYPE_AVIS
        if profile.size is not None and profile.size <= SME_SIZE_THRESHOLD
        else false()
    )

    # Qualification is expertise-only; sector_match still feeds base_score
    # below as a bonus, it just can't qualify a contract on its own anymore.
    core_match = expertise_match
    base_score = (
        case((expertise_match, SCORE_EXPERTISE), else_=0)
        + case((sector_match, SCORE_SECTOR), else_=0)
        + case((region_match, SCORE_REGION), else_=0)
        + case((contract_type_match, SCORE_CONTRACT_TYPE), else_=0)
        + case((sme_bonus, SCORE_SME_BONUS), else_=0)
    )
    return core_match, base_score, expertise_match, sector_match, region_match, contract_type_match, sme_bonus

# ── Profile compatibility (single source of truth) ────────────────────────────
# "Is this contract compatible with this business profile" — expertise match
# (categorie), the same qualification core_match already computes above —
# used to only exist embedded inside _match_expressions (built for scoring),
# so every other caller that needed a plain yes/no answer (analytics KPIs,
# the Explorateur, links built by the frontend) re-derived its own
# approximation, which is how a KPI-vs-Explorateur count mismatch happened
# once already. Every caller that needs "is this contract compatible with
# X's profile" — scoring, analytics, the Explorateur's match=profil filter,
# or an alert's match=profil filter — should call this instead of
# re-deriving the condition.
#
# Was sector-OR-expertise; narrowed to expertise-only per explicit product
# decision (sector alone was judged too broad a qualifier). sector_match is
# still a scoring bonus in _match_expressions above, it just can't qualify a
# contract by itself anymore.
def compatible_contracts_query(profile: BusinessProfile):
    core_match, *_ = _match_expressions(profile)
    # A cancelled notice is never "open" regardless of what its date_fermeture
    # says (_not_expired() is purely date-based) — bundled in here rather
    # than duplicated at each call site, since every caller that wants
    # compatibility also wants to exclude cancelled notices from it.
    return and_(core_match, Contract.statut != 'Annulé')

def _not_expired():
    today = date.today().isoformat()
    return or_(Contract.date_fermeture.is_(None), Contract.date_fermeture >= today)

# Continuous urgency tie-breaker so contracts sharing the same additive score
# don't clump together: +10 if closing in under 7 days, decaying linearly to
# 0 at 60 days, 0 beyond that (or when date_fermeture is missing/unparseable).
# Only used to break ties in ORDER BY — it is never added into match_score,
# which stays the 0-100 additive score shown to the user.
# Computed from safe_timestamptz() (app/database.py) — the same
# timezone-aware cast the analytics module uses, backed by the existing
# ix_contracts_fermeture_ts functional index — rather than the raw string,
# since urgency needs a real day count, not just a lexicographic >= compare.
_URGENCY_MAX = 10.0
_URGENCY_FLOOR_DAYS = 7.0
_URGENCY_CEILING_DAYS = 60.0

def _urgency_bonus():
    fermeture_ts = func.safe_timestamptz(Contract.date_fermeture)
    days_remaining = func.extract('epoch', fermeture_ts - func.now()) / 86400.0
    return case(
        (fermeture_ts.is_(None), 0.0),
        (days_remaining <= _URGENCY_FLOOR_DAYS, _URGENCY_MAX),
        (days_remaining >= _URGENCY_CEILING_DAYS, 0.0),
        else_=_URGENCY_MAX * (_URGENCY_CEILING_DAYS - days_remaining) / (_URGENCY_CEILING_DAYS - _URGENCY_FLOOR_DAYS),
    )

# "Pas pertinent" hides a contract from recommendations for that user without
# touching the contract row itself — a correlated NOT EXISTS against the new
# feedback table, evaluated per-row in the same query (no N+1).
def _not_marked_irrelevant(user_id: int):
    return ~(
        select(UserContractFeedback.id)
        .where(
            UserContractFeedback.user_id == user_id,
            UserContractFeedback.contract_id == Contract.id,
            UserContractFeedback.action == "not_relevant",
        )
        .exists()
    )

def get_recommended_contracts_count(profile: BusinessProfile, user_id: int, db: Session) -> int:
    core_match, *_ = _match_expressions(profile)
    query = (
        select(func.count()).select_from(Contract)
        .where(Contract.statut == "Publié", _not_expired(), core_match, _not_marked_irrelevant(user_id))
    )
    return db.execute(query).scalar() or 0

# Backs the "X avis ferment dans les 7 prochains jours" banner. Counted across
# every matching contract, not just the current page, so a separate query —
# the pinned banner would otherwise undercount whatever isn't loaded yet.
def get_recommended_contracts_closing_soon_count(profile: BusinessProfile, user_id: int, db: Session) -> int:
    core_match, *_ = _match_expressions(profile)
    fermeture_ts = func.safe_timestamptz(Contract.date_fermeture)
    days_remaining = func.extract('epoch', fermeture_ts - func.now()) / 86400.0
    query = (
        select(func.count()).select_from(Contract)
        .where(
            Contract.statut == "Publié", _not_expired(), core_match, _not_marked_irrelevant(user_id),
            fermeture_ts.is_not(None), days_remaining < _URGENCY_FLOOR_DAYS,
        )
    )
    return db.execute(query).scalar() or 0

# The listing only ever displays the top RECOMMENDED_PAGE_CAP contracts (see
# get_recommended_contracts_page) — a paying user scrolling past #50 gets
# diminishing value from the ranking anyway, and everything past it is one
# click away in the Explorateur, pre-filtered.
RECOMMENDED_PAGE_CAP = 50

# Columns actually rendered by the recommended-list card (ContractCard) plus
# the ones _match_expressions/_urgency_bonus need to filter/score/order on.
# Everything else on Contract (remarque, documents, garantie_*, contact_*,
# ~27 more columns) would otherwise be fetched and JSON-encoded for 50 rows
# on every page load for no reason — load_only() keeps that off the wire.
_LISTING_COLUMNS = (
    Contract.id, Contract.titre, Contract.organisation, Contract.statut,
    Contract.nature_contrat, Contract.categorie, Contract.region, Contract.type_avis,
    Contract.date_publication, Contract.date_fermeture,
)

def _encode_cursor(neg_score: float, has_no_date: int, fermeture_sort: datetime, contract_id: int) -> str:
    payload = json.dumps([neg_score, has_no_date, fermeture_sort.isoformat(), contract_id])
    return base64.urlsafe_b64encode(payload.encode()).decode()

def _decode_cursor(cursor: str) -> Tuple[float, int, datetime, int]:
    neg_score, has_no_date, fermeture_iso, contract_id = json.loads(base64.urlsafe_b64decode(cursor.encode()))
    return float(neg_score), int(has_no_date), datetime.fromisoformat(fermeture_iso), int(contract_id)

# Keyset (not OFFSET) pagination: OFFSET N re-scans and discards N rows on
# every request, which gets wasteful (and, under concurrent writes, can skip
# or repeat rows) the deeper you page. Here it also composes naturally with
# the "top 50" cap below: the ranking is computed and capped once in `ranked`,
# then each page is just "give me the next slice of that already-capped set
# after this cursor" — a cheap indexed lookup instead of a growing scan.
#
# The ORDER BY mixes directions (score DESC, no-date-last, closing date ASC,
# id ASC as a final tiebreaker), which a row-value keyset comparison can't
# express directly (Postgres compares a whole tuple with one operator). So
# every sort key here is pre-normalized to something plain ascending:
#   - neg_score = -total_score, so ORDER BY ASC on it means "highest score first"
#   - has_no_date = 1 when date_fermeture is NULL/unparseable, else 0, so
#     ASC puts contracts *with* a closing date before open-ended ones —
#     i.e. NULLS LAST, without relying on nullslast() (which keyset can't use).
#   - fermeture_sort coalesces to the epoch when there's no date, so the
#     column itself is never NULL (row-value comparisons treat NULL as
#     "unknown" and silently drop rows, which would corrupt the keyset).
def get_recommended_contracts_page(
    profile: BusinessProfile, user_id: int, cursor: Optional[str], limit: int, db: Session,
) -> Tuple[List[Tuple], Optional[str]]:
    core_match, base_score, expertise_match, sector_match, region_match, contract_type_match, sme_bonus = _match_expressions(profile)
    fermeture_ts = func.safe_timestamptz(Contract.date_fermeture)
    total_score = base_score + _urgency_bonus()
    neg_score = (-total_score).label("neg_score")
    has_no_date = case((fermeture_ts.is_(None), 1), else_=0).label("has_no_date")
    fermeture_sort = func.coalesce(fermeture_ts, func.to_timestamp(0)).label("fermeture_sort")

    ranked = (
        select(
            Contract.id.label("contract_id"),
            base_score.label("base_score"),
            neg_score, has_no_date, fermeture_sort,
            expertise_match.label("expertise_matched"),
            sector_match.label("sector_matched"),
            region_match.label("region_matched"),
            contract_type_match.label("contract_type_matched"),
            sme_bonus.label("sme_matched"),
        )
        .where(Contract.statut == "Publié", _not_expired(), core_match, _not_marked_irrelevant(user_id))
        .order_by("neg_score", "has_no_date", "fermeture_sort", Contract.id)
        .limit(RECOMMENDED_PAGE_CAP)
        .subquery()
    )

    query = (
        select(
            ranked.c.base_score, ranked.c.neg_score, ranked.c.has_no_date, ranked.c.fermeture_sort,
            ranked.c.expertise_matched, ranked.c.sector_matched, ranked.c.region_matched,
            ranked.c.contract_type_matched, ranked.c.sme_matched,
            Contract,
        )
        .join(Contract, Contract.id == ranked.c.contract_id)
        .options(load_only(*_LISTING_COLUMNS))
        .order_by(ranked.c.neg_score, ranked.c.has_no_date, ranked.c.fermeture_sort, ranked.c.contract_id)
        .limit(limit)
    )
    if cursor:
        cur = _decode_cursor(cursor)
        query = query.where(
            tuple_(ranked.c.neg_score, ranked.c.has_no_date, ranked.c.fermeture_sort, ranked.c.contract_id) > cur
        )

    rows = db.execute(query).all()
    next_cursor = None
    if len(rows) == limit:
        last = rows[-1]
        next_cursor = _encode_cursor(last.neg_score, last.has_no_date, last.fermeture_sort, last.Contract.id)
    return rows, next_cursor
