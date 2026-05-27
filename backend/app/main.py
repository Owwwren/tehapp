from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api import auth, users, orders, clients, branches, cities, client_contacts
from app.api import statistics, transactions, payroll, invoices, advertising, order_payments
from app.api import settings as settings_router
from app.api import regions, departments, technics, order_statuses, cancel_reasons, reject_reasons
from app.api import contact_types, contact_statuses, factors, transaction_categories, roles
from app.api import advertising_categories, advertising, advertising_budgets
from app.middleware.sanitize import SanitizeMiddleware
from app.api.work_schedules import router as work_schedules_router

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="CRM Бытовая техника", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SanitizeMiddleware)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(clients.router)
app.include_router(statistics.router)
app.include_router(transactions.router)
app.include_router(payroll.router)
app.include_router(invoices.router)
app.include_router(advertising.router)
app.include_router(settings_router.router)
app.include_router(branches.router)
app.include_router(cities.router)
app.include_router(client_contacts.router)
app.include_router(order_payments.router)
app.include_router(regions.router)
app.include_router(departments.router)
app.include_router(technics.router)
app.include_router(order_statuses.router)
app.include_router(cancel_reasons.router)
app.include_router(reject_reasons.router)
app.include_router(contact_types.router)
app.include_router(contact_statuses.router)
app.include_router(factors.router)
app.include_router(transaction_categories.router)
app.include_router(roles.router)
app.include_router(advertising_categories.router)
app.include_router(advertising.router)
app.include_router(advertising_budgets.router)
app.include_router(work_schedules_router)

@app.get("/")
def root():
    return {"message": "CRM API работает"}


@app.get("/health")
def health():
    return {"status": "ok"}