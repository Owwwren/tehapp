from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.city import City

router = APIRouter(prefix="/cities", tags=["Города"])

@router.get("/")
async def list_cities(
    region_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(City).options(selectinload(City.region))
    if region_id:
        query = query.filter(City.region_id == region_id)
    query = query.order_by(City.name)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/")
async def create_city(name: str, region_id: int = None, db: AsyncSession = Depends(get_db)):
    city = City(name=name, region_id=region_id)
    db.add(city)
    await db.commit()
    await db.refresh(city)
    return city

@router.put("/{city_id}")
async def update_city(city_id: int, name: str = None, region_id: int = None, db: AsyncSession = Depends(get_db)):
    city = (await db.execute(select(City).filter(City.id == city_id))).scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="Город не найден")
    if name is not None: city.name = name
    if region_id is not None: city.region_id = region_id
    await db.commit()
    return {"ok": True}

@router.delete("/{city_id}")
async def delete_city(city_id: int, db: AsyncSession = Depends(get_db)):
    city = (await db.execute(select(City).filter(City.id == city_id))).scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="Город не найден")
    # Проверяем связанные филиалы
    from app.models.branch import Branch
    branches = (await db.execute(select(Branch).filter(Branch.city_id == city_id))).scalars().all()
    if branches:
        raise HTTPException(status_code=400, detail=f"Нельзя удалить город: есть {len(branches)} филиалов")
    await db.delete(city)
    await db.commit()
    return {"ok": True}