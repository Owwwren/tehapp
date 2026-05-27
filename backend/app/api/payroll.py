from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.payroll import Payroll
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/payroll", tags=["Ведомость"])


@router.get("/")
async def list_payroll(
    branch_id: int = Query(None),
    period: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Зарплатная ведомость."""
    query = select(Payroll).options(
        selectinload(Payroll.user),
        selectinload(Payroll.branch),
    )

    if branch_id:
        query = query.filter(Payroll.branch_id == branch_id)
    if period:
        query = query.filter(Payroll.period == period)

    query = query.order_by(Payroll.id.desc())

    result = await db.execute(query)
    return result.scalars().all()