import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime


from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.utils.security import hash_password
from app.utils.permissions import require_role, ROLE_ADMIN
from app.models.master_technic import MasterTechnic
from app.models.branch import user_branches, Branch
from app.models.user_photo import UserPhoto

router = APIRouter(prefix="/users", tags=["Пользователи"])

UPLOAD_DIR = "uploads/user_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/")
async def list_users(
    branch_id: int = Query(None),
    city_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список пользователей с фильтрами."""
    from app.models.city import City
    from app.models.region import Region
    from app.models.region_department import region_departments

    query = select(User).options(selectinload(User.role), selectinload(User.branches))
    
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
    
    query = query.distinct()
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/available")
async def get_available_masters(
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить мастеров, доступных на указанную дату (не выходной)."""
    from app.models.work_schedule import WorkSchedule
    from app.models.role import Role
    
    parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    
    query = select(User).join(Role).filter(
        Role.code == 'master',
        User.is_active == True
    )
    
    day_off_masters = select(WorkSchedule.user_id).filter(
        WorkSchedule.date == parsed_date,
        WorkSchedule.is_day_off == True
    )
    
    query = query.filter(User.id.not_in(day_off_masters))
    query = query.options(selectinload(User.role), selectinload(User.branches))
    
    result = await db.execute(query)
    masters = result.scalars().all()
    
    master_ids = [m.id for m in masters]
    if master_ids:
        tech_result = await db.execute(
            select(MasterTechnic.user_id, MasterTechnic.technic_id)
            .filter(MasterTechnic.user_id.in_(master_ids))
        )
        technics_map = {}
        for row in tech_result.all():
            if row[0] not in technics_map:
                technics_map[row[0]] = []
            technics_map[row[0]].append(row[1])
        
        for m in masters:
            m._technic_ids = technics_map.get(m.id, [])
    
    return [
        {
            **{c.name: getattr(m, c.name) for c in m.__table__.columns},
            "role": m.role,
            "branches": [{"id": b.id, "name": b.name} for b in m.branches],
            "technic_ids": getattr(m, '_technic_ids', []),
        }
        for m in masters
    ]

@router.post("/")
async def create_user(
    last_name: str,
    first_name: str,
    phone: str,
    password: str,
    role_id: int,
    username: str = None,
    middle_name: str = None,
    branch_ids: str = Query(None, description="ID филиалов через запятую"),
    note: str = None,
    birth_date: str = None,
    telegram_nick: str = None,
    address: str = None,
    passport: str = None,
    salary: float = None,
    commission_percent: float = None,
    cooperation_note: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать пользователя."""
    existing = (await db.execute(select(User).filter(User.phone == phone))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Телефон уже занят")

    user = User(
        last_name=last_name,
        first_name=first_name,
        middle_name=middle_name,
        phone=phone,
        username=username,
        password_hash=hash_password(password),
        role_id=role_id,
        note=note,
        birth_date=datetime.fromisoformat(birth_date) if birth_date else None,
        telegram_nick=telegram_nick,
        address=address,
        passport=passport,
        salary=salary,
        commission_percent=commission_percent,
        cooperation_note=cooperation_note,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    if branch_ids:
        ids = [int(x.strip()) for x in branch_ids.split(",") if x.strip()]
        for bid in ids:
            await db.execute(
                user_branches.insert().values(user_id=user.id, branch_id=bid)
            )
        await db.commit()
    
    return user

@router.put("/{user_id}")
async def update_user(
    user_id: int,
    last_name: str = None,
    first_name: str = None,
    middle_name: str = None,
    phone: str = None,
    username: str = None,
    is_active: bool = None,
    role_id: int = None,
    branch_ids: str = Query(None, description="ID филиалов через запятую"),
    note: str = None,
    birth_date: str = None,
    telegram_nick: str = None,
    address: str = None,
    passport: str = None,
    salary: float = None,
    commission_percent: float = None,
    cooperation_note: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить сотрудника."""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if last_name is not None: user.last_name = last_name
    if first_name is not None: user.first_name = first_name
    if middle_name is not None: user.middle_name = middle_name
    if phone is not None: user.phone = phone
    if username is not None: user.username = username
    if is_active is not None: user.is_active = is_active
    if role_id is not None: user.role_id = role_id
    if note is not None:
        user.note = note if note.strip() != '' else None
    if birth_date is not None: user.birth_date = datetime.fromisoformat(birth_date)
    if telegram_nick is not None: user.telegram_nick = telegram_nick
    if address is not None: user.address = address
    if passport is not None: user.passport = passport
    if salary is not None: user.salary = salary
    if commission_percent is not None: user.commission_percent = commission_percent
    if cooperation_note is not None: user.cooperation_note = cooperation_note
    
    if branch_ids is not None:
        await db.execute(delete(user_branches).where(user_branches.c.user_id == user_id))
        ids = [int(x.strip()) for x in branch_ids.split(",") if x.strip()]
        for bid in ids:
            await db.execute(user_branches.insert().values(user_id=user_id, branch_id=bid))

    await db.commit()
    return {"ok": True}

# ========== Фото сотрудников ==========

@router.get("/photos/{filename}")
async def get_user_photo_file(filename: str):
    from fastapi.responses import FileResponse
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(filepath)


@router.get("/{user_id}/photos")
async def get_user_photos(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserPhoto).filter(UserPhoto.user_id == user_id)
    )
    return result.scalars().all()


@router.post("/{user_id}/photos")
async def upload_user_photo(
    user_id: int,
    photo_type: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    photo = UserPhoto(
        user_id=user_id, photo_type=photo_type,
        filename=filename, filepath=filepath,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.delete("/{user_id}/photos/{photo_id}")
async def delete_user_photo(
    user_id: int, photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserPhoto).filter(UserPhoto.id == photo_id, UserPhoto.user_id == user_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Фото не найдено")
    filepath = os.path.join(UPLOAD_DIR, photo.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    await db.delete(photo)
    await db.commit()
    return {"ok": True}

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(MasterTechnic).filter(MasterTechnic.user_id == user_id))
    await db.delete(user)
    await db.commit()
    return {"ok": True}

@router.post("/{user_id}/technics")
async def set_master_technics(
    user_id: int,
    technic_ids: list[int] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(MasterTechnic).filter(MasterTechnic.user_id == user_id))
    for tid in technic_ids:
        db.add(MasterTechnic(user_id=user_id, technic_id=tid))
    await db.commit()
    return {"ok": True}

@router.get("/{user_id}/technics")
async def get_master_technics(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MasterTechnic.technic_id).filter(MasterTechnic.user_id == user_id)
    )
    return [row[0] for row in result.all()]