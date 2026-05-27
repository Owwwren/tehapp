from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.technic import Technic

router = APIRouter(prefix="/technics", tags=["Типы техники"])

@router.get("/")
async def list_technics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Technic).order_by(Technic.name))
    return result.scalars().all()

@router.post("/")
async def create_technic(name: str, code: str = None, db: AsyncSession = Depends(get_db)):
    tech = Technic(name=name, code=code)
    db.add(tech)
    await db.commit()
    await db.refresh(tech)
    return tech

@router.put("/{technic_id}")
async def update_technic(technic_id: int, name: str = None, code: str = None, db: AsyncSession = Depends(get_db)):
    tech = (await db.execute(select(Technic).filter(Technic.id == technic_id))).scalar_one_or_none()
    if not tech:
        raise HTTPException(status_code=404, detail="Тип техники не найден")
    if name is not None: tech.name = name
    if code is not None: tech.code = code
    await db.commit()
    return {"ok": True}

@router.delete("/{technic_id}")
async def delete_technic(technic_id: int, db: AsyncSession = Depends(get_db)):
    tech = (await db.execute(select(Technic).filter(Technic.id == technic_id))).scalar_one_or_none()
    if not tech:
        raise HTTPException(status_code=404, detail="Тип техники не найден")
    await db.delete(tech)
    await db.commit()
    return {"ok": True}