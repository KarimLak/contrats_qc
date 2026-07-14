import threading
import time
from collections import defaultdict
from datetime import datetime, timezone
from functools import lru_cache

from sqlalchemy import text

from app.database import SessionLocal

# Data only changes on the daily SEAO sync, so a 20 min TTL keeps every
# dashboard load fast (no aggregation query on the hot path) while staying
# fresh enough within a workday. lru_cache has no time-based eviction, so the
# cache key includes a "bucket" - the current time divided into TTL-sized
# windows - which changes (forcing a recompute) once per window.
CACHE_TTL_SECONDS = 20 * 60

def _bucket() -> int:
    return int(time.time() // CACHE_TTL_SECONDS)

# lru_cache alone lets N concurrent requests all miss at once and all recompute
# in parallel right as a bucket rolls over - a thundering herd against a pool
# with only 10 connections. One lock per cached function serializes recompute
# so only the first caller in a window pays for it; the rest wait and then hit
# the now-populated cache.
_locks: dict[str, threading.Lock] = defaultdict(threading.Lock)

def _cached(key: str, fn):
    with _locks[key]:
        return fn(_bucket())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ── Section 1: Le pouls du marché ────────────────────────────────────────────

_PULSE_SQL = text("""
    WITH base AS (
        SELECT
            safe_timestamptz(date_fermeture)   AS fermeture_ts,
            safe_timestamptz(date_publication) AS publication_ts,
            statut
        FROM contracts
    )
    SELECT
        COUNT(*) FILTER (
            WHERE fermeture_ts IS NOT NULL AND fermeture_ts > now() AND statut <> 'Annulé'
        ) AS open_now,
        COUNT(*) FILTER (
            WHERE fermeture_ts IS NOT NULL AND fermeture_ts > now()
                AND fermeture_ts <= now() + interval '7 days' AND statut <> 'Annulé'
        ) AS closing_7d,
        COUNT(*) FILTER (
            WHERE publication_ts IS NOT NULL
                AND publication_ts > now() - interval '7 days' AND publication_ts <= now()
        ) AS published_this_week,
        COUNT(*) FILTER (
            WHERE publication_ts IS NOT NULL
                AND publication_ts > now() - interval '14 days' AND publication_ts <= now() - interval '7 days'
        ) AS published_last_week,
        percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (fermeture_ts - publication_ts)) / 86400.0
        ) FILTER (
            WHERE fermeture_ts IS NOT NULL AND publication_ts IS NOT NULL
                AND fermeture_ts > publication_ts AND publication_ts > now() - interval '12 months'
        ) AS median_days_to_close
    FROM base
""")

def _compute_pulse(cache_bucket: int) -> dict:
    with SessionLocal() as db:
        row = db.execute(_PULSE_SQL).mappings().one()
    this_week = row["published_this_week"] or 0
    last_week = row["published_last_week"] or 0
    wow_pct = ((this_week - last_week) / last_week * 100.0) if last_week else None
    return {
        "open_now": row["open_now"] or 0,
        "closing_7d": row["closing_7d"] or 0,
        "published_this_week": this_week,
        "published_last_week": last_week,
        "published_wow_pct": round(wow_pct, 1) if wow_pct is not None else None,
        "median_days_to_close": round(row["median_days_to_close"], 1) if row["median_days_to_close"] is not None else None,
        "generated_at": _now_iso(),
    }

_compute_pulse_cached = lru_cache(maxsize=2)(_compute_pulse)

def get_pulse_stats() -> dict:
    return _cached("pulse", _compute_pulse_cached)


# ── Section 2: Radar d'opportunités ──────────────────────────────────────────
# "Open" = date_fermeture parses, the deadline instant is still ahead of now(),
# and the notice hasn't been cancelled. Reused identically across the heatmap
# and the closing-soon table so both agree on what "open" means. Comparing
# absolute instants (no AT TIME ZONE) is both correct - a deadline is a fixed
# point in time regardless of timezone - and lets Postgres use the functional
# index on safe_timestamptz(date_fermeture) directly.

_TOP_CATEGORIES_SQL = text("""
    WITH open_contracts AS (
        SELECT categorie, region
        FROM (
            SELECT categorie, region, statut,
                   safe_timestamptz(date_fermeture) AS fermeture_ts
            FROM contracts
            WHERE date_fermeture IS NOT NULL AND date_fermeture <> ''
        ) s
        WHERE fermeture_ts IS NOT NULL AND fermeture_ts > now()
            AND statut <> 'Annulé'
    ),
    top_cats AS (
        SELECT categorie FROM open_contracts GROUP BY categorie ORDER BY COUNT(*) DESC LIMIT 10
    )
    SELECT oc.categorie, oc.region, COUNT(*) AS cnt
    FROM open_contracts oc
    WHERE oc.categorie IN (SELECT categorie FROM top_cats)
    GROUP BY oc.categorie, oc.region
    ORDER BY oc.categorie, oc.region
""")

_CLOSING_SOON_SQL = text("""
    SELECT id, titre, organisation, categorie, region, date_fermeture,
           CEIL(EXTRACT(EPOCH FROM (fermeture_ts - now())) / 86400.0)::int AS days_remaining
    FROM (
        SELECT id, titre, organisation, categorie, region, date_fermeture, statut,
               safe_timestamptz(date_fermeture) AS fermeture_ts
        FROM contracts
        WHERE date_fermeture IS NOT NULL AND date_fermeture <> ''
    ) s
    WHERE fermeture_ts IS NOT NULL AND fermeture_ts > now()
        AND statut <> 'Annulé'
    ORDER BY fermeture_ts ASC
    LIMIT 10
""")

def _compute_radar(cache_bucket: int) -> dict:
    with SessionLocal() as db:
        cell_rows = db.execute(_TOP_CATEGORIES_SQL).mappings().all()
        closing_rows = db.execute(_CLOSING_SOON_SQL).mappings().all()

    categories = list(dict.fromkeys(r["categorie"] for r in cell_rows))
    regions = sorted(set(r["region"] for r in cell_rows if r["region"]))
    cells = [{"categorie": r["categorie"], "region": r["region"], "count": r["cnt"]} for r in cell_rows if r["region"]]
    closing_soon = [
        {
            "id": r["id"], "titre": r["titre"], "organisation": r["organisation"],
            "categorie": r["categorie"], "region": r["region"],
            "date_fermeture": r["date_fermeture"], "days_remaining": r["days_remaining"],
        }
        for r in closing_rows
    ]
    return {
        "categories": categories, "regions": regions, "cells": cells,
        "closing_soon": closing_soon, "generated_at": _now_iso(),
    }

_compute_radar_cached = lru_cache(maxsize=2)(_compute_radar)

def get_radar_data() -> dict:
    return _cached("radar", _compute_radar_cached)


# ── Section 3: Intelligence acheteurs ────────────────────────────────────────

_TOP_ORGS_SQL = text("""
    WITH recent AS (
        SELECT organisation, categorie
        FROM (
            SELECT organisation, categorie,
                   safe_timestamptz(date_publication) AS publication_ts
            FROM contracts
            WHERE date_publication IS NOT NULL AND date_publication <> ''
        ) s
        WHERE publication_ts IS NOT NULL
            AND publication_ts > now() - interval '12 months'
    ),
    top_orgs AS (
        SELECT organisation, COUNT(*) AS cnt FROM recent GROUP BY organisation ORDER BY cnt DESC LIMIT 10
    ),
    org_cat AS (
        SELECT r.organisation, r.categorie, COUNT(*) AS cnt,
               ROW_NUMBER() OVER (PARTITION BY r.organisation ORDER BY COUNT(*) DESC) AS rn
        FROM recent r
        WHERE r.organisation IN (SELECT organisation FROM top_orgs)
        GROUP BY r.organisation, r.categorie
    )
    SELECT t.organisation, t.cnt AS total, oc.categorie, oc.cnt AS cat_count
    FROM top_orgs t
    LEFT JOIN org_cat oc ON oc.organisation = t.organisation AND oc.rn <= 3
    ORDER BY t.cnt DESC, oc.cnt DESC NULLS LAST
""")

_DELAY_BY_CATEGORY_SQL = text("""
    WITH scored AS (
        SELECT categorie,
               safe_timestamptz(date_fermeture)   AS fermeture_ts,
               safe_timestamptz(date_publication) AS publication_ts
        FROM contracts
        WHERE date_fermeture IS NOT NULL AND date_fermeture <> ''
            AND date_publication IS NOT NULL AND date_publication <> ''
    )
    SELECT categorie,
           AVG(EXTRACT(EPOCH FROM (fermeture_ts - publication_ts)) / 86400.0) AS avg_days,
           COUNT(*) AS n
    FROM scored
    WHERE fermeture_ts IS NOT NULL AND publication_ts IS NOT NULL AND fermeture_ts > publication_ts
        AND publication_ts > now() - interval '12 months'
    GROUP BY categorie
    HAVING COUNT(*) >= 5
    ORDER BY avg_days ASC
""")

_MONTHLY_TREND_SQL = text("""
    WITH months AS (
        SELECT generate_series(
            date_trunc('month', (now() AT TIME ZONE 'America/Montreal') - interval '11 months'),
            date_trunc('month', (now() AT TIME ZONE 'America/Montreal')),
            interval '1 month'
        ) AS month_start
    ),
    natures AS (SELECT DISTINCT nature_contrat FROM contracts WHERE nature_contrat IS NOT NULL AND nature_contrat <> ''),
    grid AS (SELECT month_start, nature_contrat FROM months CROSS JOIN natures),
    pub AS (
        SELECT date_trunc('month', publication_mtl) AS month_start, nature_contrat
        FROM (
            SELECT nature_contrat,
                   safe_timestamptz(date_publication) AT TIME ZONE 'America/Montreal' AS publication_mtl
            FROM contracts
            WHERE date_publication IS NOT NULL AND date_publication <> ''
        ) s
        WHERE publication_mtl IS NOT NULL
    ),
    counted AS (
        SELECT month_start, nature_contrat, COUNT(*) AS cnt FROM pub GROUP BY month_start, nature_contrat
    )
    SELECT g.month_start, g.nature_contrat, COALESCE(c.cnt, 0) AS cnt
    FROM grid g
    LEFT JOIN counted c ON c.month_start = g.month_start AND c.nature_contrat = g.nature_contrat
    ORDER BY g.month_start, g.nature_contrat
""")

def _compute_buyers(cache_bucket: int) -> dict:
    with SessionLocal() as db:
        org_rows = db.execute(_TOP_ORGS_SQL).mappings().all()
        delay_rows = db.execute(_DELAY_BY_CATEGORY_SQL).mappings().all()
        trend_rows = db.execute(_MONTHLY_TREND_SQL).mappings().all()

    orgs: dict[str, dict] = {}
    for r in org_rows:
        org = orgs.setdefault(r["organisation"], {"organisation": r["organisation"], "count": r["total"], "top_categories": []})
        if r["categorie"] is not None:
            org["top_categories"].append({"categorie": r["categorie"], "count": r["cat_count"]})
    top_organizations = list(orgs.values())

    delay_by_category = [
        {"categorie": r["categorie"], "avg_days": round(r["avg_days"], 1), "sample_size": r["n"]}
        for r in delay_rows
    ]

    natures = sorted(set(r["nature_contrat"] for r in trend_rows))
    months: dict[str, dict] = {}
    for r in trend_rows:
        month_key = r["month_start"].strftime("%Y-%m")
        bucket = months.setdefault(month_key, {n: 0 for n in natures})
        bucket[r["nature_contrat"]] = r["cnt"]
    monthly_trend = [
        {"month": m, "counts_by_nature": counts, "total": sum(counts.values())}
        for m, counts in sorted(months.items())
    ]

    return {
        "top_organizations": top_organizations,
        "delay_by_category": delay_by_category,
        "monthly_trend": monthly_trend,
        "natures": natures,
        "generated_at": _now_iso(),
    }

_compute_buyers_cached = lru_cache(maxsize=2)(_compute_buyers)

def get_buyer_intelligence() -> dict:
    return _cached("buyers", _compute_buyers_cached)


# ── Section 4: Signaux compétitifs ───────────────────────────────────────────
# A notice naming a "fournisseur pressenti" signals the buyer already has a
# preferred supplier lined up (quasi sole-source) rather than running an open
# competition. A high share of an organisation's notices doing this is a
# useful "read the room before you bid" signal.
LIMITED_COMPETITION_THRESHOLD = 0.3

_PRESSENTI_SQL = text("""
    SELECT organisation,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE fournisseur_pressenti IS NOT NULL AND fournisseur_pressenti <> '') AS pressenti_count
    FROM (
        SELECT organisation, fournisseur_pressenti,
               safe_timestamptz(date_publication) AS publication_ts
        FROM contracts
        WHERE date_publication IS NOT NULL AND date_publication <> ''
    ) s
    WHERE publication_ts IS NOT NULL
        AND publication_ts > now() - interval '12 months'
    GROUP BY organisation
    HAVING COUNT(*) >= 5
    ORDER BY (COUNT(*) FILTER (WHERE fournisseur_pressenti IS NOT NULL AND fournisseur_pressenti <> ''))::float / COUNT(*) DESC
    LIMIT 15
""")

_TYPE_AVIS_SQL = text("""
    SELECT type_avis, COUNT(*) AS cnt
    FROM (
        SELECT type_avis,
               safe_timestamptz(date_publication) AS publication_ts
        FROM contracts
        WHERE date_publication IS NOT NULL AND date_publication <> ''
    ) s
    WHERE publication_ts IS NOT NULL
        AND publication_ts > now() - interval '12 months'
    GROUP BY type_avis
    ORDER BY cnt DESC
""")

def _compute_signals(cache_bucket: int) -> dict:
    with SessionLocal() as db:
        org_rows = db.execute(_PRESSENTI_SQL).mappings().all()
        type_rows = db.execute(_TYPE_AVIS_SQL).mappings().all()

    organizations = []
    for r in org_rows:
        pct = (r["pressenti_count"] / r["total"]) if r["total"] else 0.0
        organizations.append({
            "organisation": r["organisation"], "total": r["total"],
            "pressenti_count": r["pressenti_count"], "pressenti_pct": round(pct * 100, 1),
            "limited_competition": pct >= LIMITED_COMPETITION_THRESHOLD,
        })

    type_avis_breakdown = [{"type_avis": r["type_avis"], "count": r["cnt"]} for r in type_rows]

    return {
        "organizations": organizations,
        "type_avis_breakdown": type_avis_breakdown,
        "generated_at": _now_iso(),
    }

_compute_signals_cached = lru_cache(maxsize=2)(_compute_signals)

def get_competitive_signals() -> dict:
    return _cached("signals", _compute_signals_cached)
