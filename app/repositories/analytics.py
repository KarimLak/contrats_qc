from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func, case, and_, desc, asc, true
from sqlalchemy.orm import Session

from app.models.contract import Contract
from app.models.profile import BusinessProfile
from app.repositories.contract import _match_expressions, _not_expired, compatible_contracts_query

# This whole module answers "where are MY opportunities", not "what does the
# market look like" — every query below starts from compatible_contracts_query
# (app/repositories/contract.py — the same sector-OR-expertise qualification
# /recommended and the Explorateur's match=profil filter use) rather than the
# unfiltered contracts table. Sharing that one function instead of each
# caller re-deriving "is this compatible" is what keeps these counts and the
# Explorateur's counts from silently drifting apart — see
# tests/test_profile_compatibility_consistency.py. The old global-market
# version of this module cached results process-wide on a 20 min TTL (see
# git history); that cache can't survive going per-profile (every
# business_id would need its own cache slot), and at 889 rows a fresh
# aggregation is cheap enough that the cache wasn't buying much anyway, so
# it's dropped here.

def profile_is_usable(profile: BusinessProfile) -> bool:
    """A profile with neither a sector nor an expertise entry can never
    satisfy core_match (sector OR expertise) — every block below would
    silently return "0 results" instead of surfacing *why*."""
    return bool(profile.sector) or bool(profile.expertise)

def _open_predicate():
    return and_(Contract.statut != 'Annulé', _not_expired())

def _fermeture_ts():
    return func.safe_timestamptz(Contract.date_fermeture)

def _publication_ts():
    return func.safe_timestamptz(Contract.date_publication)

def _days_remaining():
    return func.extract('epoch', _fermeture_ts() - func.now()) / 86400.0

def _pressenti_predicate():
    return and_(Contract.fournisseur_pressenti.is_not(None), Contract.fournisseur_pressenti != '')


# ── Block 1: KPIs "Votre marché" ─────────────────────────────────────────────
def get_profile_kpis(profile: BusinessProfile, db: Session) -> dict:
    profile_categories = list(dict.fromkeys(profile.expertise or []))
    profile_sectors = list(dict.fromkeys(profile.sector or []))

    if not profile_is_usable(profile):
        return {"profile_ready": False, "compatible_open": 0, "closing_7d": 0,
                "new_this_week": 0, "new_last_week": 0, "total_open": 0, "pct_of_market": 0.0,
                "profile_categories": profile_categories, "profile_sectors": profile_sectors}

    compat = compatible_contracts_query(profile)
    fermeture_ts = _fermeture_ts()
    publication_ts = _publication_ts()
    days_remaining = _days_remaining()
    days_since_pub = func.extract('epoch', func.now() - publication_ts) / 86400.0

    query = (
        select(
            func.count().filter(compat).label('compatible_open'),
            func.count().filter(compat, fermeture_ts.is_not(None), days_remaining <= 7).label('closing_7d'),
            func.count().filter(compat, publication_ts.is_not(None), days_since_pub >= 0, days_since_pub <= 7).label('new_this_week'),
            func.count().filter(compat, publication_ts.is_not(None), days_since_pub > 7, days_since_pub <= 14).label('new_last_week'),
            func.count().label('total_open'),
        )
        .where(_open_predicate())
    )
    row = db.execute(query).one()
    compatible_open = row.compatible_open or 0
    total_open = row.total_open or 0
    pct_of_market = (compatible_open / total_open * 100.0) if total_open else 0.0

    return {
        "profile_ready": compatible_open > 0,
        "compatible_open": compatible_open,
        "closing_7d": row.closing_7d or 0,
        "new_this_week": row.new_this_week or 0,
        "new_last_week": row.new_last_week or 0,
        "total_open": total_open,
        "pct_of_market": round(pct_of_market, 1),
        "profile_categories": profile_categories,
        "profile_sectors": profile_sectors,
    }


# ── Block 2: Pipeline d'échéances ────────────────────────────────────────────
DEADLINE_BUCKETS = ["0-7", "8-14", "15-30", "30+"]
_PREVIEW_COLUMNS = (Contract.id, Contract.titre, Contract.organisation, Contract.categorie,
                     Contract.region, Contract.date_fermeture)

def _deadline_bucket_expr():
    fermeture_ts = _fermeture_ts()
    days_remaining = _days_remaining()
    return case(
        (fermeture_ts.is_(None), "30+"),
        (days_remaining <= 7, "0-7"),
        (days_remaining <= 14, "8-14"),
        (days_remaining <= 30, "15-30"),
        else_="30+",
    )

