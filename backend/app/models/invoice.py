from sqlalchemy import Column, Integer, String, DateTime, Date, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    number = Column(String(50), nullable=False, unique=True)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="draft", nullable=False)  # draft, sent, paid, cancelled
    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    branch = relationship("Branch")
    client = relationship("Client")
    order = relationship("Order")
    creator = relationship("User")