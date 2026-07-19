from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserContractFeedback(Base):
    __tablename__ = "user_contract_feedback"
    __table_args__ = (
        UniqueConstraint("user_id", "contract_id", name="uq_user_contract_feedback_user_contract"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # "saved" | "not_relevant"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
