from sqlalchemy import Column, Integer, ForeignKey, Table
from app.database import Base

region_departments = Table(
    'region_departments',
    Base.metadata,
    Column('region_id', Integer, ForeignKey('regions.id'), primary_key=True),
    Column('department_id', Integer, ForeignKey('departments.id'), primary_key=True),
)