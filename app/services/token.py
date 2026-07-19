from datetime import datetime, timedelta
import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.token import TokenResponse
from app.services.blacklist import is_black_list_token

load_dotenv() 

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

def new_refresh_token(refresh_token: Optional[str], db: Session) -> TokenResponse:
    # verify_token always either returns a non-empty username or raises —
    # no "falsy but no exception" case left to guard against here.
    username = verify_token(refresh_token, db, os.getenv("REFRESH_TYPE"))
    access_token = create_access_token({"sub": username})
    return TokenResponse(access_token=access_token)

def verify_token(token: Optional[str], db: Session, expected_type: str = "access") -> str:
    # No cookie / no Authorization header (e.g. AuthContext's silent
    # refresh() probe on first page load with no session yet) previously
    # fell through to jwt.decode(None, ...), which python-jose doesn't
    # raise JWTError for — it raises a bare TypeError, which the
    # `except JWTError` below never catches, surfacing as an unhandled 500
    # with no CORS headers (FastAPI's default error handler runs before
    # CORSMiddleware gets to add them). "No token" is a 401, not a crash.
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")
    if is_black_list_token(token, db):
        # This used to be `return HTTPException(...)` instead of `raise` —
        # the exception object was returned as if it were the username
        # (truthy, so `if not username` downstream never caught it), which
        # meant a blacklisted/logged-out refresh token silently kept working.
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        payload = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=os.getenv('ALGORITHM'))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    username = payload.get("sub")
    token_type = payload.get("type")
    if not username or token_type != expected_type:
        raise HTTPException(status_code=401, detail="Invalid token")
    return username

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> str:
    return verify_token(token, db)

# auto_error=False: no Authorization header just resolves to token=None
# instead of FastAPI raising 401 before the endpoint even runs — for routes
# that are public by default but need to know "who is this" when a specific
# opt-in param is present (e.g. GET /contract/search?match=profil, which
# only needs a caller identity when that param is used).
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[str]:
    if not token:
        return None
    try:
        return verify_token(token, db)
    except HTTPException:
        return None
