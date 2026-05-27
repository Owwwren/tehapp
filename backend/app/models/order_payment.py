from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class OrderPayment(Base):
    __tablename__ = "order_payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    master_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)  # сумма которую сдал мастер
    percent = Column(Numeric(5, 2), nullable=False, default=0)  # процент расчёта
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # кто подтвердил
    status = Column(String(20), default="confirmed")  # confirmed
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    order = relationship("Order", back_populates="payments")
    master = relationship("User", foreign_keys=[master_id])
    confirmer = relationship("User", foreign_keys=[confirmed_by])