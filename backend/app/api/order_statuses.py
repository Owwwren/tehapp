from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.order_status import OrderStatus
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/order-statuses", tags=["Статусы заявок"])


class OrderStatusUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    text_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    sort_order: Optional[int] = None


@router.get("/")
async def list_statuses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OrderStatus).order_by(OrderStatus.sort_order, OrderStatus.id))
    return result.scalars().all()


@router.put("/{status_id}")
async def update_status(status_id: int, data: OrderStatusUpdate, db: AsyncSession = Depends(get_db)):
    status = (await db.execute(select(OrderStatus).filter(OrderStatus.id == status_id))).scalar_one_or_none()
    if not status:
        raise HTTPException(status_code=404, detail="Статус не найден")
    if data.name is not None:
        status.name = data.name
    if data.code is not None:
        status.code = data.code
    if data.color is not None:
        status.color = data.color
    if data.text_color is not None:
        status.text_color = data.text_color
    if data.sort_order is not None:
        status.sort_order = data.sort_order
    await db.commit()
    return {"ok": True}