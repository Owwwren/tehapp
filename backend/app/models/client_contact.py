from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class ClientContact(Base):
    __tablename__ = "client_contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    type = Column(String(20), nullable=False, default="звонок")  # звонок / сообщение
    direction = Column(String(20), nullable=False, default="входящий")  # входящий / исходящий
    status = Column(String(50), nullable=True)  # принял / отказ / перенос / ...
    notes = Column(Text, nullable=True)  # примечания КЦ
    technic_type_id = Column(Integer, ForeignKey("technics.id"), nullable=True)
    department = Column(String(50), nullable=True, default="БТ")  # отдел
    advertisement = Column(String(100), nullable=True)  # реклама
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)  # связь с заявкой
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    client = relationship("Client", back_populates="contacts")
    technic_type = relationship("Technic")
    operator = relationship("User", foreign_keys=[operator_id])
    order = relationship("Order", back_populates="contacts")

    advertising_category_id = Column(Integer, ForeignKey("advertising_categories.id"), nullable=True)
    advertising_category = relationship("AdvertisingCategory")
    sort_order = Column(Integer, default=0, nullable=True)