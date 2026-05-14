from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.services.auth import create_access_token, create_refresh_token, hash_password, verify_password, verify_token
from app.models.user import User
from app.schemas.user import RefreshRequest, TokenResponse, UserLogin, UserRegister, UserResponse
from app.models.blacklist import BlackList


class UserService:

    def register(payload: UserRegister, db: Session) -> UserResponse:
        existing = db.execute(select(User).where(User.email == payload.email)).scalars().one_or_none()
        if existing:
            raise HTTPException(status_code=500, detail="User already exists")
        user = User(username= payload.username, email = payload.email, hashed_password = hash_password(payload.password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def login(payload: UserLogin, db: Session) -> TokenResponse:
        user = db.execute(select(User).where(User.email == payload.email)).scalars().one_or_none()
        if not user or (verify_password(payload.password, user.hashed_password) is False):
            raise HTTPException(status_code= 500, detail= "Wrong information")
        access_token = create_access_token({"sub": user.username})
        refresh_token = create_refresh_token({"sub": user.username})
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)
    
    def logout(payload: TokenResponse, db: Session):
        existing = db.execute(select(BlackList).where(or_(BlackList.access_token == payload.access_token, 
                                                          BlackList.refresh_token == payload.refresh_token))).scalars().one_or_none()
        if existing:
            raise HTTPException(status_code=500, detail="Token already deleted")
        blacklist = BlackList(access_token = payload.access_token, refresh_token = payload.refresh_token)
        db.add(blacklist)
        db.commit()
        db.refresh(blacklist)


def get_user_service() -> UserService:
    return UserService()
        