from sqlalchemy import Column, Integer, Numeric, String, DateTime
from datetime import datetime
from app.database import Base

class AdvertisingBudget(Base):
    __tablename__ = "advertising_budgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)