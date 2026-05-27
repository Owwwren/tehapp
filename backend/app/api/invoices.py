from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, date

from app.database import get_db
from app.models.invoice import Invoice
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/invoices", tags=["Счета"])


@router.get("/")
async def list_invoices(
    branch_id: int = Query(None),
    status: str = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список счетов."""
    query = select(Invoice).options(
        selectinload(Invoice.branch),
        selectinload(Invoice.client),
        selectinload(Invoice.creator),
    )

    if branch_id:
        query = query.filter(Invoice.branch_id == branch_id)
    if status:
        query = query.filter(Invoice.status == status)

    query = query.order_by(Invoice.id.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/")
async def create_invoice(
    branch_id: int,
    number: str,
    amount: float,
    client_id: int = None,
    description: str = None,
    due_date: date = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать счёт."""
    invoice = Invoice(
        branch_id=branch_id,
        number=number,
        amount=amount,
        client_id=client_id,
        description=description,
        due_date=due_date,
        status="draft",
        created_by=current_user.id,
        created_at=datetime.now(),
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return invoice