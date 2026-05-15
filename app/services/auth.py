from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.schemas.token import RefreshRequest
from app.database import get_db
from app.schemas.token import TokenResponse
from app.services.blacklist import is_black_list_token

load_dotenv() 
pwd_context = CryptContext(schemes=["bcrypt"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES')))
    to_encode.update({"exp": expire, "type": os.getenv("ACCESS_TYPE")})
    return jwt.encode(to_encode, os.getenv('SECRET_KEY'), algorithm=os.getenv('ALGORITHM'))

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS')))
    to_encode.update({"exp": expire, "type": os.getenv("REFRESH_TYPE")})
    return jwt.encode(to_encode, os.getenv('SECRET_KEY'), algorithm=os.getenv('ALGORITHM'))

def refresh_token(payload: RefreshRequest) -> TokenResponse:
    username = verify_token(payload.refresh_token, os.getenv("REFRESH_TYPE"))
    if not username:
        raise HTTPException(status_code=500, detail='logout')
    access_token = create_access_token({"sub": username})
    return TokenResponse(access_token=access_token, refresh_token=payload.refresh_token)

def verify_token(token: str, expected_type: str = "access") -> str:
    try:
        if (is_black_list_token(token)):
            return HTTPException(status_code=500, detail="Invalid token")
        payload = jwt.decode(token, os.getenv('SECRET_KEY'), algorithm=os.getenv('ALGORITHM'))
        username = payload.get("sub")
        type = payload.get("type")
        if not username or type != expected_type:
            raise HTTPException(status_code=401, detail= "Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    return verify_token(token)
