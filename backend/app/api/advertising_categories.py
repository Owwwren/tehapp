# backend/app/api/advertising_categories.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.advertising_category import AdvertisingCategory
from pydantic import BaseModel

router = APIRouter(prefix="/advertising-categories", tags=["Реклама - Категории"])


class CategoryCreate(BaseModel):
    parent_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    monthly_budget: Optional[float] = None
    description: Optional[str] = None
    show_in_order: bool = True
    is_active: bool = True
    month_year: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    monthly_budget: Optional[float] = None
    description: Optional[str] = None
    show_in_order: Optional[bool] = None
    is_active: Optional[bool] = None
    month_year: Optional[str] = None


@router.get("/")
async def list_categories(
    month_year: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(AdvertisingCategory).order_by(AdvertisingCategory.level, AdvertisingCategory.name)
    if month_year:
        query = query.filter(AdvertisingCategory.month_year == month_year)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/tree")
async def get_tree(
    month_year: str = Query(None),
    show_in_order_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(AdvertisingCategory).order_by(AdvertisingCategory.level, AdvertisingCategory.name)
    if show_in_order_only:
        query = query.filter(AdvertisingCategory.show_in_order == True)
    if month_year:
        query = query.filter(AdvertisingCategory.month_year == month_year)
    result = await db.execute(query)
    categories = result.scalars().all()
    
    def build_tree(parent_id=None):
        return [
            {
                "id": c.id,
                "parent_id": c.parent_id,
                "name": c.name,
                "code": c.code,
                "level": c.level,
                "monthly_budget": float(c.monthly_budget) if c.monthly_budget else None,
                "description": c.description,
                "show_in_order": c.show_in_order,
                "month_year": c.month_year,
                "is_active": c.is_active,
                "children": build_tree(c.id),
            }
            for c in categories if c.parent_id == parent_id
        ]
    
    return build_tree()


@router.post("/")
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    level = 0
    if data.parent_id:
        parent = (await db.execute(
            select(AdvertisingCategory).filter(AdvertisingCategory.id == data.parent_id)
        )).scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Родительская категория не найдена")
        level = parent.level + 1
    
    category = AdvertisingCategory(
        parent_id=data.parent_id,
        name=data.name,
        code=data.code,
        monthly_budget=data.monthly_budget,
        description=data.description,
        show_in_order=data.show_in_order,
        month_year=data.month_year,
        level=level,
        is_active=data.is_active,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.put("/{category_id}")
async def update_category(category_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    category = (await db.execute(
        select(AdvertisingCategory).filter(AdvertisingCategory.id == category_id)
    )).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    if data.name is not None:
        category.name = data.name
    if data.code is not None:
        category.code = data.code
    if data.monthly_budget is not None:
        category.monthly_budget = data.monthly_budget
    if data.description is not None:
        category.description = data.description
    if data.show_in_order is not None:
        category.show_in_order = data.show_in_order
    if data.is_active is not None:
        category.is_active = data.is_active
    if data.month_year is not None:
        category.month_year = data.month_year
    
    await db.commit()
    return {"ok": True}


@router.delete("/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = (await db.execute(
        select(AdvertisingCategory).filter(AdvertisingCategory.id == category_id)
    )).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    children = (await db.execute(
        select(AdvertisingCategory).filter(AdvertisingCategory.parent_id == category_id)
    )).scalars().all()
    if children:
        raise HTTPException(status_code=400, detail="Сначала удалите дочерние категории")
    
    await db.delete(category)
    await db.commit()
    return {"ok": True}


@router.post("/copy-month")
async def copy_month(
    from_month: str,
    to_month: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AdvertisingCategory).filter(AdvertisingCategory.month_year == from_month)
    )
    categories = result.scalars().all()
    
    if not categories:
        raise HTTPException(status_code=404, detail="Нет категорий за указанный месяц")
    
    existing = (await db.execute(
        select(AdvertisingCategory).filter(AdvertisingCategory.month_year == to_month)
    )).scalars().all()
    for c in existing:
        await db.delete(c)
    
    id_map = {}
    for cat in sorted(categories, key=lambda c: c.level):
        new_cat = AdvertisingCategory(
            name=cat.name,
            code=cat.code,
            monthly_budget=cat.monthly_budget,
            description=cat.description,
            show_in_order=cat.show_in_order,
            month_year=to_month,
            level=cat.level,
            is_active=cat.is_active,
            parent_id=id_map.get(cat.parent_id),
        )
        db.add(new_cat)
        await db.flush()
        id_map[cat.id] = new_cat.id
    
    await db.commit()
    return {"ok": True, "copied": len(id_map)}