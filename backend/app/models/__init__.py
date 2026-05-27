from app.database import Base

# Импорты моделей (чтобы Alembic их видел)
from app.models.role import Role
from app.models.user import User
from app.models.region import Region
from app.models.city import City
from app.models.branch import Branch
from app.models.client import Client
from app.models.technic import Technic
from app.models.order_status import OrderStatus
from app.models.order import Order
from app.models.order_comment import OrderComment
from app.models.transaction_type import TransactionType
from app.models.transaction import Transaction
from app.models.payroll import Payroll
from app.models.invoice import Invoice
from app.models.advertising import Advertising
from app.models.setting import Setting
from app.models.audit_log import AuditLog
from app.models.master_technic import MasterTechnic
from app.models.client_contact import ClientContact
from app.models.order_photo import OrderPhoto
from app.models.transaction_photo import TransactionPhoto
from app.models.order_payment import OrderPayment
from app.models.user_photo import UserPhoto
from app.models.cancel_reason import CancelReason
from app.models.reject_reason import RejectReason
from app.models.department import Department
from app.models.contact_type import ContactType
from app.models.contact_status import ContactStatus
from app.models.factor import Factor
from app.models.transaction_category import TransactionCategory
from app.models.work_schedule import WorkSchedule
from app.models.region_department import region_departments
from .advertising_category import AdvertisingCategory
from .advertising_budget import AdvertisingBudget


__all__ = [
    "Base", "Role", "User", "Region", "City", "Branch",
    "Client", "Technic", "OrderStatus", "Order", "OrderComment",
    "TransactionType", "Transaction", "Payroll", "Invoice",
    "Advertising", "Setting", "AuditLog", "MasterTechnic",
    "ClientContact", "OrderPhoto", "TransactionPhoto",
    "OrderPayment", "UserPhoto", "CancelReason",
    "RejectReason", "Department", "ContactType", "ContactStatus",
    "Factor", "TransactionCategory"
]