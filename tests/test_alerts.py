"""Coverage for the alerts feature: matching engine, ensure_default_alert/
recipient idempotency, ownership, limits, and system-alert protections.
Follows this repo's existing test convention (no TestClient — service/
repository functions exercised directly against the real DB, see
tests/test_saved_contracts_model.py for precedent), except for the two
role-gate tests which call the FastAPI dependency functions directly since
that's where enterprise-only enforcement actually lives (create_my_recipient
itself doesn't check roles — the router's Depends() does).
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import text

from app.repositories.alert import list_alerts, list_recipients, match_new_contracts
from app.schemas.alert import AlertCreate, AlertFilters, AlertRecipientCreate, AlertRecipientUpdate, AlertUpdate
from app.services.alert import (
    create_my_alert, create_my_recipient, delete_my_alert, delete_my_recipient,
    ensure_default_alert_for, ensure_default_recipient_for, list_my_alerts,
    update_my_alert, update_my_recipient,
)
from app.services.token import get_current_enterprise_user, get_current_pro_user


# ── Filters schema ──────────────────────────────────────────────────────────

def test_alert_filters_rejects_unknown_keys():
    with pytest.raises(ValidationError):
        AlertFilters(bogus_key="x")


def test_alert_filters_rejects_invalid_match_value():
    with pytest.raises(ValidationError):
        AlertFilters(match="not-profil")


# ── send_time requirement ───────────────────────────────────────────────────

def test_create_daily_alert_without_send_time_rejected():
    with pytest.raises(ValidationError):
        AlertCreate(name="No time", filters=AlertFilters(), frequency="daily")


def test_create_weekly_alert_without_send_time_rejected():
    with pytest.raises(ValidationError):
        AlertCreate(name="No time", filters=AlertFilters(), frequency="weekly")


def test_create_per_run_alert_without_send_time_ok(db, pro_user):
    alert = create_my_alert(pro_user, AlertCreate(name="Per run", filters=AlertFilters(), frequency="per_run"), db)
    assert alert.send_time is None


def test_update_to_weekly_without_send_time_rejected_when_none_exists(db, pro_user):
    alert = create_my_alert(pro_user, AlertCreate(name="Per run", filters=AlertFilters(), frequency="per_run"), db)
    with pytest.raises(HTTPException) as exc:
        update_my_alert(pro_user, alert.id, AlertUpdate(frequency="weekly"), db)
    assert exc.value.status_code == 400


def test_update_frequency_keeps_existing_send_time(db, pro_user):
    alert = create_my_alert(
        pro_user, AlertCreate(name="Daily", filters=AlertFilters(), frequency="daily", send_time="09:30"), db,
    )
    updated = update_my_alert(pro_user, alert.id, AlertUpdate(frequency="weekly"), db)
    assert str(updated.send_time) == "09:30:00"


# ── list_my_alerts auto-bootstraps the default alert/recipient ─────────────

def test_list_my_alerts_auto_creates_default_alert_for_pro_user(db, pro_user):
    # No explicit ensure_default_alert_for call — list_my_alerts itself
    # must guarantee it, since some accounts get the pro/enterprise role
    # without ever going through register() or a profile save.
    response = list_my_alerts(pro_user, db)
    assert response.total == 1
    assert response.items[0].is_system is True
    assert response.items[0].is_active is False


# ── ensure_default_recipient ─────────────────────────────────────────────────

def test_ensure_default_recipient_idempotent(db, pro_user):
    ensure_default_recipient_for(pro_user, db)
    ensure_default_recipient_for(pro_user, db)
    recipients = list_recipients(pro_user.id, db)
    assert len(recipients) == 1
    assert recipients[0].is_default is True
    assert recipients[0].is_verified is True
    assert recipients[0].email == pro_user.email


def test_default_recipient_not_deletable(db, pro_user):
    ensure_default_recipient_for(pro_user, db)
    default = list_recipients(pro_user.id, db)[0]
    with pytest.raises(HTTPException) as exc:
        delete_my_recipient(pro_user, default.id, db)
    assert exc.value.status_code == 400


def test_default_recipient_email_is_editable(db, pro_user):
    ensure_default_recipient_for(pro_user, db)
    default = list_recipients(pro_user.id, db)[0]
    resp = update_my_recipient(pro_user, default.id, AlertRecipientUpdate(email="new-default@example.com"), db)
    assert resp.email == "new-default@example.com"


# ── ensure_default_alert ─────────────────────────────────────────────────────

def test_ensure_default_alert_noop_for_plain_user(db, test_user):
    ensure_default_alert_for(test_user, db)
    assert list_alerts(test_user.id, db) == []


def test_ensure_default_alert_creates_inactive_system_alert(db, pro_user):
    ensure_default_alert_for(pro_user, db)
    alerts = list_alerts(pro_user.id, db)
    assert len(alerts) == 1
    assert alerts[0].is_system is True
    assert alerts[0].is_active is False
    assert alerts[0].filters == {"match": "profil"}


def test_ensure_default_alert_idempotent(db, pro_user):
    ensure_default_alert_for(pro_user, db)
    ensure_default_alert_for(pro_user, db)
    assert len(list_alerts(pro_user.id, db)) == 1


# ── System alert protections ─────────────────────────────────────────────────

def test_system_alert_not_deletable(db, pro_user):
    ensure_default_alert_for(pro_user, db)
    alert = list_alerts(pro_user.id, db)[0]
    with pytest.raises(HTTPException) as exc:
        delete_my_alert(pro_user, alert.id, db)
    assert exc.value.status_code == 400


def test_system_alert_filters_are_editable(db, pro_user):
    # Reversed from an earlier version of this feature per explicit user
    # feedback: the system alert seeds from the profile but its filters
    # aren't locked — only its name/is_system/deletability are fixed.
    ensure_default_alert_for(pro_user, db)
    alert = list_alerts(pro_user.id, db)[0]
    updated = update_my_alert(pro_user, alert.id, AlertUpdate(filters=AlertFilters(region=["Laval"])), db)
    assert updated.filters == {"region": ["Laval"]}


def test_system_alert_frequency_and_active_are_editable(db, pro_user):
    ensure_default_alert_for(pro_user, db)
    alert = list_alerts(pro_user.id, db)[0]
    resp = update_my_alert(pro_user, alert.id, AlertUpdate(is_active=True, frequency="weekly"), db)
    assert resp.is_active is True
    assert resp.frequency.value == "weekly"


# ── Ownership ─────────────────────────────────────────────────────────────

def test_alert_cross_user_delete_is_404(db, pro_user, enterprise_user):
    alert = create_my_alert(pro_user, AlertCreate(name="Owned by pro", filters=AlertFilters(), send_time="08:00"), db)
    with pytest.raises(HTTPException) as exc:
        delete_my_alert(enterprise_user, alert.id, db)
    assert exc.value.status_code == 404
    # and the owner can still delete it — proves the 404 was ownership, not corruption
    delete_my_alert(pro_user, alert.id, db)


def test_alert_cross_user_update_is_404(db, pro_user, enterprise_user):
    alert = create_my_alert(pro_user, AlertCreate(name="Owned by pro", filters=AlertFilters(), send_time="08:00"), db)
    with pytest.raises(HTTPException) as exc:
        update_my_alert(enterprise_user, alert.id, AlertUpdate(name="hijacked"), db)
    assert exc.value.status_code == 404


def test_recipient_cross_user_update_is_404(db, pro_user, enterprise_user):
    ensure_default_recipient_for(pro_user, db)
    default = list_recipients(pro_user.id, db)[0]
    with pytest.raises(HTTPException) as exc:
        update_my_recipient(enterprise_user, default.id, AlertRecipientUpdate(email="hijacked@example.com"), db)
    assert exc.value.status_code == 404


# ── Role gates (the dependency functions themselves — see module docstring) ──

def test_pro_gate_rejects_plain_user(db, test_user):
    with pytest.raises(HTTPException) as exc:
        get_current_pro_user(username=test_user.username, db=db)
    assert exc.value.status_code == 403


def test_pro_gate_accepts_pro_user(db, pro_user):
    resolved = get_current_pro_user(username=pro_user.username, db=db)
    assert resolved.id == pro_user.id


def test_enterprise_gate_rejects_pro_user(db, pro_user):
    with pytest.raises(HTTPException) as exc:
        get_current_enterprise_user(username=pro_user.username, db=db)
    assert exc.value.status_code == 403


def test_enterprise_gate_accepts_enterprise_user(db, enterprise_user):
    resolved = get_current_enterprise_user(username=enterprise_user.username, db=db)
    assert resolved.id == enterprise_user.id


# ── Limits ────────────────────────────────────────────────────────────────

def test_max_10_alerts_per_user(db, pro_user):
    for i in range(10):
        create_my_alert(pro_user, AlertCreate(name=f"Alert {i}", filters=AlertFilters(), send_time="08:00"), db)
    with pytest.raises(HTTPException) as exc:
        create_my_alert(pro_user, AlertCreate(name="Overflow", filters=AlertFilters(), send_time="08:00"), db)
    assert exc.value.status_code == 400


def test_max_5_additional_recipients(db, enterprise_user):
    for i in range(5):
        create_my_recipient(enterprise_user, AlertRecipientCreate(email=f"extra{i}@example.com"), db)
    with pytest.raises(HTTPException) as exc:
        create_my_recipient(enterprise_user, AlertRecipientCreate(email="overflow@example.com"), db)
    assert exc.value.status_code == 400


# ── Matching engine ───────────────────────────────────────────────────────

def test_matching_creates_notification_for_new_contract(db, pro_user, make_alert_test_contract):
    alert = create_my_alert(
        pro_user, AlertCreate(name="Org match", filters=AlertFilters(organisation=["Organisation Test"]), frequency="daily", send_time="08:00"), db,
    )
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    contract = make_alert_test_contract(first_seen_at=datetime.now(timezone.utc))

    results = match_new_contracts(since, db)

    assert results.get(alert.id) == 1
    notif_count = db.execute(
        text("SELECT count(*) FROM alert_notifications WHERE alert_id = :a AND contract_id = :c"),
        {"a": alert.id, "c": contract.id},
    ).scalar()
    assert notif_count == 1


def test_matching_rerun_does_not_duplicate(db, pro_user, make_alert_test_contract):
    alert = create_my_alert(
        pro_user, AlertCreate(name="Org match", filters=AlertFilters(organisation=["Organisation Test"]), frequency="daily", send_time="08:00"), db,
    )
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    make_alert_test_contract(first_seen_at=datetime.now(timezone.utc))

    first_run = match_new_contracts(since, db)
    second_run = match_new_contracts(since, db)

    assert first_run.get(alert.id) == 1
    assert second_run.get(alert.id) == 0  # ON CONFLICT DO NOTHING — no duplicate row


def test_matching_ignores_contract_before_since(db, pro_user, make_alert_test_contract):
    alert = create_my_alert(
        pro_user, AlertCreate(name="Org match", filters=AlertFilters(organisation=["Organisation Test"]), frequency="daily", send_time="08:00"), db,
    )
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    make_alert_test_contract(first_seen_at=since - timedelta(hours=2))  # older than `since`

    results = match_new_contracts(since, db)

    assert results.get(alert.id) == 0


def test_matching_inactive_alert_is_skipped(db, pro_user, make_alert_test_contract):
    alert = create_my_alert(
        pro_user, AlertCreate(name="Org match", filters=AlertFilters(organisation=["Organisation Test"]), frequency="daily", send_time="08:00"), db,
    )
    update_my_alert(pro_user, alert.id, AlertUpdate(is_active=False), db)
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    make_alert_test_contract(first_seen_at=datetime.now(timezone.utc))

    results = match_new_contracts(since, db)

    assert alert.id not in results
