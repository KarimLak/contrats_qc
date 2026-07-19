from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.contract import Contract

# Pipeline stages a saved notice moves through — not a boolean favorites
# flag. 'a_evaluer' is the default a fresh save lands in; 'non_retenu' and
# 'abandonne' are terminal (no longer "active" — see get_closing_soon_count
# in app/repositories/saved_contract.py, which only counts a_evaluer/
# en_preparation as still needing attention before the deadline).
SAVED_CONTRACT_STATUSES = ("a_evaluer", "en_preparation", "soumis", "non_retenu", "abandonne")


class SavedContract(Base):
    __tablename__ = "saved_contracts"
    __table_args__ = (
        UniqueConstraint("user_id", "contract_id", name="uq_saved_contracts_user_contract"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="a_evaluer")
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    # lazy="raise" instead of the SQLAlchemy default ("select"): accessing
    # .contract without having eager-loaded it (selectinload — see
    # get_saved_contracts_list) raises immediately instead of silently
    # firing one query per row. Unidirectional on purpose — Contract itself
    # isn't touched, this repo has no relationship()s on it to begin with.
    contract: Mapped["Contract"] = relationship("Contract", lazy="raise")
