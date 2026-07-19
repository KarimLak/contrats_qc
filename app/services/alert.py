import logging
from datetime import datetime, time, timedelta, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.contract import Contract
from app.models.user import User
from app.repositories.alert import (
    MAX_ADDITIONAL_RECIPIENTS, MAX_ALERTS_PER_USER,
    count_additional_recipients, count_alerts, create_alert, create_recipient,
    delete_alert, delete_recipient, ensure_default_recipient, get_alert_by_id,
    get_alert_recipients, get_or_create_system_alert, get_recipient_by_id,
    list_alerts, list_recipients, match_new_contracts as _match_new_contracts,
    update_alert, update_recipient, verify_recipient,
)
from app.repositories.explorer import build_contract_query
from app.services.token import PRO_ROLES
from app.schemas.alert import (
    AlertCreate, AlertPreviewRequest, AlertPreviewResponse, AlertRecipientBrief,
    AlertRecipientCreate, AlertRecipientResponse, AlertRecipientUpdate,
    AlertResponse, AlertsListResponse, AlertUpdate,
)

logger = logging.getLogger("alerts")

PREVIEW_WINDOW_DAYS = 30
PREVIEW_BROAD_THRESHOLD = 40

# The alert ensure_default_alert() creates for every pro/enterprise user.
# No closing_within — per explicit user feedback it's not a meaningful
# filter for a recurring alert (it's re-evaluated at match time, not "at
# creation time" the way it works for a one-off Explorateur search).
DEFAULT_ALERT_FILTERS = {"match": "profil"}
DEFAULT_ALERT_FREQUENCY = "daily"
DEFAULT_ALERT_SEND_TIME = time(8, 0)


def _to_response(alert: Alert, db: Session) -> AlertResponse:
    recipients = get_alert_recipients(alert, db)
    return AlertResponse(
        id=alert.id, name=alert.name, filters=alert.filters, frequency=alert.frequency,
        send_time=alert.send_time, is_active=alert.is_active, is_system=alert.is_system,
        created_at=alert.created_at, updated_at=alert.updated_at,
        recipients=[AlertRecipientBrief.model_validate(r) for r in recipients],
    )


def _get_owned_alert(user: User, alert_id: int, db: Session) -> Alert:
    alert = get_alert_by_id(user.id, alert_id, db)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


def list_my_alerts(user: User, db: Session) -> AlertsListResponse:
    # Guarantees the system alert (and default recipient) exist on every
    # visit to the page, not just at registration/profile-save time — a
    # user whose role became pro/enterprise some other way (no self-serve
    # upgrade endpoint exists in this app) would otherwise never see it
    # appear without an unrelated profile edit. Idempotent, so this is a
    # no-op for the common case where it already exists.
    ensure_default_recipient_for(user, db)
    ensure_default_alert_for(user, db)
    alerts = list_alerts(user.id, db)
    return AlertsListResponse(items=[_to_response(a, db) for a in alerts], total=len(alerts))


def create_my_alert(user: User, payload: AlertCreate, db: Session) -> AlertResponse:
    if count_alerts(user.id, db) >= MAX_ALERTS_PER_USER:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_ALERTS_PER_USER} alertes par compte")
    filters = payload.filters.model_dump(exclude_none=True)
    alert = create_alert(
        user.id, payload.name, filters, payload.frequency.value, payload.send_time, payload.recipient_ids, db,
    )
    return _to_response(alert, db)


def update_my_alert(user: User, alert_id: int, payload: AlertUpdate, db: Session) -> AlertResponse:
    alert = _get_owned_alert(user, alert_id, db)
    updates = payload.model_dump(exclude_unset=True, exclude={"recipient_ids", "filters"})
    if "frequency" in updates and updates["frequency"] is not None:
        freq = updates["frequency"]
        updates["frequency"] = freq.value if hasattr(freq, "value") else freq
    if payload.filters is not None:
        # System alert filters seed from the business profile but are fully
        # editable from here on — only its name and is_system/deletability
        # stay fixed (see delete_my_alert below).
        updates["filters"] = payload.filters.model_dump(exclude_none=True)

    # Validate the *resulting* (merged) frequency/send_time combination —
    # AlertUpdate is partial, so e.g. switching frequency to "weekly" without
    # touching send_time must still be checked against whatever send_time
    # the alert already has (or is also being set to in this same call).
    resulting_frequency = updates.get("frequency", alert.frequency)
    resulting_send_time = updates["send_time"] if "send_time" in updates else alert.send_time
    if resulting_frequency != "per_run" and resulting_send_time is None:
        raise HTTPException(status_code=400, detail="L'heure d'envoi est requise pour les fréquences quotidienne et hebdomadaire.")

    set_recipients = "recipient_ids" in payload.model_fields_set
    alert = update_alert(alert, updates, payload.recipient_ids, set_recipients, db)
    return _to_response(alert, db)


