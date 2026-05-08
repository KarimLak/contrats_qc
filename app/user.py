from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import User
from app.schemas import UserLogin, UserRegister, UserResponse


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
        return 1

def get_user_service() -> UserService:
    return UserService()
        