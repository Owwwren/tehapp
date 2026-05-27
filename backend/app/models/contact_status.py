# contact_status.py
from sqlalchemy import Column, Integer, String
from app.database import Base

class ContactStatus(Base):
    __tablename__ = "contact_statuses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    color = Column(String(7), nullable=True)
    text_color = Column(String(7), nullable=True)