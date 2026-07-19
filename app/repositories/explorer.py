import base64
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func, and_, tuple_, true, cast, Float
from sqlalchemy.orm import Session, load_only

from app.models.contract import Contract
from app.repositories.contract import _not_expired, _LISTING_COLUMNS

# ── Search ────────────────────────────────────────────────────────────────────
# french_unaccent (see ensure_search_support() in app/database.py) so a query
# typed without accents still matches accented content and vice versa.
def _search_predicate(q: Optional[str]):
    if not q:
        return None
    return Contract.search_vector.op('@@')(func.websearch_to_tsquery('french_unaccent', q))

def _search_rank(q: Optional[str]):
    return func.ts_rank(Contract.search_vector, func.websearch_to_tsquery('french_unaccent', q))

# ── Region (multivalued, ';'-joined free text — confirmed against live data:
# ~9% of rows list several regions, e.g. province-wide contracts) ─────────────
# A plain Contract.region.in_(values) only matches a row whose *entire* region
# string equals one selected value, so it silently misses every multi-region
# contract. This checks membership within the split list instead.
def _region_match(regions: Optional[List[str]]):
    if not regions:
        return None
    parts = func.unnest(func.string_to_array(Contract.region, ';')).table_valued('val').render_derived()
    return (
        select(1).select_from(parts)
        .where(func.trim(parts.c.val).in_(regions))
        .exists()
    )

def _closing_within(days: Optional[int]):
    if not days:
        return None
    fermeture_ts = func.safe_timestamptz(Contract.date_fermeture)
    days_remaining = func.extract('epoch', fermeture_ts - func.now()) / 86400.0
    return and_(fermeture_ts.is_not(None), days_remaining <= days)

_SIMPLE_FILTER_COLUMNS = {
    "statut": Contract.statut,
    "nature_contrat": Contract.nature_contrat,
    "categorie": Contract.categorie,
    "organisation": Contract.organisation,
}

def _dimension_predicate(dimension: str, values: Optional[List[str]]):
    if not values:
        return None
    if dimension == "region":
        return _region_match(values)
    return _SIMPLE_FILTER_COLUMNS[dimension].in_(values)

# Shared WHERE clauses: open contracts only (this page is scoped to "avis
# ouverts", so the threshold applies regardless of which statut is picked —
# see the note in get_explorer_page below) + search + closing-within + every
# filter dimension except `exclude`. Facet counts for a dimension use
# exclude=that dimension so picking "Montréal" doesn't itself zero out every
# other region's count.
def _base_predicates(
    filters: Dict[str, List[str]], q: Optional[str], closing_within: Optional[int], exclude: Optional[str] = None,
):
    predicates = [_not_expired()]
    search_pred = _search_predicate(q)
    if search_pred is not None:
        predicates.append(search_pred)
    closing_pred = _closing_within(closing_within)
    if closing_pred is not None:
        predicates.append(closing_pred)
    for dimension in ("statut", "region", "nature_contrat", "categorie", "organisation"):
        if dimension == exclude:
            continue
        pred = _dimension_predicate(dimension, filters.get(dimension))
        if pred is not None:
            predicates.append(pred)
    return predicates

def get_explorer_count(filters: Dict[str, List[str]], q: Optional[str], closing_within: Optional[int], db: Session) -> int:
    query = select(func.count()).select_from(Contract).where(*_base_predicates(filters, q, closing_within))
    return db.execute(query).scalar() or 0

# One small GROUP BY per dimension — 4 bounded aggregate queries per page
# load, not a per-row cost, so this is a different concern from N+1 on the
# listing itself. Region is unnested so a province-wide contract contributes
# to every region it covers, matching _region_match's membership semantics.
def _facet_counts(
    filters: Dict[str, List[str]], q: Optional[str], closing_within: Optional[int], db: Session, dimension: str,
) -> List[Tuple[str, int]]:
    predicates = _base_predicates(filters, q, closing_within, exclude=dimension)
    if dimension == "region":
        parts = func.unnest(func.string_to_array(Contract.region, ';')).table_valued('val').render_derived()
        value_col = func.trim(parts.c.val)
        # `parts` correlates to Contract.region, so Postgres treats this as
        # an implicit LATERAL join regardless of the (trivial) ON clause —
        # `true()` just gives SQLAlchemy an explicit join condition instead
        # of an inferred cartesian product, which is the same join but
        # without the "did you forget a condition?" warning.
        query = (
            select(value_col.label("value"), func.count().label("n"))
            .select_from(Contract)
            .join(parts, true())
            .where(*predicates)
            .group_by(value_col)
            .order_by(func.count().desc())
        )
    else:
        col = _SIMPLE_FILTER_COLUMNS[dimension]
        query = (
            select(col.label("value"), func.count().label("n"))
            .where(*predicates)
            .group_by(col)
            .order_by(func.count().desc())
        )
    return [(row.value, row.n) for row in db.execute(query).all()]

