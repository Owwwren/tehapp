from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    period = Column(String(7), nullable=False)  # 2026-05
    fixed_salary = Column(Numeric(10, 2), default=0, nullable=False)
    bonus = Column(Numeric(10, 2), default=0, nullable=False)
    total = Column(Numeric(10, 2), default=0, nullable=False)
    paid = Column(Boolean, default=False, nullable=False)
    paid_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    branch = relationship("Branch")