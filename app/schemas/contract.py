from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class ContractSortField(str, Enum):
    type_avis = "type_avis"
    statut = "statut"
    nature_contrat = "nature_contrat"
    categorie = "categorie"
    region = "region"
    date_publication = "date_publication"
    date_fermeture = "date_fermeture"

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"

class ContractFilter(BaseModel):
    type_avis: Optional[List[str]] = None
    statut: Optional[List[str]] = None
    nature_contrat: Optional[List[str]] = None
    categorie: Optional[List[str]] = None
    region: Optional[List[str]] = None
    date_publication: Optional[str] = Field(None, max_length=100)
    date_fermeture: Optional[str] = Field(default=None, max_length=100)

class Document(BaseModel):
    titre: Optional[str] = Field(default=None, max_length=500)
    type: Optional[str] = Field(default=None, max_length=255)
    contenu: Optional[str] = None
    langue: Optional[str] = None
    dimension: Optional[str] = None
    nombre_page: Optional[str] = Field(default=None, max_length=50)

    @field_validator('contenu', 'langue', 'dimension', mode='before')
    @classmethod
    def flatten_lookup(cls, v: Any) -> Optional[str]:
        if isinstance(v, dict):
            return v.get('descriptionen') or v.get('descriptionfr') or None
        return v

class ContractBase(BaseModel):
    # ── Identity ──────────────────────────────────────────────────────────────
    numero:           Optional[str] = Field(default=None, max_length=255)
    numero_reference: str = Field(..., max_length=255)
    type_avis:        str = Field(..., max_length=100)
    statut:           str = Field(..., max_length=100)
    url:              str = Field(..., max_length=500)

    # ── Core description ──────────────────────────────────────────────────────
    titre:        str = Field(..., max_length=1000)
    organisation: str = Field(..., max_length=500)
    nature_contrat: str = Field(..., max_length=255)
    categorie:    str = Field(..., max_length=500)
    description:  Optional[str] = None

    # ── Classification ────────────────────────────────────────────────────────
    classifications: list[str] = Field(default_factory=list)
    documents:       list[Document] = Field(default_factory=list)

    # ── Geography & trade agreements ──────────────────────────────────────────
    region:      str = Field(..., max_length=500)
    accord:      Optional[str] = Field(default=None, max_length=1000)
    territoires: Optional[str] = Field(default=None, max_length=500)

    # ── Dates ─────────────────────────────────────────────────────────────────
    date_publication:           str = Field(..., max_length=100)
    date_fermeture:             Optional[str] = Field(default=None, max_length=255)
    date_limite_plaintes:       Optional[str] = Field(default=None, max_length=100)
    date_limite_interet:        Optional[str] = Field(default=None, max_length=100)
    date_ouverture_soumissions: Optional[str] = Field(default=None, max_length=100)
    date_conclusion:            Optional[str] = Field(default=None, max_length=100)

    # ── Contract terms ────────────────────────────────────────────────────────
    duree_contrat:              Optional[str] = Field(default=None, max_length=50)
    duree_contrat_avec_options: Optional[str] = Field(default=None, max_length=50)
    options_renouvellement:     Optional[str] = Field(default=None, max_length=1000)
    contrat_execution_demande:  Optional[str] = Field(default=None, max_length=50)
    contrat_a_commandes:        Optional[str] = Field(default=None, max_length=50)

    # ── Submission logistics ──────────────────────────────────────────────────
    soumission_electronique: Optional[str] = Field(default=None, max_length=255)
    endroit_reception:       Optional[str] = Field(default=None, max_length=500)
    endroit_ouverture:       Optional[str] = Field(default=None, max_length=500)
    adjudication_par_lot:    Optional[str] = Field(default=None, max_length=50)
    remarque:                Optional[str] = Field(default=None, max_length=20000)

    # ── Bid guarantee ─────────────────────────────────────────────────────────
    garantie_nature: Optional[str] = Field(default=None, max_length=500)
    garantie_valeur: Optional[str] = None

    # ── Intention-specific ────────────────────────────────────────────────────
    fournisseur_pressenti: Optional[str] = Field(default=None, max_length=500)

    # ── Contact ───────────────────────────────────────────────────────────────
    contact_nom:       Optional[str] = Field(default=None, max_length=255)
    contact_email:     Optional[str] = Field(default=None, max_length=255)
    contact_telephone: Optional[str] = Field(default=None, max_length=100)

    @field_validator('classifications', mode='before')
    @classmethod
    def parse_classifications(cls, v: Any) -> list:
        if isinstance(v, str):
            return [s.strip() for s in v.split(';') if s.strip()] if v else []
        return v if v is not None else []

class ContractResponse(ContractBase):
    id: int = Field(..., ge=0)

    model_config = {"from_attributes": True}


class ContractFilterResponse(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)
    total: int = Field(0, ge=0)
    contracts: Optional[List[ContractResponse]]

    model_config = {"from_attributes": True}


class RecommendedContract(ContractResponse):
    match_score: int = Field(..., ge=0, le=100)


class RecommendedContractsResponse(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)
    total: int = Field(0, ge=0)
    contracts: List[RecommendedContract]

    model_config = {"from_attributes": True}
