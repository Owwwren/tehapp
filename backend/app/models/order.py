from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey, BigInteger, Date
from app.models.advertising_category import AdvertisingCategory
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    address = Column(Text, nullable=False)
    phone = Column(String(20), nullable=False)
    technic_type_id = Column(Integer, ForeignKey("technics.id"), nullable=True)
    description_original = Column(Text, nullable=False)
    description_work = Column(Text, nullable=True)
    status_id = Column(Integer, ForeignKey("order_statuses.id"), nullable=False)
    master_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scheduled_time = Column(DateTime, nullable=True)
    completion_date = Column(Date, nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    price_total = Column(Numeric(10, 2), nullable=True)
    price_prepaid = Column(Numeric(10, 2), nullable=True)
    price_remainder = Column(Numeric(10, 2), nullable=True)
    price_parts = Column(Numeric(10, 2), nullable=True)
    price_net = Column(Numeric(10, 2), nullable=True)
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_group_id = Column(Integer, nullable=True)
    source = Column(String(50), nullable=True)
    
    okk_checked = Column(Boolean, default=False, nullable=True)
    okk_rating = Column(Integer, nullable=True)
    okk_comment = Column(Text, nullable=True)
    okk_contract_left = Column(Boolean, nullable=True)
    okk_tech_works = Column(String(20), nullable=True)
    okk_works_match = Column(String(20), nullable=True)
    okk_master_phone_left = Column(Boolean, nullable=True)
    okk_client_amount = Column(Numeric(10, 2), nullable=True)
    okk_warranty_days = Column(Integer, nullable=True, default=14)
    okk_satisfied = Column(String(20), nullable=True)
    
    # Таймлайн статусов
    assigned_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    in_work_at = Column(DateTime, nullable=True)
    out_at = Column(DateTime, nullable=True)
    sd_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.now)

    client = relationship("Client", back_populates="orders")
    status = relationship("OrderStatus", back_populates="orders")
    technic_type = relationship("Technic", back_populates="orders")
    master = relationship("User", back_populates="orders_as_master", foreign_keys=[master_id])
    operator = relationship("User", back_populates="orders_as_operator", foreign_keys=[operator_id])
    comments = relationship("OrderComment", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("OrderPayment", back_populates="order", cascade="all, delete-orphan")
    city = relationship("City", back_populates="orders", viewonly=True)
    branch = relationship("Branch", back_populates="orders", viewonly=True)
    contacts = relationship("ClientContact", back_populates="order")

    advertising_category_id = Column(Integer, ForeignKey("advertising_categories.id"), nullable=True)
    advertising_category = relationship("AdvertisingCategory")