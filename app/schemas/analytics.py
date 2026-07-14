from typing import List, Optional
from pydantic import BaseModel


# ── Section 1: Le pouls du marché ────────────────────────────────────────────
class PulseStats(BaseModel):
    open_now: int
    closing_7d: int
    published_this_week: int
    published_last_week: int
    published_wow_pct: Optional[float] = None
    median_days_to_close: Optional[float] = None
    generated_at: str


# ── Section 2: Radar d'opportunités ──────────────────────────────────────────
class HeatmapCell(BaseModel):
    categorie: str
    region: str
    count: int

class ClosingSoonItem(BaseModel):
    id: int
    titre: str
    organisation: str
    categorie: str
    region: str
    date_fermeture: str
    days_remaining: int

class RadarData(BaseModel):
    categories: List[str]
    regions: List[str]
    cells: List[HeatmapCell]
    closing_soon: List[ClosingSoonItem]
    generated_at: str


# ── Section 3: Intelligence acheteurs ────────────────────────────────────────
class OrgCategoryBreakdown(BaseModel):
    categorie: str
    count: int

class TopOrganization(BaseModel):
    organisation: str
    count: int
    top_categories: List[OrgCategoryBreakdown]

class CategoryDelay(BaseModel):
    categorie: str
    avg_days: float
    sample_size: int

class MonthlyTrendPoint(BaseModel):
    month: str
    counts_by_nature: dict[str, int]
    total: int

class BuyerIntelligence(BaseModel):
    top_organizations: List[TopOrganization]
    delay_by_category: List[CategoryDelay]
    monthly_trend: List[MonthlyTrendPoint]
    natures: List[str]
    generated_at: str


# ── Section 4: Signaux compétitifs ───────────────────────────────────────────
class OrgCompetitionSignal(BaseModel):
    organisation: str
    total: int
    pressenti_count: int
    pressenti_pct: float
    limited_competition: bool

class TypeAvisBreakdown(BaseModel):
    type_avis: str
    count: int

class CompetitiveSignals(BaseModel):
    organizations: List[OrgCompetitionSignal]
    type_avis_breakdown: List[TypeAvisBreakdown]
    generated_at: str
