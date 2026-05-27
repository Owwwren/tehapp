from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.contact_status import ContactStatus
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/contact-statuses", tags=["Статусы обращений"])


class ContactStatusUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    text_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


@router.get("/")
async def list_contact_statuses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContactStatus).order_by(ContactStatus.name))
    return result.scalars().all()


@router.post("/")
async def create_contact_status(name: str, color: str = None, text_color: str = None, db: AsyncSession = Depends(get_db)):
    cs = ContactStatus(name=name, color=color, text_color=text_color)
    db.add(cs)
    await db.commit()
    await db.refresh(cs)
    return cs


@router.put("/{status_id}")
async def update_contact_status(status_id: int, data: ContactStatusUpdate, db: AsyncSession = Depends(get_db)):
    cs = (await db.execute(select(ContactStatus).filter(ContactStatus.id == status_id))).scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Статус не найден")
    if data.name is not None:
        cs.name = data.name
    if data.color is not None:
        cs.color = data.color
    if data.text_color is not None:
        cs.text_color = data.text_color
    await db.commit()
    return {"ok": True}


@router.delete("/{status_id}")
async def delete_contact_status(status_id: int, db: AsyncSession = Depends(get_db)):
    cs = (await db.execute(select(ContactStatus).filter(ContactStatus.id == status_id))).scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Статус не найден")
    await db.delete(cs)
    await db.commit()
    return {"ok": True}