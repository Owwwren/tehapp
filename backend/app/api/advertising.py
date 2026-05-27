# backend/app/api/advertising.py
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
from typing import Optional

from app.database import get_db
from app.models.advertising import Advertising
from app.models.advertising_category import AdvertisingCategory
from pydantic import BaseModel
import os, uuid

router = APIRouter(prefix="/advertising", tags=["Реклама - Расходы"])

UPLOAD_DIR = "uploads/advertising"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ExpenseCreate(BaseModel):
    category_id: Optional[int] = None
    branch_id: Optional[int] = None
    amount: float
    period_start: str
    period_end: str
    status: str = "planned"
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    branch_id: Optional[int] = None
    amount: Optional[float] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
async def list_expenses(
    category_id: int = Query(None),
    branch_id: int = Query(None),
    status: str = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Advertising)
    if category_id:
        query = query.filter(Advertising.category_id == category_id)
    if branch_id:
        query = query.filter(Advertising.branch_id == branch_id)
    if status:
        query = query.filter(Advertising.status == status)
    if date_from:
        query = query.filter(Advertising.period_start >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Advertising.period_end <= date.fromisoformat(date_to))

    query = query.order_by(Advertising.period_start.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def expense_stats(
    year: int = Query(None),
    month: int = Query(None),
    category_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(
        Advertising.category_id,
        func.sum(Advertising.amount).label("total"),
        func.count(Advertising.id).label("count"),
    ).filter(Advertising.status == "paid")

    if category_id:
        query = query.filter(Advertising.category_id == category_id)
    if year and month:
        query = query.filter(
            func.extract('year', Advertising.period_start) == year,
            func.extract('month', Advertising.period_start) == month,
        )

    query = query.group_by(Advertising.category_id)
    result = await db.execute(query)

    stats = []
    for row in result.all():
        cat = (await db.execute(
            select(AdvertisingCategory).filter(AdvertisingCategory.id == row[0])
        )).scalar_one_or_none()
        stats.append({
            "category_id": row[0],
            "category_name": cat.name if cat else "—",
            "total": float(row[1] or 0),
            "count": row[2],
        })

    return stats


@router.post("/")
async def create_expense(data: ExpenseCreate, db: AsyncSession = Depends(get_db)):
    expense = Advertising(
        category_id=data.category_id,
        branch_id=data.branch_id if data.branch_id else None,
        amount=data.amount,
        period_start=date.fromisoformat(data.period_start),
        period_end=date.fromisoformat(data.period_end),
        status=data.status,
        notes=data.notes,
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.put("/{expense_id}")
async def update_expense(expense_id: int, data: ExpenseUpdate, db: AsyncSession = Depends(get_db)):
    expense = (await db.execute(
        select(Advertising).filter(Advertising.id == expense_id)
    )).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Расход не найден")

    if data.category_id is not None:
        expense.category_id = data.category_id
    if data.branch_id is not None:
        expense.branch_id = data.branch_id if data.branch_id else None
    if data.amount is not None:
        expense.amount = data.amount
    if data.period_start is not None:
        expense.period_start = date.fromisoformat(data.period_start)
    if data.period_end is not None:
        expense.period_end = date.fromisoformat(data.period_end)
    if data.status is not None:
        expense.status = data.status
    if data.notes is not None:
        expense.notes = data.notes

    await db.commit()
    return {"ok": True}


@router.delete("/{expense_id}")
async def delete_expense(expense_id: int, db: AsyncSession = Depends(get_db)):
    expense = (await db.execute(
        select(Advertising).filter(Advertising.id == expense_id)
    )).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Расход не найден")

    if expense.document_path:
        filepath = os.path.join(UPLOAD_DIR, expense.document_path)
        if os.path.exists(filepath):
            os.remove(filepath)

    await db.delete(expense)
    await db.commit()
    return {"ok": True}


@router.post("/{expense_id}/document")
async def upload_document(expense_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    expense = (await db.execute(
        select(Advertising).filter(Advertising.id == expense_id)
    )).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Расход не найден")

    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    expense.document_path = filename
    await db.commit()
    return {"ok": True, "filename": filename}