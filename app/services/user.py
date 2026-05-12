from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.services.auth import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import TokenResponse, UserLogin, UserRegister, UserResponse


class UserService:

    def register(payload: UserRegister, db: Session) -> UserResponse:
        existing = db.execute(select(User).where(User.email == payload.email)).scalars.one_or_none()
        if existing:
            raise HTTPException(status_code=500, detail="User already exists")
        user = User(username= payload.username, email = payload.email, hashed_password = hash_password(payload.password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def login(payload: UserLogin, db: Session) -> UserResponse:
        user = db.execute(select(User).where(User.email == payload.email)).scalars.one_or_none()
        if not user or (verify_password(payload.password, user.hashed_password) is False):
            raise HTTPException(status_code= 500, detail= "Wrong information")
        access_token = create_access_token({"sub": user.username})
        refresh_token = create_refresh_token({"sub": user.username})
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

def get_user_service() -> UserService:
    return UserService()
        