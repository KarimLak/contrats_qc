from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.repositories.token import add_blacklist_token, get_blacklist_token
from app.repositories.user import create_user, get_user
from app.services.token import create_access_token, create_refresh_token, verify_token
from app.services.password import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserLogin, UserRegister, UserResponse
from app.schemas.token import LogoutRequest, RefreshRequest, TokenResponse
from app.models.blacklist import BlackList

def register(payload: UserRegister, db: Session) -> UserResponse:
    existing = get_user(payload.username, db)
    if existing:
        raise HTTPException(status_code=500, detail="User already exists")
    return create_user(payload.username, payload.email, hash_password(payload.password), payload.roles, db)
   
def login(payload: UserLogin, db: Session) -> TokenResponse:
    user = get_user(payload.username, db)
    if not user or (verify_password(payload.password, user.hashed_password) is False):
        raise HTTPException(status_code= 500, detail= "Wrong information")
    access_token = create_access_token({"sub": user.username})
    refresh_token = create_refresh_token({"sub": user.username})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
    
def logout(payload: LogoutRequest, db: Session):
    existing = get_blacklist_token(payload.refresh_token, db)
    if existing:
        raise HTTPException(status_code=500, detail="Token already deleted")
    add_blacklist_token(payload.refresh_token, db)