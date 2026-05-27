from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    last_name = Column(String(100), nullable=False)
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=False, unique=True)
    username = Column(String(100), nullable=True, unique=True)
    birth_date = Column(DateTime, nullable=True)
    address = Column(Text, nullable=True)
    passport = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    telegram_nick = Column(String(100), nullable=True)
    salary = Column(Numeric(10, 2), nullable=True)
    commission_percent = Column(Numeric(5, 2), nullable=True)
    note = Column(Text, nullable=True)
    cooperation_note = Column(Text, nullable=True)
    theme = Column(String(10), default="light", nullable=True)
    bind_code = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.now)

    role = relationship("Role", back_populates="users")
    work_schedules = relationship("WorkSchedule", back_populates="user", cascade="all, delete-orphan")
    branches = relationship("Branch", secondary="user_branches", back_populates="users")
    orders_as_master = relationship("Order", back_populates="master", foreign_keys="Order.master_id")
    orders_as_operator = relationship("Order", back_populates="operator", foreign_keys="Order.operator_id")
    master_technics = relationship("MasterTechnic", back_populates="user")
    photos = relationship("UserPhoto", back_populates="user")