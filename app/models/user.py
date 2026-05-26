from sqlalchemy import ARRAY, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    roles: Mapped[list[str]] = mapped_column(ARRAY(String(255)), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)