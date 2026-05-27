from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class TransactionType(Base):
    __tablename__ = "transaction_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    direction = Column(String(10), nullable=False)  # income / expense
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    transactions = relationship("Transaction", back_populates="type")