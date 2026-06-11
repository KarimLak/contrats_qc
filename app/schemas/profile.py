from enum import Enum
from typing import List
from pydantic import BaseModel, ConfigDict, Field
from app.type.tender import TenderNature, TenderRegion, TenderType

class BuisnessProfile(BaseModel):
    name: str = Field(..., max_length=255)
    sector: List[TenderNature]
    contract_type: List[TenderType]
    expertise: List[str]
    region: List[TenderRegion]
    size: int = Field(..., le=0, ge=10000)
    budget_min: int = Field(..., ge=0, le=10000000)
    budget_max: int = Field(..., ge=0, le=10000001)

class BuisnessProfileCreate(BuisnessProfile):
    pass

class BuisnessProfileResponse(BuisnessProfile):
    id: str = Field(..., ge=0)
    model_config = ConfigDict(from_attributes=True)