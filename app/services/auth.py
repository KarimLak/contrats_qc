import datetime
import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError

from app.schemas.user import RefreshRequest
from auth_v2.app.schemas.token import TokenResponse

load_dotenv() 
pwd_context = CryptContext(schemes=["bcrypt"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + datetime.timedelta(minutes=os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES'))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv('SECRET_KEY'), os.getenv('ALGORITHM'))

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + datetime.timedelta(days=os.getenv('REFRESH_TOKEN_EXPIRE_DAYS'))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv('SECRET_KEY')), os.getenv('ALGORITHM')

def refresh_token(payload: RefreshRequest) -> TokenResponse:
    username = verify_token(payload.refresh_token)
    if not username:
        raise HTTPException(status=500, detail='logout')
    access_token = create_access_token({"sub": username})
    return TokenResponse(acess_token=access_token, refresh_token=payload.refresh_token)

def verify_token(token: str, expected_type: str = "access") -> str:
    try:
        payload = jwt.decode(token, os.getenv('SECRET_KEY'), os.getenv('ALGORITHM'))
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail= "Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    return verify_token(token)
