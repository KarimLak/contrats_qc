# database.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(
    DATABASE_URL,
    pool_size=5,          
    max_overflow=5,      
    pool_timeout=30,      
    pool_recycle=1800,   
    pool_pre_ping=True,   
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()  
        raise
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)

# ── Analytics support ────────────────────────────────────────────────────────
# date_publication / date_fermeture on `contracts` are plain VARCHAR (raw SEAO
# text, either "YYYY-MM-DD" or full ISO-8601 UTC like "2026-06-23T15:00:00Z"),
# not native timestamp columns, and there's no migration tool in this repo to
# alter the existing production table. safe_timestamptz() casts that text to a
# real timestamptz (returning NULL instead of raising on any row that doesn't
# parse) so analytics queries can do correct date-math instead of comparing
# raw strings.
#
# A bare "v::timestamptz" cast is only zone-safe when the text already carries
# an offset (the "...Z" ISO form) - for a bare date/time with no zone marker,
# Postgres fills the missing offset from the session's `TimeZone` GUC, so the
# same row would cast to a different instant depending on server config. That
# would both be wrong (a Montreal midnight deadline could shift a few hours to
# the previous calendar day) and make the function not actually IMMUTABLE,
# which is unsafe to back a functional index with. So this branches: text with
# an explicit zone marker casts straight to timestamptz (already absolute);
# text without one is SEAO Quebec data, so it's interpreted as that wall-clock
# instant in America/Montreal via "timestamp AT TIME ZONE 'zone'" - a fixed,
# session-independent conversion. Both branches are then genuinely immutable.
def ensure_analytics_support():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION safe_timestamptz(v text)
            RETURNS timestamptz
            LANGUAGE plpgsql
            IMMUTABLE
            AS $$
            BEGIN
                IF v IS NULL OR v = '' THEN
                    RETURN NULL;
                END IF;
                IF v ~ '(Z|[+-]\\d{2}:?\\d{2})$' THEN
                    RETURN v::timestamptz;
                END IF;
                RETURN (v::timestamp) AT TIME ZONE 'America/Montreal';
            EXCEPTION WHEN OTHERS THEN
                RETURN NULL;
            END;
            $$;
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_contracts_fermeture_ts "
            "ON contracts (safe_timestamptz(date_fermeture))"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_contracts_publication_ts "
            "ON contracts (safe_timestamptz(date_publication))"
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_contracts_region ON contracts (region)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_contracts_statut ON contracts (statut)"))

# ── Explorer full-text search support ────────────────────────────────────────
# search_vector is a STORED generated column (Postgres maintains it on every
# INSERT/UPDATE — no app-side trigger to keep in sync) combining titre
# (weight A), organisation (B) and description (C), so a title match ranks
# above an incidental description match via ts_rank. Backed by a GIN index,
# the standard index type for tsvector @@ tsquery lookups.
#
# Plain 'french' doesn't fold accents (to_tsvector('french','déneigement')
# does NOT match websearch_to_tsquery('french','deneigement')) — confirmed
# against live data: an unaccented query matched 1/70 of the rows the
# accented spelling matched. Typing without accents is common enough
# (keyboard layout, habit) that this would silently gut recall, so search
# runs through a custom 'french_unaccent' config (french + the unaccent
# extension's dictionary ahead of the French stemmer) instead of bare
# 'french'. CREATE TEXT SEARCH CONFIGURATION has no IF NOT EXISTS, hence the
# existence check.
def ensure_search_support():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))

        config_exists = conn.execute(text(
            "SELECT 1 FROM pg_ts_config WHERE cfgname = 'french_unaccent'"
        )).first()
        if not config_exists:
            conn.execute(text("CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french)"))
            conn.execute(text(
                "ALTER TEXT SEARCH CONFIGURATION french_unaccent "
                "ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem"
            ))

        conn.execute(text("""
            ALTER TABLE contracts ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('french_unaccent', coalesce(titre, '')), 'A') ||
                setweight(to_tsvector('french_unaccent', coalesce(organisation, '')), 'B') ||
                setweight(to_tsvector('french_unaccent', coalesce(description, '')), 'C')
            ) STORED
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_contracts_search_vector "
            "ON contracts USING GIN (search_vector)"
        ))