def get_explorer_facets(
    filters: Dict[str, List[str]], q: Optional[str], closing_within: Optional[int], db: Session,
) -> Dict[str, List[Tuple[str, int]]]:
    return {
        dimension: _facet_counts(filters, q, closing_within, db, dimension)
        for dimension in ("statut", "region", "nature_contrat", "categorie")
    }

def get_organisation_suggestions(q: Optional[str], limit: int, db: Session) -> List[Tuple[str, int]]:
    query = (
        select(Contract.organisation, func.count().label("n"))
        .where(_not_expired())
        .group_by(Contract.organisation)
    )
    if q:
        query = query.where(Contract.organisation.ilike(f"%{q}%"))
    query = query.order_by(func.count().desc()).limit(limit)
    return [(row.organisation, row.n) for row in db.execute(query).all()]

# ── Listing (keyset pagination, load_only) ────────────────────────────────────
# Never actually reached in practice today (date_fermeture is non-null on
# every current row) but date_fermeture is nullable in the schema, so an
# open-ended contract needs a defined place in "most urgent first" order —
# sorted last, via a far-future sentinel rather than nullslast() (which a
# keyset row-value comparison can't use; see the recommended-page keyset for
# the same pattern).
_FAR_FUTURE = datetime(9999, 1, 1, tzinfo=timezone.utc)

def _sort_primary_key(sort: str, rank_expr):
    """ASC-comparable expression for each sort mode. date_publication and
    pertinence are naturally "highest/most-recent first" (DESC); negating
    them keeps every mode a plain ascending keyset comparison, mirroring the
    neg_score trick already used for /recommended."""
    if sort == "date_publication":
        # EXTRACT always returns numeric (Decimal in Python) regardless of
        # its input — cast to double precision so the cursor value comes
        # back as a plain float instead of a Decimal, which json.dumps()
        # can't serialize on its own.
        epoch = func.extract('epoch', func.coalesce(func.safe_timestamptz(Contract.date_publication), func.to_timestamp(0)))
        return -cast(epoch, Float)
    if sort == "pertinence":
        return -rank_expr
    return func.coalesce(func.safe_timestamptz(Contract.date_fermeture), _FAR_FUTURE)

def _encode_cursor(sort: str, primary_key_value, contract_id: int) -> str:
    if isinstance(primary_key_value, datetime):
        value = primary_key_value.isoformat()
    elif isinstance(primary_key_value, Decimal):
        value = float(primary_key_value)
    else:
        value = primary_key_value
    payload = json.dumps([sort, value, contract_id])
    return base64.urlsafe_b64encode(payload.encode()).decode()

def _decode_cursor(cursor: str, expected_sort: str) -> Optional[Tuple[object, int]]:
    """Returns None (i.e. "start over") if the cursor is malformed or was
    minted for a different sort — cheaper and safer than erroring: changing
    the sort dropdown mid-scroll just restarts pagination instead of
    producing a nonsensical comparison against the wrong key."""
    try:
        sort, value, contract_id = json.loads(base64.urlsafe_b64decode(cursor.encode()))
    except Exception:
        return None
    if sort != expected_sort:
        return None
    if sort == "date_fermeture":
        value = datetime.fromisoformat(value)
    return value, int(contract_id)

def get_explorer_page(
    filters: Dict[str, List[str]], q: Optional[str], closing_within: Optional[int],
    sort: str, cursor: Optional[str], limit: int, db: Session,
) -> Tuple[List[Contract], Optional[str]]:
    if sort == "pertinence" and not q:
        sort = "date_fermeture"

    rank_expr = _search_rank(q) if q else None
    sort_key = _sort_primary_key(sort, rank_expr)
    sort_key_label = sort_key.label("sort_key")

    query = (
        select(Contract, sort_key_label)
        .options(load_only(*_LISTING_COLUMNS))
        .where(*_base_predicates(filters, q, closing_within))
        .order_by(sort_key, Contract.id)
        .limit(limit)
    )

    decoded = _decode_cursor(cursor, sort) if cursor else None
    if decoded:
        cur_value, cur_id = decoded
        query = query.where(tuple_(sort_key, Contract.id) > (cur_value, cur_id))

    rows = db.execute(query).all()
    next_cursor = None
    if len(rows) == limit:
        last_contract, last_key = rows[-1]
        next_cursor = _encode_cursor(sort, last_key, last_contract.id)
    return [row[0] for row in rows], next_cursor
