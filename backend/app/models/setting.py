from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone

from app.database import Base


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=True, onupdate=lambda: datetime.now(timezone.utc))