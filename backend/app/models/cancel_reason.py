# cancel_reason.py
from sqlalchemy import Column, Integer, String
from app.database import Base

class CancelReason(Base):
    __tablename__ = "cancel_reasons"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)