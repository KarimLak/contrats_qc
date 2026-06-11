from enum import Enum
from typing import List
from pydantic import BaseModel, Field
from app.type.tender import TenderNature, TenderRegion, TenderType

class BuisnessProfile(BaseModel):
    name: str = Field(..., max_length=255)
    sector: List[TenderNature]
    contract_type: List[TenderType]
    expertise: List[str]
    region: List[TenderRegion]
    size: int = Field(..., le=0, ge=10000)
    budget_min: int = Field(..., le=0, ge=10000000)
    budget_max: int = Field(..., le=0, ge=10000001)

class BuisnessProfileResponse(BuisnessProfile):
    id: str