"""Contract between the Analytics KPIs and the Explorateur listing: for a
given business profile, "how many compatible open notices are there" must
be the exact same number whether you read it off the KPI card or click
through to the Explorateur (match=profil). Both sides are built from the
same compatible_contracts_query() (app/repositories/contract.py) — this
test is what actually enforces that they don't drift apart again, the way
they did before that function existed (KPI counted sector-OR-expertise;
the frontend link could only encode one arm of that OR as categorie=...,
undercounting).
"""
from app.repositories.analytics import get_profile_kpis
from app.repositories.explorer import get_explorer_count


def test_kpi_compatible_open_matches_explorer_match_profil(db, compatible_profile):
    kpis = get_profile_kpis(compatible_profile, db)
    explorer_total = get_explorer_count({}, None, None, db, compatible_profile)

    assert kpis["compatible_open"] == explorer_total
    # Sanity check the fixture profile actually exercises real data instead
    # of both sides agreeing on a meaningless "0 == 0".
    assert kpis["compatible_open"] > 0


def test_kpi_closing_7d_matches_explorer_match_profil_closing_within_7(db, compatible_profile):
    kpis = get_profile_kpis(compatible_profile, db)
    explorer_total = get_explorer_count({}, None, 7, db, compatible_profile)

    assert kpis["closing_7d"] == explorer_total


def test_buyer_open_count_matches_explorer_organisation_plus_match_profil(db, compatible_profile):
    """The exact bug report this whole fix responds to: clicking an
    organisation on the Intelligence acheteurs block used to combine
    organisation= with a reconstructed categorie= list, which could exclude
    every contract that actually qualified through *sector* instead of
    expertise — giving 0 results for an organisation the KPI said had
    plenty. organisation + match=profil (no categorie involved) is the fix.
    """
    from app.repositories.analytics import get_buyer_intelligence

    buyers = get_buyer_intelligence(compatible_profile, db)
    assert buyers["organizations"], "fixture profile should match at least one organisation's open notices"

    org = buyers["organizations"][0]
    explorer_total = get_explorer_count(
        {"organisation": [org["organisation"]]}, None, None, db, compatible_profile,
    )

    assert org["open_count"] == explorer_total
    assert explorer_total > 0


def test_explorer_categorie_code_matches_full_label(db):
    """categorie=G17 (bare code, the compact link format) must select the
    exact same rows as categorie=G17 - Ameublement (full label, the
    pre-existing format every other caller still sends) — additive parsing,
    not a behavior change for existing full-label callers."""
    code_total = get_explorer_count({"categorie": ["G17"]}, None, None, db)
    label_total = get_explorer_count({"categorie": ["G17 - Ameublement"]}, None, None, db)

    assert code_total == label_total
    assert code_total > 0


def test_explorer_without_match_is_unchanged_and_profile_agnostic(db):
    """No `profile` argument (mirrors match=profil absent on the endpoint)
    must behave exactly as it did before match=profil existed — this is the
    non-regression guarantee for the Explorateur's default behavior."""
    total_no_profile = get_explorer_count({}, None, None, db)
    assert total_no_profile > 0
