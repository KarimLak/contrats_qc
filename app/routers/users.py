
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.services.auth import get_current_user
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import UserResponse

router = APIRouter

@router.get("/me", response_model=UserResponse)
def get_me(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.username == username)).scalars().one_or_none()
    if not user:
        raise HTTPException(status_code=500, detail= "User not found")
    return user

@router.get("/all", response_model=List[UserResponse])
def get_all(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.execute(select(User)).scalars().all()
    if not users:
        raise HTTPException(status_code=500, detail= "Users not found")
    return users
