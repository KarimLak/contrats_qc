from datetime import date
from typing import List, Tuple
from sqlalchemy import select, func, case, or_, false, nullslast
from sqlalchemy.orm import Session
from app.models.contract import Contract
from app.models.profile import BusinessProfile
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
# A contract must match on sector and/or expertise to be considered "recommended" at
# all — region/type/size only add points on top, they don't qualify a contract by
# themselves (otherwise every open contract in your region would show up).
SCORE_EXPERTISE = 35
SCORE_SECTOR = 25
SCORE_REGION = 20
SCORE_CONTRACT_TYPE = 15
SCORE_SME_BONUS = 5

SME_RESERVED_TYPE_AVIS = "Avis d'appel d'offres réservé aux petites entreprises du Québec et à celles d'ailleurs au Canada"
SME_SIZE_THRESHOLD = 100  # headcount at/under this is treated as a small/medium business

def _match_expressions(profile: BusinessProfile):
    sector_match = Contract.nature_contrat.in_(profile.sector) if profile.sector else false()
    expertise_match = Contract.categorie.in_(profile.expertise) if profile.expertise else false()
    region_match = Contract.region.in_(profile.region) if profile.region else false()
    contract_type_match = Contract.type_avis.in_(profile.contract_type) if profile.contract_type else false()
    sme_bonus = (
        Contract.type_avis == SME_RESERVED_TYPE_AVIS
        if profile.size is not None and profile.size <= SME_SIZE_THRESHOLD
        else false()
    )

    core_match = or_(sector_match, expertise_match)
    score = (
        case((expertise_match, SCORE_EXPERTISE), else_=0)
        + case((sector_match, SCORE_SECTOR), else_=0)
        + case((region_match, SCORE_REGION), else_=0)
        + case((contract_type_match, SCORE_CONTRACT_TYPE), else_=0)
        + case((sme_bonus, SCORE_SME_BONUS), else_=0)
    )
    return core_match, score

def _not_expired():
    today = date.today().isoformat()
    return or_(Contract.date_fermeture.is_(None), Contract.date_fermeture >= today)

def get_recommended_contracts_count(profile: BusinessProfile, db: Session) -> int:
    core_match, _ = _match_expressions(profile)
    query = (
        select(func.count()).select_from(Contract)
        .where(Contract.statut == "Publié", _not_expired(), core_match)
    )
    return db.execute(query).scalar() or 0

def get_recommended_contracts_list(profile: BusinessProfile, skip: int, limit: int, db: Session) -> List[Tuple[Contract, int]]:
    core_match, score = _match_expressions(profile)
    score_label = score.label("match_score")
    query = (
        select(Contract, score_label)
        .where(Contract.statut == "Publié", _not_expired(), core_match)
        .order_by(desc(score_label), nullslast(asc(Contract.date_fermeture)))
        .offset(skip).limit(limit)
    )
    return db.execute(query).all()
