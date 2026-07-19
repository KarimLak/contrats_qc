from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.limiter import limiter
from app.models.user import User
from app.schemas.alert import (
    AlertCreate, AlertPreviewRequest, AlertPreviewResponse, AlertResponse,
    AlertsListResponse, AlertUpdate,
)
from app.services.alert import (
    create_my_alert, delete_my_alert, list_my_alerts, preview_alert,
    run_matching_dev, update_my_alert,
)
from app.services.token import get_current_pro_user, get_current_user

router = APIRouter(prefix='/alerts')


@router.get('/', response_model=AlertsListResponse)
@limiter.limit("30/minute")
def list_alerts(request: Request, user: User = Depends(get_current_pro_user), db: Session = Depends(get_db)):
    return list_my_alerts(user, db)


@router.post('/', response_model=AlertResponse, status_code=201)
@limiter.limit("20/minute")
def create_alert(request: Request, payload: AlertCreate,
                 user: User = Depends(get_current_pro_user), db: Session = Depends(get_db)):
    return create_my_alert(user, payload, db)


# Registered before /{alert_id} so "preview"/"run-matching-dev" aren't
# swallowed by the int path param (FastAPI validates path-param types after
# structural matching, not before — an out-of-order string route here would
# 422 instead of falling through).
@router.post('/preview', response_model=AlertPreviewResponse)
@limiter.limit("30/minute")
def preview_alert_endpoint(request: Request, payload: AlertPreviewRequest,
                           user: User = Depends(get_current_pro_user), db: Session = Depends(get_db)):
    return preview_alert(user, payload, db)


# Dev/admin-only manual trigger for the matching engine — the real sync
# pipeline (sync_s3_to_postgres.py) isn't touched by this task and will call
# match_new_contracts() directly once it's wired up; this endpoint exists so
# the engine is exercisable before that happens. Requires *some*
# authenticated caller (not anonymous) but isn't PRO-gated — it's an
# operational tool, not a user-facing feature.
# TODO: remove or lock down to an admin role once the real pipeline calls
# match_new_contracts() itself.
@router.post('/run-matching-dev')
@limiter.limit("5/minute")
def run_matching_dev_endpoint(request: Request, since: Optional[datetime] = Query(default=None),
                              username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return run_matching_dev(since, db)


@router.patch('/{alert_id}', response_model=AlertResponse)
@limiter.limit("30/minute")
def update_alert(request: Request, alert_id: int, payload: AlertUpdate,
                 user: User = Depends(get_current_pro_user), db: Session = Depends(get_db)):
    return update_my_alert(user, alert_id, payload, db)


@router.delete('/{alert_id}', status_code=204)
@limiter.limit("30/minute")
def delete_alert(request: Request, alert_id: int,
                 user: User = Depends(get_current_pro_user), db: Session = Depends(get_db)):
    delete_my_alert(user, alert_id, db)
