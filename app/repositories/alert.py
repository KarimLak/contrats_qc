import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import delete, func, literal, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertRecipient, AlertRecipientLink, AlertNotification
from app.models.contract import Contract
from app.models.user import User
from app.repositories.explorer import build_contract_query

logger = logging.getLogger("alerts")

MAX_ALERTS_PER_USER = 10
MAX_ADDITIONAL_RECIPIENTS = 5


# ── Recipients ────────────────────────────────────────────────────────────

def get_default_recipient(user_id: int, db: Session) -> Optional[AlertRecipient]:
    return db.execute(
        select(AlertRecipient).where(AlertRecipient.user_id == user_id, AlertRecipient.is_default.is_(True))
    ).scalar_one_or_none()


def list_recipients(user_id: int, db: Session) -> List[AlertRecipient]:
    return list(db.execute(
        select(AlertRecipient)
        .where(AlertRecipient.user_id == user_id)
        .order_by(AlertRecipient.is_default.desc(), AlertRecipient.created_at)
    ).scalars().all())


def count_additional_recipients(user_id: int, db: Session) -> int:
    return db.execute(
        select(func.count()).select_from(AlertRecipient)
        .where(AlertRecipient.user_id == user_id, AlertRecipient.is_default.is_(False))
    ).scalar() or 0


def create_recipient(user_id: int, email: str, label: Optional[str], db: Session) -> AlertRecipient:
    row = AlertRecipient(user_id=user_id, email=email, label=label, is_default=False, is_verified=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_recipient_by_id(user_id: int, recipient_id: int, db: Session) -> Optional[AlertRecipient]:
    return db.execute(
        select(AlertRecipient).where(AlertRecipient.id == recipient_id, AlertRecipient.user_id == user_id)
    ).scalar_one_or_none()


def update_recipient(recipient: AlertRecipient, updates: dict, db: Session) -> AlertRecipient:
    for k, v in updates.items():
        setattr(recipient, k, v)
    db.commit()
    db.refresh(recipient)
    return recipient


def delete_recipient(user_id: int, recipient_id: int, db: Session) -> bool:
    # is_default excluded here too (belt and suspenders — the service layer
    # already raises a clear error before reaching this, this just makes the
    # query itself incapable of deleting a default row).
    result = db.execute(
        delete(AlertRecipient).where(
            AlertRecipient.id == recipient_id,
            AlertRecipient.user_id == user_id,
            AlertRecipient.is_default.is_(False),
        )
    )
    db.commit()
    return result.rowcount > 0


def verify_recipient(recipient_id: int, db: Session) -> Optional[AlertRecipient]:
    row = db.get(AlertRecipient, recipient_id)
    if row is None:
        return None
    row.is_verified = True
    db.commit()
    db.refresh(row)
    return row


def ensure_default_recipient(user: User, db: Session) -> AlertRecipient:
    existing = get_default_recipient(user.id, db)
    if existing:
        return existing
    row = AlertRecipient(user_id=user.id, email=user.email, label=None, is_default=True, is_verified=True)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ── Alerts ────────────────────────────────────────────────────────────────

def count_alerts(user_id: int, db: Session) -> int:
    return db.execute(select(func.count()).select_from(Alert).where(Alert.user_id == user_id)).scalar() or 0


def list_alerts(user_id: int, db: Session) -> List[Alert]:
    return list(db.execute(
        select(Alert).where(Alert.user_id == user_id).order_by(Alert.is_system.desc(), Alert.created_at)
    ).scalars().all())


def get_alert_by_id(user_id: int, alert_id: int, db: Session) -> Optional[Alert]:
    return db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == user_id)
    ).scalar_one_or_none()


# No explicit link row = implicitly the owner's default recipient — this is
# resolved here (read time) rather than by always materializing a link row,
# so a freshly created alert with no recipient_ids and the system alert
# (which never gets explicit links) both "just work" without special-casing.
def get_alert_recipients(alert: Alert, db: Session) -> List[AlertRecipient]:
    linked = db.execute(
        select(AlertRecipient)
        .join(AlertRecipientLink, AlertRecipientLink.recipient_id == AlertRecipient.id)
        .where(AlertRecipientLink.alert_id == alert.id)
    ).scalars().all()
    if linked:
        return list(linked)
    default = get_default_recipient(alert.user_id, db)
    return [default] if default else []


