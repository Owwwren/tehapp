from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class AdvertisingCategory(Base):
    __tablename__ = "advertising_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_id = Column(Integer, ForeignKey("advertising_categories.id"), nullable=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=True)
    monthly_budget = Column(Numeric(10, 2), nullable=True)
    description = Column(Text, nullable=True)
    show_in_order = Column(Boolean, default=True)
    month_year = Column(String(7), nullable=True)  # "2026-05"
    level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    parent = relationship("AdvertisingCategory", remote_side=[id], backref="children")
    expenses = relationship("Advertising", back_populates="category")