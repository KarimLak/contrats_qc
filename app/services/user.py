from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.services.auth import create_token, hash_password, verify_password
from app.models.models import User
from app.schemas.schemas import TokenResponse, UserLogin, UserRegister, UserResponse


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
        token = create_token({"sub": user.username})
        return TokenResponse(access_token=token)

def get_user_service() -> UserService:
    return UserService()
        