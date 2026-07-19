from typing import List, Optional
from pydantic import BaseModel


# ── Block 1: KPIs "Votre marché" ─────────────────────────────────────────────
class ProfileKpis(BaseModel):
    profile_ready: bool
    compatible_open: int
    closing_7d: int
    new_this_week: int
    new_last_week: int
    total_open: int
    pct_of_market: float
    profile_categories: List[str]
    profile_sectors: List[str]


# ── Block 2: Pipeline d'échéances ────────────────────────────────────────────
class DeadlinePreviewItem(BaseModel):
    id: int
    titre: str
    organisation: str
    categorie: str
    region: str
    date_fermeture: Optional[str] = None

class DeadlineBucket(BaseModel):
    label: str
    count: int
    preview: List[DeadlinePreviewItem]

class DeadlinePipeline(BaseModel):
    buckets: List[DeadlineBucket]


# ── Block 3: Radar d'opportunités ────────────────────────────────────────────
class HeatmapCell(BaseModel):
    categorie: str
    region: str
    count: int

class RadarData(BaseModel):
    categories: List[str]
    adjacent_categories: List[str]
    regions: List[str]
    cells: List[HeatmapCell]


# ── Block 4: Intelligence acheteurs (profil + signaux compétitifs) ──────────
class OrgCategoryBreakdown(BaseModel):
    categorie: str
    count: int

class BuyerOrganization(BaseModel):
    organisation: str
    open_count: int
    categories: List[OrgCategoryBreakdown]
    pressenti_count: int
    pressenti_pct: float

class BuyerIntelligence(BaseModel):
    organizations: List[BuyerOrganization]


# ── Block 5: Fenêtre de réaction ─────────────────────────────────────────────
class ReactionCategory(BaseModel):
    categorie: str
    median_days: float
    sample_size: int

class ReactionWindow(BaseModel):
    categories: List[ReactionCategory]
    market_median_days: Optional[float] = None


# ── Block 6: Tendance ─────────────────────────────────────────────────────────
class TrendWeek(BaseModel):
    weeks_ago: int
    profile_count: int
    market_count: int

class Trend(BaseModel):
    weeks: List[TrendWeek]