def delete_my_alert(user: User, alert_id: int, db: Session) -> None:
    alert = _get_owned_alert(user, alert_id, db)
    if alert.is_system:
        raise HTTPException(status_code=400, detail="L'alerte système ne peut pas être supprimée")
    delete_alert(user.id, alert_id, db)


def preview_alert(user: User, payload: AlertPreviewRequest, db: Session) -> AlertPreviewResponse:
    filters = payload.filters.model_dump(exclude_none=True)
    since = datetime.now(timezone.utc) - timedelta(days=PREVIEW_WINDOW_DAYS)
    predicates = build_contract_query(filters, user, db)
    count = db.execute(
        select(func.count()).select_from(Contract).where(Contract.first_seen_at >= since, *predicates)
    ).scalar() or 0
    return AlertPreviewResponse(count=count, is_broad=count > PREVIEW_BROAD_THRESHOLD)


def run_matching_dev(since: Optional[datetime], db: Session) -> dict:
    since = since or (datetime.now(timezone.utc) - timedelta(hours=24))
    results = _match_new_contracts(since, db)
    return {
        "since": since.isoformat(),
        "alerts_processed": len(results),
        "notifications_created": sum(results.values()),
        "per_alert": results,
    }


# ── Recipients ────────────────────────────────────────────────────────────
# GET/PATCH are intentionally reachable by any authenticated user, not just
# pro/enterprise: every account (even free) has exactly one is_default=true
# recipient (see ensure_default_recipient) and changing its email is basic
# account management (surfaced on the Profile page), not really "the
# Alertes feature." Only *creating additional* recipients — the actual
# enterprise perk — is gated (see get_current_enterprise_user in the router).

def list_my_recipients(user: User, db: Session) -> List[AlertRecipientResponse]:
    return [AlertRecipientResponse.model_validate(r) for r in list_recipients(user.id, db)]


def create_my_recipient(user: User, payload: AlertRecipientCreate, db: Session) -> AlertRecipientResponse:
    if count_additional_recipients(user.id, db) >= MAX_ADDITIONAL_RECIPIENTS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_ADDITIONAL_RECIPIENTS} destinataires additionnels")
    row = create_recipient(user.id, payload.email, payload.label, db)
    return AlertRecipientResponse.model_validate(row)


def update_my_recipient(user: User, recipient_id: int, payload: AlertRecipientUpdate, db: Session) -> AlertRecipientResponse:
    recipient = get_recipient_by_id(user.id, recipient_id, db)
    if recipient is None:
        raise HTTPException(status_code=404, detail="Recipient not found")
    updates = payload.model_dump(exclude_unset=True)
    row = update_recipient(recipient, updates, db)
    return AlertRecipientResponse.model_validate(row)


def delete_my_recipient(user: User, recipient_id: int, db: Session) -> None:
    recipient = get_recipient_by_id(user.id, recipient_id, db)
    if recipient is None:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if recipient.is_default:
        raise HTTPException(status_code=400, detail="Le destinataire par défaut ne peut pas être supprimé")
    delete_recipient(user.id, recipient_id, db)


# Dev-only stopgap for the "no verification flow in this task" constraint —
# TODO: replace with a real click-to-verify email link before any real
# sending exists.
def verify_recipient_dev(recipient_id: int, db: Session) -> AlertRecipientResponse:
    row = verify_recipient(recipient_id, db)
    if row is None:
        raise HTTPException(status_code=404, detail="Recipient not found")
    return AlertRecipientResponse.model_validate(row)


# ── System alert + default recipient bootstrap ────────────────────────────
# Called from app/services/user.py (register) and app/services/profile.py
# (profile update) — the two existing places in this codebase where a user's
# role or business profile actually changes. Both calls are idempotent
# no-ops once the rows exist.

def ensure_default_recipient_for(user: User, db: Session) -> None:
    ensure_default_recipient(user, db)


def ensure_default_alert_for(user: User, db: Session) -> None:
    if not PRO_ROLES.intersection(user.roles or []):
        return
    alert, created = get_or_create_system_alert(
        user.id, DEFAULT_ALERT_FILTERS, DEFAULT_ALERT_FREQUENCY, DEFAULT_ALERT_SEND_TIME, db,
    )
    if created:
        logger.info("alerts.default_alert_created user_id=%s alert_id=%s", user.id, alert.id)
