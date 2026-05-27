from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.region_department import region_departments

class Region(Base):
    __tablename__ = "regions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    departments = relationship("Department", secondary=region_departments, back_populates="regions")
    cities = relationship("City", back_populates="region")