def _set_recipient_links(alert_id: int, user_id: int, recipient_ids: Optional[List[int]], db: Session) -> None:
    db.execute(delete(AlertRecipientLink).where(AlertRecipientLink.alert_id == alert_id))
    if not recipient_ids:
        return
    # Only ever link recipients the alert's own owner actually owns — silently
    # drops any id in the payload that isn't theirs rather than erroring, same
    # spirit as ignoring unknown ids anywhere else in this codebase's bulk ops.
    owned_ids = db.execute(
        select(AlertRecipient.id).where(AlertRecipient.user_id == user_id, AlertRecipient.id.in_(recipient_ids))
    ).scalars().all()
    for rid in owned_ids:
        db.add(AlertRecipientLink(alert_id=alert_id, recipient_id=rid))


def create_alert(
    user_id: int, name: str, filters: dict, frequency: str, send_time, recipient_ids: Optional[List[int]], db: Session,
) -> Alert:
    alert = Alert(
        user_id=user_id, name=name, filters=filters, frequency=frequency,
        send_time=send_time, is_system=False,
    )
    db.add(alert)
    db.flush()  # need alert.id for the link rows below
    _set_recipient_links(alert.id, user_id, recipient_ids, db)
    db.commit()
    db.refresh(alert)
    return alert


def update_alert(
    alert: Alert, updates: dict, recipient_ids: Optional[List[int]], set_recipients: bool, db: Session,
) -> Alert:
    for k, v in updates.items():
        setattr(alert, k, v)
    if set_recipients:
        _set_recipient_links(alert.id, alert.user_id, recipient_ids, db)
    db.commit()
    db.refresh(alert)
    return alert


def delete_alert(user_id: int, alert_id: int, db: Session) -> bool:
    result = db.execute(
        delete(Alert).where(Alert.id == alert_id, Alert.user_id == user_id, Alert.is_system.is_(False))
    )
    db.commit()
    return result.rowcount > 0


def get_or_create_system_alert(
    user_id: int, filters: dict, frequency: str, send_time, db: Session,
) -> Tuple[Alert, bool]:
    existing = db.execute(
        select(Alert).where(Alert.user_id == user_id, Alert.is_system.is_(True))
    ).scalar_one_or_none()
    if existing:
        return existing, False
    # is_active=False overrides the table's normal DEFAULT true for
    # user-created alerts — the system alert starts off so a brand-new
    # pro/enterprise user isn't immediately emailed before they've looked at it.
    alert = Alert(
        user_id=user_id, name="Mon profil d'entreprise", filters=filters,
        frequency=frequency, send_time=send_time, is_system=True, is_active=False,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert, True


# ── Matching engine ──────────────────────────────────────────────────────
# One set-based INSERT ... SELECT ... ON CONFLICT DO NOTHING per active
# alert — never a per-contract Python loop. Not wired into the sync
# pipeline (sync_s3_to_postgres.py) in this task; callable standalone via
# the dev-only endpoint (see app/routers/alert.py) until it is.
def match_new_contracts(since: datetime, db: Session) -> Dict[int, int]:
    active_alerts = db.execute(select(Alert).where(Alert.is_active.is_(True))).scalars().all()

    results: Dict[int, int] = {}
    for alert in active_alerts:
        owner = db.get(User, alert.user_id)
        if owner is None:
            logger.warning("alert_matching.owner_missing alert_id=%s user_id=%s", alert.id, alert.user_id)
            continue
        try:
            predicates = build_contract_query(alert.filters, owner, db)
        except ValueError as exc:
            logger.warning("alert_matching.invalid_filters alert_id=%s error=%s", alert.id, exc)
            continue

        select_new = (
            select(literal(alert.id).label("alert_id"), Contract.id.label("contract_id"))
            .where(Contract.first_seen_at >= since, *predicates)
        )
        insert_stmt = (
            pg_insert(AlertNotification)
            .from_select(["alert_id", "contract_id"], select_new)
            .on_conflict_do_nothing(constraint="uq_alert_notifications_alert_contract")
        )
        result = db.execute(insert_stmt)
        inserted = result.rowcount or 0
        results[alert.id] = inserted
        logger.info(
            "alert_matching.alert_processed alert_id=%s user_id=%s inserted=%s",
            alert.id, alert.user_id, inserted,
        )

    db.commit()
    logger.info(
        "alert_matching.run_complete since=%s alerts_active=%s alerts_processed=%s notifications_created=%s",
        since.isoformat(), len(active_alerts), len(results), sum(results.values()),
    )
    return results
