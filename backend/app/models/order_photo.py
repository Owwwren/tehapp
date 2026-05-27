from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class OrderPhoto(Base):
    __tablename__ = "order_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    photo_type = Column(String(20), nullable=False)  # contract, receipt
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    order = relationship("Order")