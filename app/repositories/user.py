from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User

def get_user(username: str, db: Session) -> User:
    return db.execute(select(User).where(User.username == username)).scalars().one_or_none()

def create_user(username: str, email: str, hashed_password: str, db: Session) -> User:
    user = User(username= username, email = email, hashed_password = hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user