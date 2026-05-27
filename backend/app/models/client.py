from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False)
    additional_phone = Column(String(20), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    address = Column(Text, nullable=True)
    avito_user_id = Column(BigInteger, nullable=True)
    source = Column(String(50), nullable=True)
    blacklisted = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    total_orders = Column(Integer, default=0, nullable=False)
    total_earned = Column(Numeric(12, 2), default=0, nullable=False)
    returned = Column(Numeric(12, 2), default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.now)

    city = relationship("City", back_populates="clients")
    branch = relationship("Branch")
    orders = relationship("Order", back_populates="client")
    contacts = relationship("ClientContact", back_populates="client", cascade="all, delete-orphan")