# transaction_category.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class TransactionCategory(Base):
    __tablename__ = "transaction_categories"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    type_id = Column(Integer, ForeignKey("transaction_types.id"), nullable=False)
    type = relationship("TransactionType")