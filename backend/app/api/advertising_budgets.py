# backend/app/api/advertising_budgets.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.advertising_budget import AdvertisingBudget
from pydantic import BaseModel

router = APIRouter(prefix="/advertising-budgets", tags=["Реклама - Бюджеты"])


class BudgetCreate(BaseModel):
    year: int
    month: int
    amount: float
    notes: Optional[str] = None


class BudgetUpdate(BaseModel):
    amount: Optional[float] = None
    notes: Optional[str] = None


@router.get("/")
async def list_budgets(
    year: int = Query(None),
    month: int = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(AdvertisingBudget)
    if year:
        query = query.filter(AdvertisingBudget.year == year)
    if month:
        query = query.filter(AdvertisingBudget.month == month)
    query = query.order_by(AdvertisingBudget.year.desc(), AdvertisingBudget.month.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/")
async def create_budget(data: BudgetCreate, db: AsyncSession = Depends(get_db)):
    # Проверка: уже есть бюджет за этот месяц
    existing = (await db.execute(
        select(AdvertisingBudget).filter(
            AdvertisingBudget.year == data.year,
            AdvertisingBudget.month == data.month,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Бюджет за этот месяц уже существует")

    budget = AdvertisingBudget(
        year=data.year,
        month=data.month,
        amount=data.amount,
        notes=data.notes,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.put("/{budget_id}")
async def update_budget(budget_id: int, data: BudgetUpdate, db: AsyncSession = Depends(get_db)):
    budget = (await db.execute(
        select(AdvertisingBudget).filter(AdvertisingBudget.id == budget_id)
    )).scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Бюджет не найден")

    if data.amount is not None:
        budget.amount = data.amount
    if data.notes is not None:
        budget.notes = data.notes

    await db.commit()
    return {"ok": True}


@router.delete("/{budget_id}")
async def delete_budget(budget_id: int, db: AsyncSession = Depends(get_db)):
    budget = (await db.execute(
        select(AdvertisingBudget).filter(AdvertisingBudget.id == budget_id)
    )).scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Бюджет не найден")

    await db.delete(budget)
    await db.commit()
    return {"ok": True}