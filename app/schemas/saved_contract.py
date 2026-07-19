from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class SavedContractStatus(str, Enum):
    a_evaluer = "a_evaluer"
    en_preparation = "en_preparation"
    soumis = "soumis"
    non_retenu = "non_retenu"
    abandonne = "abandonne"


class SavedContractCreate(BaseModel):
    contract_id: int


# PATCH body: every field optional, and the service only touches whatever
# the client actually set (model_dump(exclude_unset=True)) — sending
# {"note": null} clears the note, while omitting "note" entirely leaves it
# untouched. That distinction is why this doesn't just default note to None.
class SavedContractUpdate(BaseModel):
    status: Optional[SavedContractStatus] = None
    note: Optional[str] = Field(default=None, max_length=5000)


# Same lean shape as ExplorerContract/RecommendedContract — only the columns
# the card renders, not the full ~37-column Contract row.
class SavedContractCard(BaseModel):
    id: int
    titre: str
    organisation: str
    statut: str
    nature_contrat: str
    categorie: str
    region: str
    type_avis: str
    date_publication: str
    date_fermeture: Optional[str] = None

    model_config = {"from_attributes": True}


class SavedContractResponse(BaseModel):
    id: int
    status: SavedContractStatus
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    contract: SavedContractCard

    model_config = {"from_attributes": True}


class SavedContractsResponse(BaseModel):
    items: List[SavedContractResponse]
    total: int


class SavedContractsAlertsCount(BaseModel):
    count: int
