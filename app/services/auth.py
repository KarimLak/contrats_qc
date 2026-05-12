import datetime
import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError

load_dotenv() 
pwd_context = CryptContext(schemes=["bcrypt"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + datetime.timedelta(minutes=os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES'))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv('SECRET_KEY'), os.getenv('ALGORITHM'))

def verify_token(token: str) -> str:
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
