from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.cancel_reason import CancelReason

router = APIRouter(prefix="/cancel-reasons", tags=["Причины отмен"])

@router.get("/")
async def list_cancel_reasons(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CancelReason).order_by(CancelReason.name))
    return result.scalars().all()

@router.post("/")
async def create_cancel_reason(name: str, db: AsyncSession = Depends(get_db)):
    reason = CancelReason(name=name)
    db.add(reason)
    await db.commit()
    await db.refresh(reason)
    return reason

@router.put("/{reason_id}")
async def update_cancel_reason(reason_id: int, name: str = None, db: AsyncSession = Depends(get_db)):
    reason = (await db.execute(select(CancelReason).filter(CancelReason.id == reason_id))).scalar_one_or_none()
    if not reason:
        raise HTTPException(status_code=404, detail="Причина не найдена")
    if name is not None: reason.name = name
    await db.commit()
    return {"ok": True}

@router.delete("/{reason_id}")
async def delete_cancel_reason(reason_id: int, db: AsyncSession = Depends(get_db)):
    reason = (await db.execute(select(CancelReason).filter(CancelReason.id == reason_id))).scalar_one_or_none()
    if not reason:
        raise HTTPException(status_code=404, detail="Причина не найдена")
    await db.delete(reason)
    await db.commit()
    return {"ok": True}