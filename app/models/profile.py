from sqlalchemy import ARRAY, Integer, String

from app.database import Base
from sqlalchemy.orm import Mapped, mapped_column

class BusinessProfile(Base):
    __tablename__ = 'businessprofile'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[list[str]] = mapped_column(ARRAY(String(255)), nullable=False)
    contract_type: Mapped[list[str]] = mapped_column(ARRAY(String(255)), nullable=False)
    expertise: Mapped[list[str]] = mapped_column(ARRAY(String(255)), nullable=False)
    region: Mapped[list[str]] = mapped_column(ARRAY(String(255)), nullable=False)
    size: Mapped[list[str]] = mapped_column(ARRAY(String(255)), nullable=False)
    budget_min: Mapped[int] = mapped_column(Integer, nullable=False)
    budget_max: Mapped[int] = mapped_column(Integer, nullable=False)
