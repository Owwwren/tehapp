from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class MasterTechnic(Base):
    __tablename__ = "master_technics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    technic_id = Column(Integer, ForeignKey("technics.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="master_technics")
    technic = relationship("Technic", back_populates="masters")