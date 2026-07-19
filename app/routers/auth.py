from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserLogin, UserRegister, UserResponse
from app.schemas.token import LogoutRequest, TokenResponse
from app.limiter import limiter
from app.services.token import new_refresh_token
from app.services.user import register, login, logout

router = APIRouter(prefix='/auth')

@router.post('/register', response_model=UserResponse)
@limiter.limit("1/minute")
def register_user(request: Request, payload: UserRegister, db: Session = Depends(get_db)):
    return register(payload, db)

@router.post('/login', response_model=TokenResponse)
@limiter.limit("5/minute")
def login_user(request: Request, response: Response, payload: UserLogin, db: Session = Depends(get_db)):
    tokens = login(payload, db)
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
    )
    return TokenResponse(access_token=tokens.access_token)

@router.post('/refresh', response_model=TokenResponse)
@limiter.limit("5/minute")
def refresh(request: Request, refresh_token: Optional[str] = Cookie(None), db: Session = Depends(get_db)):
    return new_refresh_token(refresh_token, db)

@router.post("/logout", response_model=dict)
@limiter.limit("5/minute")
def logout_user(request: Request, refresh_token: Optional[str] = Cookie(None), db: Session = Depends(get_db)):
    logout(refresh_token, db)
    return {"message": "Logged out successfully"}



