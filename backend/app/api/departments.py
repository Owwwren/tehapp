from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.department import Department

router = APIRouter(prefix="/departments", tags=["Направления"])

@router.get("/")
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()

@router.post("/")
async def create_department(name: str, code: str, db: AsyncSession = Depends(get_db)):
    dept = Department(name=name, code=code)
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept

@router.put("/{department_id}")
async def update_department(department_id: int, name: str = None, code: str = None, db: AsyncSession = Depends(get_db)):
    dept = (await db.execute(select(Department).filter(Department.id == department_id))).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Направление не найдено")
    if name is not None: dept.name = name
    if code is not None: dept.code = code
    await db.commit()
    return {"ok": True}

@router.delete("/{department_id}")
async def delete_department(department_id: int, db: AsyncSession = Depends(get_db)):
    dept = (await db.execute(select(Department).filter(Department.id == department_id))).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Направление не найдено")
    await db.delete(dept)
    await db.commit()
    return {"ok": True}