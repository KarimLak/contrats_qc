from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.limiter import limiter
from app.models.user import User
from app.schemas.alert import AlertRecipientCreate, AlertRecipientResponse, AlertRecipientUpdate
from app.services.alert import (
    create_my_recipient, delete_my_recipient, list_my_recipients,
    update_my_recipient, verify_recipient_dev,
)
from app.services.token import get_current_authenticated_user, get_current_enterprise_user, get_current_user

router = APIRouter(prefix='/alert-recipients')


# GET/PATCH/DELETE are reachable by any authenticated user (not PRO-gated):
# every account has exactly one is_default=true recipient (see
# ensure_default_recipient) and editing its email is basic account
# management surfaced on the Profile page, not really "the Alertes
# feature." Only *creating additional* recipients — the actual
# enterprise-tier perk — requires get_current_enterprise_user below.
@router.get('/', response_model=List[AlertRecipientResponse])
@limiter.limit("30/minute")
def list_recipients(request: Request, user: User = Depends(get_current_authenticated_user), db: Session = Depends(get_db)):
    return list_my_recipients(user, db)


@router.post('/', response_model=AlertRecipientResponse, status_code=201)
@limiter.limit("10/minute")
def create_recipient(request: Request, payload: AlertRecipientCreate,
                     user: User = Depends(get_current_enterprise_user), db: Session = Depends(get_db)):
    return create_my_recipient(user, payload, db)


@router.patch('/{recipient_id}', response_model=AlertRecipientResponse)
@limiter.limit("20/minute")
def update_recipient(request: Request, recipient_id: int, payload: AlertRecipientUpdate,
                     user: User = Depends(get_current_authenticated_user), db: Session = Depends(get_db)):
    return update_my_recipient(user, recipient_id, payload, db)


@router.delete('/{recipient_id}', status_code=204)
@limiter.limit("20/minute")
def delete_recipient(request: Request, recipient_id: int,
                     user: User = Depends(get_current_authenticated_user), db: Session = Depends(get_db)):
    delete_my_recipient(user, recipient_id, db)


# Dev-only stopgap — no email-verification flow exists yet (see the TODO on
# AlertRecipient.is_verified). Deliberately not scoped to "your own"
# recipients: this is a tool for whoever's testing/operating the feature
# locally, not an end-user action.
# TODO: replace with a real click-to-verify email link.
@router.post('/{recipient_id}/verify-dev', response_model=AlertRecipientResponse)
@limiter.limit("10/minute")
def verify_recipient_dev_endpoint(request: Request, recipient_id: int,
                                  username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return verify_recipient_dev(recipient_id, db)
