"""Proves build_contract_query() (app/repositories/explorer.py) is a pure
wrapper around the exact predicates the Explorateur listing already uses —
required by the task's "refactoring pur, avec test de parité" constraint.
build_contract_query is the only new code path here; get_explorer_count/
get_explorer_page/get_explorer_facets are untouched.
"""
from sqlalchemy import select

from app.models.contract import Contract
from app.repositories.explorer import build_contract_query, get_explorer_count, get_explorer_page

_HIGH_LIMIT = 5000  # comfortably above this dataset's size for any of the narrow filters below


def _ids_via_shared(filters, user, db):
    predicates = build_contract_query(filters, user, db)
    return set(db.execute(select(Contract.id).where(*predicates)).scalars().all())


def _ids_via_listing(filters, q, closing_within, db, profile=None):
    rows, _ = get_explorer_page(filters, q, closing_within, "date_fermeture", None, _HIGH_LIMIT, db, profile)
    return {c.id for c in rows}


def test_parity_no_filters_count(db):
    shared_count = len(db.execute(select(Contract.id).where(*build_contract_query({}, None, db))).scalars().all())
    listing_count = get_explorer_count({}, None, None, db)
    assert shared_count == listing_count


def test_parity_dimension_filters(db):
    filters = {"statut": ["Publié"], "region": ["Montréal"]}
    ids_shared = _ids_via_shared(filters, None, db)
    ids_listing = _ids_via_listing({"statut": ["Publié"], "region": ["Montréal"]}, None, None, db)
    assert ids_shared == ids_listing


def test_parity_closing_within_and_search(db):
    filters = {"closing_within": 30, "q": "informatique"}
    ids_shared = _ids_via_shared(filters, None, db)
    ids_listing = _ids_via_listing({}, "informatique", 30, db)
    assert ids_shared == ids_listing


def test_parity_categorie_code_and_label(db):
    # exercises _categorie_predicate's code-vs-label branch through the
    # shared entry point exactly as the Explorateur does.
    filters = {"categorie": ["G17"]}
    ids_shared = _ids_via_shared(filters, None, db)
    ids_listing = _ids_via_listing({"categorie": ["G17"]}, None, None, db)
    assert ids_shared == ids_listing


def test_parity_match_profil(db, test_user, compatible_profile):
    filters = {"match": "profil", "statut": ["Publié"]}
    ids_shared = _ids_via_shared(filters, test_user, db)
    ids_listing = _ids_via_listing({"statut": ["Publié"]}, None, None, db, profile=compatible_profile)
    assert ids_shared == ids_listing
    assert len(ids_shared) > 0  # compatible_profile is built to actually match live rows


def test_match_profil_without_user_raises(db):
    try:
        build_contract_query({"match": "profil"}, None, db)
        assert False, "expected ValueError"
    except ValueError:
        pass
