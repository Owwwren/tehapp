# contact_type.py
from sqlalchemy import Column, Integer, String
from app.database import Base

class ContactType(Base):
    __tablename__ = "contact_types"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)