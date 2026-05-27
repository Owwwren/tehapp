from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class City(Base):
    __tablename__ = "cities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=False)
    timezone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    region = relationship("Region", back_populates="cities")
    branches = relationship("Branch", back_populates="city")
    clients = relationship("Client", back_populates="city")
    orders = relationship("Order", back_populates="city", viewonly=True)