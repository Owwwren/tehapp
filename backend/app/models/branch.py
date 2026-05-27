from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base

# Промежуточная таблица для связи пользователей и филиалов
user_branches = Table(
    "user_branches",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("branch_id", Integer, ForeignKey("branches.id"), nullable=False),
)


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    type = Column(String(10), nullable=False)  # БТ или КЦ
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=True)

    city = relationship("City", back_populates="branches")
    users = relationship("User", secondary="user_branches", back_populates="branches")
    orders = relationship("Order", back_populates="branch", viewonly=True)