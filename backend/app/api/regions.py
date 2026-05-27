from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.region import Region
from app.models.department import Department

router = APIRouter(prefix="/regions", tags=["Регионы"])

@router.get("/")
async def list_regions(
    department_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Region).options(selectinload(Region.departments))
    if department_id:
        query = query.join(Region.departments).filter(Department.id == department_id)
    query = query.order_by(Region.name)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/")
async def create_region(
    name: str,
    department_ids: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    region = Region(name=name)
    if department_ids:
        ids = [int(x.strip()) for x in department_ids.split(",") if x.strip()]
        if ids:
            deps = (await db.execute(select(Department).filter(Department.id.in_(ids)))).scalars().all()
            region.departments = deps
    db.add(region)
    await db.commit()
    result = await db.execute(
        select(Region).options(selectinload(Region.departments)).filter(Region.id == region.id)
    )
    return result.scalar_one()

@router.put("/{region_id}")
async def update_region(
    region_id: int,
    name: str = None,
    department_ids: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    region = (await db.execute(select(Region).options(selectinload(Region.departments)).filter(Region.id == region_id))).scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Регион не найден")
    if name is not None: region.name = name
    if department_ids is not None:
        ids = [int(x.strip()) for x in department_ids.split(",") if x.strip()]
        deps = (await db.execute(select(Department).filter(Department.id.in_(ids)))).scalars().all()
        region.departments = deps
    await db.commit()
    return {"ok": True}

@router.delete("/{region_id}")
async def delete_region(region_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.city import City
    region = (await db.execute(select(Region).filter(Region.id == region_id))).scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Регион не найден")
    # Проверяем связанные города
    cities = (await db.execute(select(City).filter(City.region_id == region_id))).scalars().all()
    if cities:
        raise HTTPException(status_code=400, detail=f"Нельзя удалить регион: есть {len(cities)} городов")
    await db.delete(region)
    await db.commit()
    return {"ok": True}