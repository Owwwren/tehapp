from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.transaction_category import TransactionCategory

router = APIRouter(prefix="/transaction-categories", tags=["Категории транзакций"])

@router.get("/")
async def list_transaction_categories(
    type_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(TransactionCategory)
    if type_id:
        query = query.filter(TransactionCategory.type_id == type_id)
    query = query.order_by(TransactionCategory.name)
    result = await db.execute(query)
    return result.scalars().all()
@router.post("/")
async def create_transaction_category(name: str, type_id: int, db: AsyncSession = Depends(get_db)):
    tc = TransactionCategory(name=name, type_id=type_id)
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc

@router.put("/{category_id}")
async def update_transaction_category(category_id: int, name: str = None, type_id: int = None, db: AsyncSession = Depends(get_db)):
    tc = (await db.execute(select(TransactionCategory).filter(TransactionCategory.id == category_id))).scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    if name is not None: tc.name = name
    if type_id is not None: tc.type_id = type_id
    await db.commit()
    return {"ok": True}

@router.delete("/{category_id}")
async def delete_transaction_category(category_id: int, db: AsyncSession = Depends(get_db)):
    tc = (await db.execute(select(TransactionCategory).filter(TransactionCategory.id == category_id))).scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    await db.delete(tc)
    await db.commit()
    return {"ok": True}