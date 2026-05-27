from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class OrderComment(Base):
    __tablename__ = "order_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment_type = Column(String(20), nullable=False)  # original / work
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    order = relationship("Order", back_populates="comments")
    user = relationship("User")