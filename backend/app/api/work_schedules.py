import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date as date_type, datetime, timedelta

from app.database import get_db
from app.models.work_schedule import WorkSchedule
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/work-schedules", tags=["График работы"])


@router.get("/")
async def list_schedules(
    user_id: int = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    branch_id: int = Query(None),
    city_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить график работы."""
    from app.models.branch import Branch
    from app.models.city import City
    from app.models.region import Region
    from app.models.region_department import region_departments

    query = select(WorkSchedule)
    
    if user_id:
        query = query.filter(WorkSchedule.user_id == user_id)
    
    if date_from:
        query = query.filter(WorkSchedule.date >= date_type.fromisoformat(date_from))
    if date_to:
        query = query.filter(WorkSchedule.date <= date_type.fromisoformat(date_to))
    
    if branch_id or city_id or region_id or department_id:
        query = query.join(User, WorkSchedule.user_id == User.id)
        
        joined_branches = False
        joined_cities = False
        
        if branch_id:
            query = query.join(User.branches).filter(Branch.id == branch_id)
            joined_branches = True
        
        if city_id:
            if not joined_branches:
                query = query.join(User.branches)
                joined_branches = True
            query = query.join(City, Branch.city_id == City.id).filter(City.id == city_id)
            joined_cities = True
        
        if region_id:
            if not joined_branches:
                query = query.join(User.branches)
                joined_branches = True
            if not joined_cities:
                query = query.join(City, Branch.city_id == City.id)
                joined_cities = True
            query = query.filter(City.region_id == region_id)
        
        if department_id:
            if not joined_branches:
                query = query.join(User.branches)
                joined_branches = True
            if not joined_cities:
                query = query.join(City, Branch.city_id == City.id)
                joined_cities = True
            query = query.join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
    
    query = query.order_by(WorkSchedule.date, WorkSchedule.user_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/")
async def create_schedule(
    user_id: int,
    date: str = Query(..., description="YYYY-MM-DD"),
    start_time: str = None,
    end_time: str = None,
    is_day_off: bool = False,
    comment: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать или обновить запись графика."""
    parsed_date = date_type.fromisoformat(date)
    
    existing = (await db.execute(
        select(WorkSchedule).filter(
            WorkSchedule.user_id == user_id,
            WorkSchedule.date == parsed_date
        )
    )).scalar_one_or_none()
    
    if existing:
        existing.start_time = start_time
        existing.end_time = end_time
        existing.is_day_off = is_day_off
        existing.comment = comment
        existing.updated_at = datetime.now()
        await db.commit()
        await db.refresh(existing)
        return existing
    
    schedule = WorkSchedule(
        user_id=user_id,
        date=parsed_date,
        start_time=start_time,
        end_time=end_time,
        is_day_off=is_day_off,
        comment=comment,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.post("/copy-week")
async def copy_week(
    from_date: str,
    to_date: str,
    user_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Копировать график с одной недели на другую."""
    from_d = date_type.fromisoformat(from_date)
    to_d = date_type.fromisoformat(to_date)
    
    from_monday = from_d - timedelta(days=from_d.weekday())
    from_sunday = from_monday + timedelta(days=6)
    to_monday = to_d - timedelta(days=to_d.weekday())
    
    query = select(WorkSchedule).filter(
        WorkSchedule.date >= from_monday,
        WorkSchedule.date <= from_sunday,
    )
    if user_id:
        query = query.filter(WorkSchedule.user_id == user_id)
    
    result = await db.execute(query)
    schedules = result.scalars().all()
    
    created = 0
    for s in schedules:
        offset = (s.date - from_monday).days
        new_date = to_monday + timedelta(days=offset)
        
        existing = (await db.execute(
            select(WorkSchedule).filter(
                WorkSchedule.user_id == s.user_id,
                WorkSchedule.date == new_date
            )
        )).scalar_one_or_none()
        
        if not existing:
            new_s = WorkSchedule(
                user_id=s.user_id,
                date=new_date,
                start_time=s.start_time,
                end_time=s.end_time,
                is_day_off=s.is_day_off,
                comment=s.comment,
            )
            db.add(new_s)
            created += 1
    
    await db.commit()
    return {"ok": True, "created": created}


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WorkSchedule).filter(WorkSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    await db.delete(schedule)
    await db.commit()
    return {"ok": True}