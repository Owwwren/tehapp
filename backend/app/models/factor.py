from sqlalchemy import Column, Integer, String
from app.database import Base

class Factor(Base):
    __tablename__ = "factors"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)