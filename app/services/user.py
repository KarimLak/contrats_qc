from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.repositories.token import add_blacklist_token, get_blacklist_token
from app.repositories.user import create_user, get_user
from app.services.token import create_access_token, create_refresh_token, verify_token
from app.services.password import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserLogin, UserRegister, UserResponse
from app.schemas.token import LogoutRequest, TokenResponse, TokensResponse
from app.models.blacklist import BlackList
from app.repositories.profile import create_business_profile, last_business_id

def register(payload: UserRegister, db: Session) -> UserResponse:
    existing = get_user(payload.username, db)
    if existing:
        raise HTTPException(status_code=500, detail="User already exists")
    business_id = last_business_id(db) + 1 if last_business_id(db) else 1
    create_business_profile(db, business_id, payload.business)
    return create_user(payload.username, payload.email, hash_password(payload.password), payload.roles, business_id, db)
   
def login(payload: UserLogin, db: Session) -> TokensResponse:
    user = get_user(payload.username, db)
    if not user or (verify_password(payload.password, user.hashed_password) is False):
        raise HTTPException(status_code= 500, detail= "Wrong information")
    access_token = create_access_token({"sub": user.username})
    refresh_token = create_refresh_token({"sub": user.username})
    return TokensResponse(access_token=access_token, refresh_token=refresh_token)
    
def logout(refresh_token: str, db: Session):
    existing = get_blacklist_token(refresh_token, db)
    if existing:
        raise HTTPException(status_code=500, detail="Token already deleted")
    add_blacklist_token(refresh_token, db)