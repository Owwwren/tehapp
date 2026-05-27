from sqlalchemy import Column, Integer, String, DateTime, Date, Numeric, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Advertising(Base):
    __tablename__ = "advertising"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("advertising_categories.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String(20), default="planned")  # planned, paid, cancelled
    document_path = Column(String(255), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    category = relationship("AdvertisingCategory", back_populates="expenses")
    branch = relationship("Branch")