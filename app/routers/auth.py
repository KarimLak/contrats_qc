from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserLogin, UserRegister, UserResponse
from app.services.user import UserService, get_user_service

router = APIRouter(prefix='/auth')

@router.post('/register', response_model=UserResponse)
def register(payload: UserRegister, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    service.register(payload, db)

@router.post('/login', response_model=UserResponse)
def login(payload: UserLogin, db: Session = Depends(get_db), service: UserService = Depends(get_user_service)):
    service.login(payload, db)



