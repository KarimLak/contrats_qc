from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class BlackList(Base):
    __tablename__= "blacklisttokens"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    acess_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    refresh_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    
