from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserLogin, UserRegister, UserResponse
from app.schemas.token import RefreshRequest, TokenResponse
from app.services.user import UserService, get_user_service
from app.limiter import limiter

router = APIRouter(prefix='/auth')

@router.post('/register', response_model=UserResponse)
@limiter.limit("1/minute")
def register(request: Request, payload: UserRegister, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    return service.register(payload, db)

@router.post('/login', response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    return service.login(payload, db)

@router.post('/refresh', response_model=TokenResponse)
@limiter.limit("5/minute")
def refresh(request: Request, payload: RefreshRequest, service: UserService = Depends(get_user_service)):
    return service.refresh_token(payload)

@router.post("/logout", response_model=dict)
@limiter.limit("5/minute")
def logout(request: Request, payload : TokenResponse, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    service.logout(payload, db)
    return {"message": "Logged out successfully"}



