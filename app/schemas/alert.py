import re
from datetime import datetime, time
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class AlertFrequency(str, Enum):
    per_run = "per_run"
    daily = "daily"
    weekly = "weekly"


# Strict mirror of what build_contract_query() (app/repositories/explorer.py)
# actually consumes — the same shape as an Explorateur query-string filter
# set. extra="forbid" so a typo or an unsupported key is rejected at
# alert-creation time instead of silently matching nothing once the
# matching engine runs it.
class AlertFilters(BaseModel):
    model_config = {"extra": "forbid"}

    q: Optional[str] = Field(default=None, max_length=200)
    statut: Optional[List[str]] = None
    region: Optional[List[str]] = None
    nature_contrat: Optional[List[str]] = None
    categorie: Optional[List[str]] = None
    organisation: Optional[List[str]] = None
    closing_within: Optional[int] = Field(default=None, ge=1, le=365)
    match: Optional[str] = None

    @field_validator("match")
    @classmethod
    def validate_match(cls, v):
        if v is not None and v != "profil":
            raise ValueError("match must be 'profil' when set")
        return v


class AlertCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    filters: AlertFilters
    frequency: AlertFrequency = AlertFrequency.daily
    # Required for daily/weekly ("send at this time of day"); meaningless
    # for per_run (no schedule — runs whenever the matching engine runs).
    send_time: Optional[time] = None
    # None/empty => the alert implicitly targets the owner's default
    # recipient (see get_alert_recipients in app/repositories/alert.py).
    recipient_ids: Optional[List[int]] = None

    @model_validator(mode="after")
    def require_send_time_for_scheduled_frequencies(self):
        if self.frequency != AlertFrequency.per_run and self.send_time is None:
            raise ValueError("L'heure d'envoi est requise pour les fréquences quotidienne et hebdomadaire.")
        return self


class AlertUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    filters: Optional[AlertFilters] = None  # rejected server-side for is_system alerts
    frequency: Optional[AlertFrequency] = None
    # Partial update, so the frequency/send_time combination can only be
    # fully validated once merged with the existing alert — see
    # update_my_alert in app/services/alert.py.
    send_time: Optional[time] = None
    is_active: Optional[bool] = None
    recipient_ids: Optional[List[int]] = None


class AlertRecipientBrief(BaseModel):
    id: int
    email: str
    label: Optional[str] = None
    is_default: bool
    is_verified: bool

    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    id: int
    name: str
    filters: dict
    frequency: AlertFrequency
    send_time: Optional[time] = None
    is_active: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime
    recipients: List[AlertRecipientBrief]

    model_config = {"from_attributes": True}


class AlertsListResponse(BaseModel):
    items: List[AlertResponse]
    total: int


class AlertPreviewRequest(BaseModel):
    filters: AlertFilters


class AlertPreviewResponse(BaseModel):
    count: int
    is_broad: bool


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AlertRecipientCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    label: Optional[str] = Field(default=None, max_length=50)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Adresse courriel invalide")
        return v


class AlertRecipientUpdate(BaseModel):
    email: Optional[str] = Field(default=None, min_length=3, max_length=255)
    label: Optional[str] = Field(default=None, max_length=50)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _EMAIL_RE.match(v):
            raise ValueError("Adresse courriel invalide")
        return v


class AlertRecipientResponse(BaseModel):
    id: int
    email: str
    label: Optional[str] = None
    is_default: bool
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}
