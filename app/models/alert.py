from datetime import datetime, time
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, String, Time, UniqueConstraint, func,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

ALERT_FREQUENCIES = ("per_run", "daily", "weekly")

# Native Postgres enum (not a plain VARCHAR + app-level check like most other
# "status" columns in this repo) — explicitly asked for by this task's spec,
# unlike e.g. saved_contracts.status.
AlertFrequency = SAEnum(*ALERT_FREQUENCIES, name="alert_frequency")


class AlertRecipient(Base):
    __tablename__ = "alert_recipients"
    __table_args__ = (
        UniqueConstraint("user_id", "email", name="uq_alert_recipients_user_email"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Additional (non-default) recipients start unverified — no email
    # verification flow exists yet (out of scope for this task; see the
    # dev-only POST /alert-recipients/{id}/verify endpoint as a stopgap).
    # TODO: replace the dev-only verify endpoint with a real
    # click-to-verify email flow before sending real notifications.
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # Exactly one is_default=true row per user — the account email, created
    # automatically (see ensure_default_recipient in app/services/alert.py)
    # and never deletable.
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Same shape as an Explorateur query-string filter set (q, statut,
    # region, nature_contrat, categorie, organisation, closing_within,
    # match) — see build_contract_query() in app/repositories/contract.py,
    # the single place that turns this JSONB back into SQL predicates for
    # both the Explorateur listing and the matching engine.
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False)
    frequency: Mapped[str] = mapped_column(AlertFrequency, nullable=False, server_default="daily")
    # Required (enforced in app/schemas/alert.py) for daily/weekly — "run
    # whenever the matching engine happens to run" doesn't apply to those,
    # unlike per_run, so the user has to pick a time of day. NULL for
    # per_run, where there's no schedule to pick a time on.
    send_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    # The one auto-created "Mon profil d'entreprise" alert per pro/enterprise
    # user (see ensure_default_alert) — not deletable, but everything else
    # (filters, frequency, send_time, is_active) is fully editable.
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )


class AlertRecipientLink(Base):
    __tablename__ = "alert_recipient_links"

    alert_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("alerts.id", ondelete="CASCADE"), primary_key=True,
    )
    recipient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("alert_recipients.id", ondelete="CASCADE"), primary_key=True,
    )


class AlertNotification(Base):
    __tablename__ = "alert_notifications"
    __table_args__ = (
        UniqueConstraint("alert_id", "contract_id", name="uq_alert_notifications_alert_contract"),
        Index("ix_alert_notifications_sent_alert", "sent_at", "alert_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alert_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    matched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # NULL until the (not-yet-built) sender picks this row up — the
    # matching engine built in this task only ever inserts with sent_at
    # NULL; nothing here sets it.
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
