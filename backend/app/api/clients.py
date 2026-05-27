from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.dependencies import get_current_user
from app.models.order import Order

router = APIRouter(prefix="/clients", tags=["Клиенты"])


@router.post("/")
async def create_client(
    name: str,
    phone: str,
    city_id: int = None,
    branch_id: int = None,
    address: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (await db.execute(select(Client).filter(Client.phone == phone))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Клиент с таким телефоном уже существует")

    client = Client(
        name=name, phone=phone, city_id=city_id, branch_id=branch_id, address=address,
        blacklisted=False, total_orders=0, total_earned=0,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client

@router.get("/")
async def list_clients(
    search: str = Query(None),
    branch_id: int = Query(None),
    city_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.city import City
    from app.models.region import Region
    from app.models.region_department import region_departments
    from app.models.branch import Branch

    query = select(Client).options(selectinload(Client.branch))
    if search:
        query = query.filter(
            (Client.name.ilike(f"%{search}%")) |
            (Client.phone.ilike(f"%{search}%"))
        )
    if branch_id:
        query = query.filter(Client.branch_id == branch_id)
    if city_id:
        query = query.filter(Client.city_id == city_id)
    if region_id:
        city_ids = (await db.execute(select(City.id).filter(City.region_id == region_id))).scalars().all()
        if city_ids:
            query = query.filter(Client.city_id.in_(city_ids))
        else:
            return []
    if department_id:
        city_ids = (await db.execute(
            select(City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
        )).scalars().all()
        if city_ids:
            query = query.filter(Client.city_id.in_(city_ids))
        else:
            return []
    query = query.order_by(Client.id.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{client_id}")
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.city import City
    result = await db.execute(select(Client).options(selectinload(Client.city).selectinload(City.region), selectinload(Client.branch)).filter(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return client

@router.put("/{client_id}")
async def update_client(
    client_id: int,
    name: str = None, phone: str = None, address: str = None,
    city_id: int = None, branch_id: int = None,
    blacklisted: bool = None, notes: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).filter(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    if name is not None: client.name = name
    if phone is not None: client.phone = phone
    if address is not None: client.address = address
    if city_id is not None: client.city_id = city_id
    if branch_id is not None: client.branch_id = branch_id
    if notes is not None: client.notes = notes
    if blacklisted is not None: client.blacklisted = blacklisted
    await db.commit()
    return {"ok": True}

@router.put("/{client_id}/blacklist")
async def toggle_blacklist(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).filter(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    client.blacklisted = not client.blacklisted
    await db.commit()
    return {"blacklisted": client.blacklisted}

@router.get("/{client_id}/finance")
async def client_finance(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.client_id == client_id))
    orders = result.scalars().all()
    total = sum(float(o.price_total or 0) for o in orders)
    returned = 0
    return {"turnover": round(total, 0), "returned": round(returned, 0), "balance": round(total - returned, 0)}

@router.put("/{client_id}/update-returned")
async def update_returned(
    client_id: int, amount: float,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).filter(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client: raise HTTPException(status_code=404)
    from decimal import Decimal
    client.returned = (client.returned or 0) + Decimal(str(amount))
    client.total_earned = (client.total_earned or 0) - Decimal(str(amount))
    await db.commit()
    return {"ok": True, "returned": client.returned, "total_earned": client.total_earned}

@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orders_count = (await db.execute(select(func.count(Order.id)).filter(Order.client_id == client_id))).scalar()
    if orders_count > 0:
        raise HTTPException(status_code=409, detail=f"Нельзя удалить клиента: у него {orders_count} заявок")
    result = await db.execute(select(Client).filter(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client: raise HTTPException(status_code=404, detail="Клиент не найден")
    await db.delete(client)
    await db.commit()
    return {"ok": True}