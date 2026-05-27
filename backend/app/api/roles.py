from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.role import Role

router = APIRouter(prefix="/roles", tags=["Роли"])

@router.get("/")
async def list_roles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Role).order_by(Role.id))
    return result.scalars().all()

@router.post("/")
async def create_role(name: str, code: str, db: AsyncSession = Depends(get_db)):
    role = Role(name=name, code=code)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role

@router.put("/{role_id}")
async def update_role(role_id: int, name: str = None, code: str = None, db: AsyncSession = Depends(get_db)):
    role = (await db.execute(select(Role).filter(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    if name is not None: role.name = name
    if code is not None: role.code = code
    await db.commit()
    return {"ok": True}

@router.delete("/{role_id}")
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db)):
    role = (await db.execute(select(Role).filter(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    # Защита системных ролей
    if role.code in ['admin', 'master', 'operator', 'logist', 'okk']:
        raise HTTPException(status_code=400, detail="Системную роль нельзя удалить")
    await db.delete(role)
    await db.commit()
    return {"ok": True}