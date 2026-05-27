from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class OrderStatus(Base):
    __tablename__ = "order_statuses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    code = Column(String(30), unique=True, nullable=False)
    color = Column(String(7), nullable=True)
    text_color = Column(String(7), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_final = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    orders = relationship("Order", back_populates="status")