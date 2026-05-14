from fastapi import Depends
from niquests import Session
from sqlalchemy import or_, select

from app.database import get_db
from app.models.blacklist import BlackList


def is_black_list_token(token: str, db : Session = Depends(get_db)) -> bool:
    blacklisttoken = db.execute(select(BlackList).where(or_(BlackList.acess_token == token, BlackList.refresh_token == token))).scalars().one_or_none()
    if blacklisttoken:
        return True
    else:
        return False