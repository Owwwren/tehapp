from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.factor import Factor

router = APIRouter(prefix="/factors", tags=["Факторы"])

@router.get("/")
async def list_factors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Factor).order_by(Factor.name))
    return result.scalars().all()

@router.post("/")
async def create_factor(name: str, db: AsyncSession = Depends(get_db)):
    factor = Factor(name=name)
    db.add(factor)
    await db.commit()
    await db.refresh(factor)
    return factor

@router.put("/{factor_id}")
async def update_factor(factor_id: int, name: str = None, db: AsyncSession = Depends(get_db)):
    factor = (await db.execute(select(Factor).filter(Factor.id == factor_id))).scalar_one_or_none()
    if not factor:
        raise HTTPException(status_code=404, detail="Фактор не найден")
    if name is not None: factor.name = name
    await db.commit()
    return {"ok": True}

@router.delete("/{factor_id}")
async def delete_factor(factor_id: int, db: AsyncSession = Depends(get_db)):
    factor = (await db.execute(select(Factor).filter(Factor.id == factor_id))).scalar_one_or_none()
    if not factor:
        raise HTTPException(status_code=404, detail="Фактор не найден")
    await db.delete(factor)
    await db.commit()
    return {"ok": True}