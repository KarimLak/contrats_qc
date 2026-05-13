from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import RefreshRequest, TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.user import UserService, get_user_service
from app.main import limiter

router = APIRouter(prefix='/auth')

@router.post('/register', response_model=UserResponse)
@limiter.limit("1/minute")
def register(payload: UserRegister, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    return service.register(payload, db)

@router.post('/login', response_model=TokenResponse)
@limiter.limit("5/minute")
def login(payload: UserLogin, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    return service.login(payload, db)

@router.post('/refresh', response_model=TokenResponse)
@limiter.limit("5/minute")
def refresh(payload: RefreshRequest, service: UserService = Depends(get_user_service)):
    return service.refresh_token(payload)

@router.post("/logout", response_model=dict)
@limiter.limit("5/minute")
def logout(payload : TokenResponse, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    service.logout(payload, db)
    return {"message": "Logged out successfully"}



