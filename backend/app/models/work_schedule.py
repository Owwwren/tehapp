from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Date, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, date

from app.database import Base


class WorkSchedule(Base):
    __tablename__ = "work_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String(5), nullable=True)  # HH:MM
    end_time = Column(String(5), nullable=True)    # HH:MM
    is_day_off = Column(Boolean, default=False, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.now)

    user = relationship("User", back_populates="work_schedules")