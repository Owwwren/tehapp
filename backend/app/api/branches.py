from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.branch import Branch

router = APIRouter(prefix="/branches", tags=["Филиалы"])

@router.get("/")
async def list_branches(
    city_id: int = Query(None),
    region_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Branch)
    if city_id:
        query = query.filter(Branch.city_id == city_id)
    if region_id:
        from app.models.city import City
        city_ids = (await db.execute(select(City.id).filter(City.region_id == region_id))).scalars().all()
        if city_ids:
            query = query.filter(Branch.city_id.in_(city_ids))
        else:
            return []
    query = query.order_by(Branch.name)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/")
async def create_branch(name: str, city_id: int, type: str = "БТ", db: AsyncSession = Depends(get_db)):
    branch = Branch(name=name, city_id=city_id, type=type)
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return branch

@router.put("/{branch_id}")
async def update_branch(branch_id: int, name: str = None, city_id: int = None, type: str = None, db: AsyncSession = Depends(get_db)):
    branch = (await db.execute(select(Branch).filter(Branch.id == branch_id))).scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Филиал не найден")
    if name is not None: branch.name = name
    if city_id is not None: branch.city_id = city_id
    if type is not None: branch.type = type
    await db.commit()
    return {"ok": True}

@router.delete("/{branch_id}")
async def delete_branch(branch_id: int, db: AsyncSession = Depends(get_db)):
    branch = (await db.execute(select(Branch).filter(Branch.id == branch_id))).scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Филиал не найден")
    await db.delete(branch)
    await db.commit()
    return {"ok": True}