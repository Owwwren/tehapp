from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.contact_type import ContactType

router = APIRouter(prefix="/contact-types", tags=["Типы обращений"])

@router.get("/")
async def list_contact_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContactType).order_by(ContactType.name))
    return result.scalars().all()

@router.post("/")
async def create_contact_type(name: str, db: AsyncSession = Depends(get_db)):
    ct = ContactType(name=name)
    db.add(ct)
    await db.commit()
    await db.refresh(ct)
    return ct

@router.put("/{type_id}")
async def update_contact_type(type_id: int, name: str = None, db: AsyncSession = Depends(get_db)):
    ct = (await db.execute(select(ContactType).filter(ContactType.id == type_id))).scalar_one_or_none()
    if not ct:
        raise HTTPException(status_code=404, detail="Тип не найден")
    if name is not None: ct.name = name
    await db.commit()
    return {"ok": True}

@router.delete("/{type_id}")
async def delete_contact_type(type_id: int, db: AsyncSession = Depends(get_db)):
    ct = (await db.execute(select(ContactType).filter(ContactType.id == type_id))).scalar_one_or_none()
    if not ct:
        raise HTTPException(status_code=404, detail="Тип не найден")
    await db.delete(ct)
    await db.commit()
    return {"ok": True}