def get_deadline_pipeline(profile: BusinessProfile, db: Session) -> dict:
    if not profile_is_usable(profile):
        return {"buckets": [{"label": b, "count": 0, "preview": []} for b in DEADLINE_BUCKETS]}

    compat = compatible_contracts_query(profile)
    _, base_score, *_rest = _match_expressions(profile)  # base_score is still scoring, not qualification
    bucket = _deadline_bucket_expr()
    fermeture_ts = _fermeture_ts()

    counts_query = (
        select(bucket.label('bucket'), func.count().label('n'))
        .where(_open_predicate(), compat)
        .group_by(bucket)
    )
    counts = {b: 0 for b in DEADLINE_BUCKETS}
    for row in db.execute(counts_query):
        counts[row.bucket] = row.n

    # Ranked by the same additive score /recommended uses, so "most relevant"
    # means the same thing everywhere in the app — not a second definition
    # of relevance invented just for this preview.
    ranked = (
        select(
            *_PREVIEW_COLUMNS,
            bucket.label('bucket'),
            func.row_number().over(
                partition_by=bucket, order_by=[desc(base_score), asc(fermeture_ts)],
            ).label('rn'),
        )
        .where(_open_predicate(), compat)
        .subquery()
    )
    previews_query = select(ranked).where(ranked.c.rn <= 3).order_by(ranked.c.bucket, ranked.c.rn)
    previews_by_bucket: Dict[str, List[dict]] = {b: [] for b in DEADLINE_BUCKETS}
    for row in db.execute(previews_query):
        previews_by_bucket[row.bucket].append({
            "id": row.id, "titre": row.titre, "organisation": row.organisation,
            "categorie": row.categorie, "region": row.region, "date_fermeture": row.date_fermeture,
        })

    return {
        "buckets": [
            {"label": b, "count": counts[b], "preview": previews_by_bucket[b]}
            for b in DEADLINE_BUCKETS
        ],
    }


# ── Block 3: Radar d'opportunités ────────────────────────────────────────────
# BUG FIX vs the old global version: region is ';'-joined free text on ~9% of
# rows (province-wide notices listing every region) — grouping on the raw
# column produced ~40 "columns" (one per unique combination) instead of ~17
# (one per actual region). Split via unnest before aggregating, same pattern
# already used in app/repositories/explorer.py's region facet/filter.
RADAR_ADJACENT_LIMIT = 5

def _radar_row_categories(profile: BusinessProfile, db: Session) -> Tuple[List[str], List[str]]:
    profile_categories = list(dict.fromkeys(profile.expertise or []))
    if not profile_categories:
        return [], []

    # "Opportunités voisines": categories frequently co-published by the same
    # organisations that publish the profile's own categories — a proxy for
    # "buyers who already buy from you also buy this", not a global top-N.
    orgs_subq = (
        select(Contract.organisation)
        .where(_open_predicate(), Contract.categorie.in_(profile_categories))
        .distinct()
    )
    adjacent_query = (
        select(Contract.categorie, func.count().label('n'))
        .where(
            _open_predicate(),
            Contract.organisation.in_(orgs_subq),
            Contract.categorie.notin_(profile_categories),
        )
        .group_by(Contract.categorie)
        .order_by(func.count().desc())
        .limit(RADAR_ADJACENT_LIMIT)
    )
    adjacent = [row.categorie for row in db.execute(adjacent_query)]
    return profile_categories, adjacent

def get_radar_data(profile: BusinessProfile, db: Session) -> dict:
    profile_categories, adjacent_categories = _radar_row_categories(profile, db)
    row_categories = profile_categories + adjacent_categories
    if not row_categories:
        return {"categories": [], "adjacent_categories": [], "regions": [], "cells": []}

    parts = func.unnest(func.string_to_array(Contract.region, ';')).table_valued('val').render_derived()
    region_col = func.trim(parts.c.val)

    cell_query = (
        select(Contract.categorie, region_col.label('region'), func.count().label('n'))
        .select_from(Contract)
        .join(parts, true())
        .where(_open_predicate(), Contract.categorie.in_(row_categories))
        .group_by(Contract.categorie, region_col)
    )

    region_totals: Dict[str, int] = {}
    cells = []
    for row in db.execute(cell_query):
        if not row.region:
            continue
        cells.append({"categorie": row.categorie, "region": row.region, "count": row.n})
        region_totals[row.region] = region_totals.get(row.region, 0) + row.n
    regions = sorted(region_totals.keys(), key=lambda r: -region_totals[r])

    return {
        "categories": profile_categories,
        "adjacent_categories": adjacent_categories,
        "regions": regions,
        "cells": cells,
    }


# ── Block 4: Intelligence acheteurs (profil) + signaux compétitifs fusionnés ─
# A "fournisseur pressenti" on a notice signals the buyer already lined up a
# preferred supplier (quasi sole-source) rather than running an open
# competition — folded in here as a per-organisation warning badge instead
# of a separate block, per the merge instruction.
BUYER_ORG_LIMIT = 12
BUYER_CATEGORY_LIMIT = 3

