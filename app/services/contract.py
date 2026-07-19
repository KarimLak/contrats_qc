from typing import List, Optional
from urllib.parse import urlencode

from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.repositories.contract import (
    get_contracts_list, get_contracts_count, get_contract_by_id,
    get_recommended_contracts_page, get_recommended_contracts_count,
    get_recommended_contracts_closing_soon_count, RECOMMENDED_PAGE_CAP,
)
from app.repositories.feedback import upsert_feedback, delete_feedback
from app.repositories.explorer import (
    get_explorer_page, get_explorer_count, get_explorer_facets, get_organisation_suggestions,
)
from app.repositories.profile import business_profile
from app.repositories.user import get_user
from app.models.profile import BusinessProfile
from app.schemas.contract import (
    ContractFilter, ContractFilterResponse, ContractResponse, ContractSortField, SortOrder,
    RecommendedContract, RecommendedContractsResponse, ScoreBreakdown,
    ContractFeedbackResponse, FeedbackAction,
    ExplorerContract, ExplorerContractsResponse, ExplorerFacets, ExplorerSort, ExplorerMatchMode,
    FacetOption, OrganisationSuggestion,
)

# Only region is used to pre-filter the Explorateur link (not nature_contrat
# or categorie): recommendations qualify on sector OR expertise, but the
# Explorateur's filters AND across fields — combining both there would show
# a strict subset of what "compatible" means here, undershooting the count
# promised by the "voir les N autres avis" footer instead of just being a
# reasonable superset starting point.
def _build_explorer_url(profile: BusinessProfile) -> str:
    params = [("statut", "Publié")]
    for region in (profile.region or []):
        params.append(("region", region))
    return f"/explorer?{urlencode(params)}"

def get_contracts(payload: ContractFilter, skip: int, limit: int, sort_by: ContractSortField, sort_order: SortOrder, db: Session) -> ContractFilterResponse:
    data = payload.model_dump(exclude_none=True)
    total = get_contracts_count(data, db)
    contracts = get_contracts_list(data, skip, limit, sort_by, sort_order, db)
    return ContractFilterResponse(skip=skip, limit=limit, total=total, contracts=contracts)

def get_contract(contract_id: int, db: Session):
    return get_contract_by_id(contract_id, db)

def get_recommended_contracts(username: str, cursor: Optional[str], limit: int, db: Session) -> RecommendedContractsResponse:
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = business_profile(user.business_id, db)
    if profile is None:
        raise HTTPException(status_code=404, detail="Business profile not found")

    total = get_recommended_contracts_count(profile, user.id, db)
    closing_soon_count = get_recommended_contracts_closing_soon_count(profile, user.id, db)
    rows, next_cursor = get_recommended_contracts_page(profile, user.id, cursor, limit, db)

    contracts = [
        RecommendedContract(
            id=row.Contract.id,
            titre=row.Contract.titre,
            organisation=row.Contract.organisation,
            statut=row.Contract.statut,
            nature_contrat=row.Contract.nature_contrat,
            categorie=row.Contract.categorie,
            region=row.Contract.region,
            type_avis=row.Contract.type_avis,
            date_publication=row.Contract.date_publication,
            date_fermeture=row.Contract.date_fermeture,
            match_score=row.base_score,
            score_breakdown=ScoreBreakdown(
                expertise=row.expertise_matched,
                sector=row.sector_matched,
                region=row.region_matched,
                contract_type=row.contract_type_matched,
                sme_reserved=row.sme_matched,
            ),
        )
        for row in rows
    ]
    return RecommendedContractsResponse(
        limit=limit,
        total=total,
        capped_total=min(total, RECOMMENDED_PAGE_CAP),
        closing_soon_count=closing_soon_count,
        next_cursor=next_cursor,
        explorer_url=_build_explorer_url(profile),
        contracts=contracts,
    )


def set_contract_feedback(username: str, contract_id: int, action: FeedbackAction, db: Session) -> ContractFeedbackResponse:
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if get_contract_by_id(contract_id, db) is None:
        raise HTTPException(status_code=404, detail="Contract not found")

    row = upsert_feedback(user.id, contract_id, action.value, db)
    return ContractFeedbackResponse.model_validate(row)


def remove_contract_feedback(username: str, contract_id: int, db: Session) -> None:
    user = get_user(username, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not delete_feedback(user.id, contract_id, db):
        raise HTTPException(status_code=404, detail="Feedback not found")


def search_explorer_contracts(
    filters: dict, q: Optional[str], closing_within: Optional[int],
    sort: ExplorerSort, cursor: Optional[str], limit: int, db: Session,
    match: Optional[ExplorerMatchMode] = None, username: Optional[str] = None,
) -> ExplorerContractsResponse:
    profile = None
    if match == ExplorerMatchMode.profil:
        # Router already 401s if match=profil is requested with no
        # authenticated caller — username is guaranteed non-None here.
        user = get_user(username, db)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        profile = business_profile(user.business_id, db)
        if profile is None:
            raise HTTPException(status_code=404, detail="Business profile not found")

    total = get_explorer_count(filters, q, closing_within, db, profile)
    contract_rows, next_cursor = get_explorer_page(filters, q, closing_within, sort.value, cursor, limit, db, profile)
    facets_raw = get_explorer_facets(filters, q, closing_within, db, profile)

    contracts = [ExplorerContract.model_validate(c) for c in contract_rows]
    facets = ExplorerFacets(
        **{
            dimension: [FacetOption(value=v, count=n) for v, n in options]
            for dimension, options in facets_raw.items()
        }
    )
    return ExplorerContractsResponse(
        limit=limit, total=total, next_cursor=next_cursor, facets=facets, contracts=contracts,
    )


def suggest_organisations(q: Optional[str], limit: int, db: Session) -> List[OrganisationSuggestion]:
    rows = get_organisation_suggestions(q, limit, db)
    return [OrganisationSuggestion(name=name, count=count) for name, count in rows]