def get_buyer_intelligence(profile: BusinessProfile, db: Session) -> dict:
    if not profile_is_usable(profile):
        return {"organizations": []}

    compat = compatible_contracts_query(profile)

    org_query = (
        select(
            Contract.organisation,
            func.count().label('open_count'),
            func.count().filter(_pressenti_predicate()).label('pressenti_count'),
        )
        .where(_open_predicate(), compat)
        .group_by(Contract.organisation)
        .order_by(func.count().desc())
        .limit(BUYER_ORG_LIMIT)
    )
    org_rows = db.execute(org_query).all()
    org_names = [r.organisation for r in org_rows]
    if not org_names:
        return {"organizations": []}

    grouped = (
        select(Contract.organisation, Contract.categorie, func.count().label('n'))
        .where(_open_predicate(), compat, Contract.organisation.in_(org_names))
        .group_by(Contract.organisation, Contract.categorie)
        .subquery()
    )
    ranked = (
        select(
            grouped.c.organisation, grouped.c.categorie, grouped.c.n,
            func.row_number().over(partition_by=grouped.c.organisation, order_by=grouped.c.n.desc()).label('rn'),
        )
        .subquery()
    )
    cat_query = (
        select(ranked.c.organisation, ranked.c.categorie, ranked.c.n)
        .where(ranked.c.rn <= BUYER_CATEGORY_LIMIT)
    )
    categories_by_org: Dict[str, List[dict]] = {name: [] for name in org_names}
    for row in db.execute(cat_query):
        categories_by_org[row.organisation].append({"categorie": row.categorie, "count": row.n})

    organizations = []
    for r in org_rows:
        pressenti_pct = (r.pressenti_count / r.open_count * 100.0) if r.open_count else 0.0
        organizations.append({
            "organisation": r.organisation,
            "open_count": r.open_count,
            "categories": categories_by_org.get(r.organisation, []),
            "pressenti_count": r.pressenti_count,
            "pressenti_pct": round(pressenti_pct, 1),
        })
    return {"organizations": organizations}


# ── Block 5: Fenêtre de réaction ─────────────────────────────────────────────
REACTION_CATEGORY_CAP = 6

def get_reaction_window(profile: BusinessProfile, db: Session) -> dict:
    profile_categories = list(dict.fromkeys(profile.expertise or []))[:REACTION_CATEGORY_CAP]
    if not profile_categories:
        return {"categories": [], "market_median_days": None}

    fermeture_ts = _fermeture_ts()
    publication_ts = _publication_ts()
    days = func.extract('epoch', fermeture_ts - publication_ts) / 86400.0
    valid = and_(fermeture_ts.is_not(None), publication_ts.is_not(None), fermeture_ts > publication_ts)

    cat_query = (
        select(
            Contract.categorie,
            func.percentile_cont(0.5).within_group(days).label('median_days'),
            func.count().label('n'),
        )
        .where(valid, Contract.categorie.in_(profile_categories))
        .group_by(Contract.categorie)
    )
    cat_rows = [r for r in db.execute(cat_query) if r.median_days is not None]
    cat_rows.sort(key=lambda r: r.median_days)

    market_median = db.execute(select(func.percentile_cont(0.5).within_group(days)).where(valid)).scalar()

    return {
        "categories": [
            {"categorie": r.categorie, "median_days": round(r.median_days, 1), "sample_size": r.n}
            for r in cat_rows
        ],
        "market_median_days": round(market_median, 1) if market_median is not None else None,
    }


# ── Block 6: Tendance ─────────────────────────────────────────────────────────
# Only ~1 month of publication history exists in this dataset today, so most
# of a naive 12-week window would be empty — MIN_SIGNAL_WEEKS below is the
# "don't show a flat/empty chart" gate from the spec, not a stylistic choice.
TREND_WEEKS = 12
MIN_SIGNAL_WEEKS = 3

def get_trend(profile: BusinessProfile, db: Session) -> Optional[dict]:
    if not profile_is_usable(profile):
        return None

    compat = compatible_contracts_query(profile)
    publication_ts = _publication_ts()
    weeks_ago = func.floor(func.extract('epoch', func.now() - publication_ts) / (7 * 86400.0))
    in_window = and_(publication_ts.is_not(None), weeks_ago >= 0, weeks_ago < TREND_WEEKS)

    profile_query = (
        select(weeks_ago.label('w'), func.count().label('n'))
        .where(in_window, compat)
        .group_by(weeks_ago)
    )
    market_query = (
        select(weeks_ago.label('w'), func.count().label('n'))
        .where(in_window)
        .group_by(weeks_ago)
    )
    profile_counts = {int(r.w): r.n for r in db.execute(profile_query)}
    market_counts = {int(r.w): r.n for r in db.execute(market_query)}

    weeks = [
        {"weeks_ago": w, "profile_count": profile_counts.get(w, 0), "market_count": market_counts.get(w, 0)}
        for w in range(TREND_WEEKS - 1, -1, -1)
    ]

    if sum(1 for wk in weeks if wk["profile_count"] > 0) < MIN_SIGNAL_WEEKS:
        return None

    return {"weeks": weeks}
