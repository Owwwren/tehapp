import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import select, func, cast, Date as SQLDate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, date as date_type
from fastapi.responses import FileResponse
from typing import Optional

from app.database import get_db
from app.models.order import Order
from app.models.order_comment import OrderComment
from app.models.user import User
from app.dependencies import get_current_user
from app.models.order_photo import OrderPhoto
from app.models.client_contact import ClientContact
from app.models.client import Client
from app.models.city import City

router = APIRouter(prefix="/orders", tags=["Заявки"])
UPLOAD_DIR = "uploads/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ========== GET ==========
@router.get("/statuses")
async def get_statuses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.order_status import OrderStatus
    result = await db.execute(select(OrderStatus).order_by(OrderStatus.id))
    return result.scalars().all()

@router.get("/")
async def list_orders(
    client_id: int = Query(None),
    status_id: int = Query(None),
    master_id: int = Query(None),
    city_id: int = Query(None),
    branch_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    scheduled_date: str = Query(None),
    technic_type_id: int = Query(None),
    search: str = Query(None),
    dt_type: str = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    sort: str = Query(None),
    confirmed: str = Query(None),
    factor: str = Query(None),
    cancel_reason: str = Query(None),
    phone: str = Query(None),
    address: str = Query(None),
    advertising_category_id: int = Query(None),
):
    from app.models.client import Client
    from app.models.city import City
    
    query = select(Order).options(
        selectinload(Order.client),
        selectinload(Order.status),
        selectinload(Order.master),
        selectinload(Order.technic_type),
        selectinload(Order.payments),
        selectinload(Order.city).selectinload(City.region),
        selectinload(Order.branch),
    )
    if phone:
        query = query.filter(Order.phone.ilike(f"%{phone}%"))
    if address:
        query = query.filter(Order.address.ilike(f"%{address}%"))
    if status_id:
        query = query.filter(Order.status_id == status_id)
    if master_id:
        query = query.filter(Order.master_id == master_id)
    if city_id:
        query = query.filter(Order.city_id == city_id)
    if branch_id:
        query = query.filter(Order.branch_id == branch_id)
    if technic_type_id:
        query = query.filter(Order.technic_type_id == technic_type_id)
    if client_id:
        query = query.filter(Order.client_id == client_id)
    if advertising_category_id:
        query = query.filter(Order.advertising_category_id == advertising_category_id)
    
    # Фильтр по региону
    if region_id:
        query = query.join(City, Order.city_id == City.id).filter(City.region_id == region_id)
    
    # Фильтр по направлению
    if department_id:
        from app.models.region import Region
        from app.models.region_department import region_departments
        query = query.join(City, Order.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
    
    if search:
        if search.isdigit():
            query = query.filter(Order.id == int(search))
        else:
            query = query.outerjoin(Client, Order.client_id == Client.id).filter(
                (Client.name.ilike(f"%{search}%")) |
                (Order.address.ilike(f"%{search}%")) |
                (Order.phone.ilike(f"%{search}%"))
            )
    
    if scheduled_date:
        parsed_date = date_type.fromisoformat(scheduled_date)
        query = query.filter(cast(Order.scheduled_time, SQLDate) == parsed_date)
    
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            if dt_type == 'scheduled_time':
                query = query.filter(Order.scheduled_time >= df)
            elif dt_type == 'completed_at':
                query = query.filter(Order.status_id == 5, Order.completed_at >= df)
            else:
                query = query.filter(Order.created_at >= df)
        except ValueError:
            pass
    
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            if dt_type == 'scheduled_time':
                query = query.filter(Order.scheduled_time <= dt)
            elif dt_type == 'completed_at':
                query = query.filter(Order.status_id == 5, Order.completed_at <= dt)
            else:
                query = query.filter(Order.created_at <= dt)
        except ValueError:
            pass

    if confirmed == 'yes':
        query = query.filter(Order.payments.any())
    elif confirmed == 'no':
        query = query.filter(~Order.payments.any())
    if cancel_reason:
        query = query.filter(Order.description_work.ilike(f"%[ОТКАЗ]%{cancel_reason}%"))
    if factor:
        query = query.filter(Order.source == factor)
    if sort == 'id_asc':
        query = query.order_by(Order.id.asc())
    elif sort == 'date_desc':
        query = query.order_by(Order.scheduled_time.desc())
    elif sort == 'date_asc':
        query = query.order_by(Order.scheduled_time.asc())
    elif sort == 'remainder_desc':
        query = query.order_by(Order.price_remainder.desc().nullslast())
    elif sort == 'remainder_asc':
        query = query.order_by(Order.price_remainder.asc().nullslast())
    else:
        query = query.order_by(Order.id.desc())
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/today")
async def today_orders(
    master_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = select(Order).options(
        selectinload(Order.client), selectinload(Order.status),
        selectinload(Order.master), selectinload(Order.technic_type),
    ).filter(Order.scheduled_time >= today)
    if master_id:
        query = query.filter(Order.master_id == master_id)
    query = query.order_by(Order.scheduled_time.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/calendar")
async def orders_calendar(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import date
    today = date.today()
    y = year or today.year
    m = month or today.month
    active_statuses = [1, 2, 3, 4, 13, 14]
    start_date = date(y, m, 1)
    if m == 12:
        end_date = date(y + 1, 1, 1)
    else:
        end_date = date(y, m + 1, 1)
    result = await db.execute(
        select(
            cast(Order.scheduled_time, SQLDate).label("day"),
            func.count(Order.id).label("count")
        )
        .filter(
            cast(Order.scheduled_time, SQLDate) >= start_date,
            cast(Order.scheduled_time, SQLDate) < end_date,
            Order.status_id.in_(active_statuses)
        )
        .group_by(cast(Order.scheduled_time, SQLDate))
        .order_by("day")
    )
    rows = result.all()
    return [{"day": str(row.day), "count": row.count} for row in rows]


@router.get("/photos/{filename}")
async def get_photo_file(filename: str):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(filepath)

@router.get("/stats")
async def orders_stats(
    date_from: str = Query(None),
    date_to: str = Query(None),
    city_id: int = Query(None),
    master_id: int = Query(None),
    status_id: int = Query(None),
    technic_type_id: int = Query(None),
    branch_id: int = Query(None),
    factor: str = Query(None),
    cancel_reason: str = Query(None),
    confirmed: str = Query(None),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.order_payment import OrderPayment
    query = select(Order)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            query = query.filter(Order.scheduled_time >= df)
        except ValueError: pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            query = query.filter(Order.scheduled_time <= dt)
        except ValueError: pass
    if city_id:
        query = query.filter(Order.city_id == city_id)
    if master_id:
        query = query.filter(Order.master_id == master_id)
    if status_id:
        query = query.filter(Order.status_id == status_id)
    if technic_type_id:
        query = query.filter(Order.technic_type_id == technic_type_id)
    if branch_id:
        query = query.filter(Order.branch_id == branch_id)
    if factor:
        query = query.filter(Order.source == factor)
    if cancel_reason:
        query = query.filter(Order.description_work.ilike(f"%[ОТКАЗ]%{cancel_reason}%"))
    if confirmed == 'yes':
        query = query.filter(Order.payments.any())
    elif confirmed == 'no':
        query = query.filter(~Order.payments.any())
    if search:
        if search.isdigit():
            query = query.filter(Order.id == int(search))
        else:
            query = query.outerjoin(Client, Order.client_id == Client.id).filter(
                (Client.name.ilike(f"%{search}%")) |
                (Order.address.ilike(f"%{search}%")) |
                (Order.phone.ilike(f"%{search}%"))
            )
    result = await db.execute(query)
    orders = result.scalars().all()
    payments_query = select(OrderPayment.order_id).join(Order, OrderPayment.order_id == Order.id)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            payments_query = payments_query.filter(Order.scheduled_time >= df)
        except ValueError: pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            payments_query = payments_query.filter(Order.scheduled_time <= dt)
        except ValueError: pass
    payments_result = await db.execute(payments_query)
    confirmed_ids = set(p[0] for p in payments_result.all())
    total = len(orders)
    completed = sum(1 for o in orders if o.status_id == 5)
    cancelled_cc = sum(1 for o in orders if o.status_id == 11)
    cancelled_bt = sum(1 for o in orders if o.status_id == 12)
    fake = sum(1 for o in orders if o.status_id == 16)
    rejected = 0
    no_show = 0
    for o in orders:
        if o.status_id == 6:
            rejected += 1
        if o.status_id in (11, 12) and o.description_work and 'недоезд' in (o.description_work or '').lower():
            no_show += 1
    cancelled = cancelled_cc + cancelled_bt
    not_orders = cancelled_cc + fake
    cancelled_and_not = cancelled + fake
    sd = sum(1 for o in orders if o.status_id == 4)
    cassa = round(sum(float(o.price_net or 0) for o in orders), 0)
    fact_cassa = round(sum(float(o.price_net or 0) for o in orders if o.id in confirmed_ids), 0)
    prices = [float(o.price_total or 0) for o in orders if o.price_total and o.price_total > 0]
    avg_check = round(sum(prices) / len(prices), 0) if prices else 0
    max_check = round(max(prices), 0) if prices else 0
    zero_count = sum(1 for o in orders if float(o.price_net or 0) == 0 and o.status_id not in (1, 2, 3, 4, 10, 11, 13, 14, 16))
    return {
        "total": total, "cassa": cassa, "zero_count": zero_count,
        "fact_cassa": fact_cassa, "completed": completed,
        "cancelled_cc": cancelled_cc, "cancelled_bt": cancelled_bt,
        "cancelled": cancelled, "not_orders": not_orders,
        "cancelled_and_not": cancelled_and_not, "rejected": rejected,
        "no_show": no_show, "sd": sd,
        "cancelled_pct": round(cancelled / total * 100, 1) if total else 0,
        "not_orders_pct": round(not_orders / total * 100, 1) if total else 0,
        "cancelled_and_not_pct": round(cancelled_and_not / total * 100, 1) if total else 0,
        "efficiency": round(completed / total * 100, 1) if total else 0,
        "avg_check": avg_check, "max_check": max_check,
    }


@router.get("/week-stats")
async def week_stats(
    date_from: str = Query(None),
    date_to: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import date as dt_date
    today = dt_date.today()
    start = dt_date.fromisoformat(date_from) if date_from else today - dt_date(today.weekday())
    end = dt_date.fromisoformat(date_to) if date_to else start + dt_date(7)
    result = await db.execute(
        select(
            cast(Order.scheduled_time, SQLDate).label("day"),
            func.count(Order.id).label("count")
        )
        .filter(
            cast(Order.scheduled_time, SQLDate) >= start,
            cast(Order.scheduled_time, SQLDate) < end
        )
        .group_by(cast(Order.scheduled_time, SQLDate))
        .order_by("day")
    )
    rows = result.all()
    return [{"day": str(row.day), "count": row.count} for row in rows]

@router.get("/{order_id}")
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order).options(
            selectinload(Order.client), selectinload(Order.status),
            selectinload(Order.master), selectinload(Order.operator),
            selectinload(Order.technic_type), selectinload(Order.comments),
            selectinload(Order.city).selectinload(City.region), selectinload(Order.branch),
            selectinload(Order.advertising_category),
        ).filter(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return order


@router.get("/{order_id}/comments")
async def get_order_comments(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OrderComment, User.last_name, User.first_name)
        .join(User, OrderComment.user_id == User.id)
        .filter(OrderComment.order_id == order_id)
        .order_by(OrderComment.created_at.desc())
    )
    comments = []
    for row in result.all():
        comment = row[0]
        comments.append({
            "id": comment.id, "text": comment.text,
            "comment_type": comment.comment_type,
            "created_at": comment.created_at,
            "user_name": f"{row[2]} {row[1]}",
        })
    return comments


@router.get("/{order_id}/photos")
async def get_photos(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OrderPhoto).filter(OrderPhoto.order_id == order_id)
    )
    return result.scalars().all()


# ========== POST ==========

@router.post("/")
async def create_order(
    client_id: int, branch_id: int, city_id: int,
    address: str, phone: str, description_original: str,
    status_id: int = 14,
    technic_type_id: int = None, scheduled_time: str = None,
    master_id: int = None,
    source: str = None,
    advertising_category_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    st = None
    if scheduled_time:
        try:
            st = datetime.fromisoformat(scheduled_time)
        except ValueError:
            pass
    order = Order(
        client_id=client_id, branch_id=branch_id, city_id=city_id,
        address=address, phone=phone,
        description_original=description_original,
        description_work=description_original,
        status_id=status_id, technic_type_id=technic_type_id,
        scheduled_time=st, master_id=master_id,
        source=source,
        advertising_category_id=advertising_category_id,
        operator_id=current_user.id, created_at=datetime.now(),
    )
    db.add(order)
    client = (await db.execute(select(Client).filter(Client.id == client_id))).scalar_one_or_none()
    if client:
        client.total_orders = (client.total_orders or 0) + 1
        from decimal import Decimal
        client.total_earned = (client.total_earned or 0) + Decimal(str(order.price_total or 0))
        if branch_id:
            client.branch_id = branch_id
    await db.commit()
    await db.refresh(order)
    contact = ClientContact(
        client_id=client_id,
        type="звонок", direction="входящий", status="принял",
        notes=description_original,
        technic_type_id=technic_type_id,
        department="БТ",
        operator_id=current_user.id,
        order_id=order.id,
        advertising_category_id=advertising_category_id,
        created_at=datetime.now(),
    )
    db.add(contact)
    await db.commit()
    return order


@router.post("/{order_id}/photos")
async def upload_photo(
    order_id: int,
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
    photo = OrderPhoto(
        order_id=order_id, photo_type=photo_type,
        filename=filename, filepath=filepath,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo

@router.delete("/{order_id}/photos/{photo_id}")
async def delete_photo(
    order_id: int, photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OrderPhoto).filter(OrderPhoto.id == photo_id, OrderPhoto.order_id == order_id)
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

# ========== PUT ==========

@router.put("/{order_id}/cancel")
async def cancel_order(
    order_id: int, cancel_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    status_code = 11 if cancel_type == "cc" else 12
    order.status_id = status_code
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/comment")
async def update_work_comment(
    order_id: int, description_work: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if order.description_work and order.description_work != description_work:
        db.add(OrderComment(
            order_id=order_id, user_id=current_user.id,
            comment_type="work", text=order.description_work,
        ))
    order.description_work = description_work
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/assign")
async def assign_master(
    order_id: int, master_id: int,
    scheduled_time: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    order.master_id = master_id
    order.status_id = 1
    order.assigned_at = datetime.now()
    if scheduled_time:
        try:
            order.scheduled_time = datetime.fromisoformat(scheduled_time)
        except ValueError:
            order.scheduled_time = scheduled_time
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/status")
async def update_status(
    order_id: int, status_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    now = datetime.now()
    order.status_id = status_id
    order.updated_at = now
    
    # Записываем время в зависимости от статуса
    if status_id == 1:
        order.assigned_at = now
    elif status_id == 2:
        order.accepted_at = now
    elif status_id == 3:
        order.in_work_at = now
    elif status_id == 13:
        order.out_at = now
    elif status_id == 4:
        order.sd_at = now
    elif status_id == 5:
        order.completed_at = now
    
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/request-cancel")
async def request_cancel(
    order_id: int, reason: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if order.description_work:
        db.add(OrderComment(
            order_id=order_id, user_id=current_user.id,
            comment_type="work", text=order.description_work,
        ))
    order.status_id = 15
    order.description_work = f"[ОТМЕНА] {reason}"
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/to-delete")
async def to_delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    order.status_id = 10
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/reset")
async def reset_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    order.status_id = 14
    order.master_id = None
    order.price_total = None
    order.price_prepaid = None
    order.price_remainder = None
    order.price_parts = None
    order.price_net = None
    if order.created_at:
        order.scheduled_time = order.created_at.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        order.scheduled_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/okk-check")
async def okk_check(
    order_id: int,
    okk_contract_left: bool = None,
    okk_tech_works: str = None,
    okk_works_match: str = None,
    okk_master_phone_left: bool = None,
    okk_client_amount: float = None,
    okk_warranty_days: int = None,
    okk_satisfied: str = None,
    comment: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    order.okk_checked = True
    if okk_contract_left is not None:
        order.okk_contract_left = okk_contract_left
    if okk_tech_works is not None:
        order.okk_tech_works = okk_tech_works
    if okk_works_match is not None:
        order.okk_works_match = okk_works_match
    if okk_master_phone_left is not None:
        order.okk_master_phone_left = okk_master_phone_left
    if okk_client_amount is not None:
        order.okk_client_amount = okk_client_amount
    if okk_warranty_days is not None:
        order.okk_warranty_days = okk_warranty_days
    if okk_satisfied is not None:
        order.okk_satisfied = okk_satisfied
    if comment is not None:
        order.okk_comment = comment
    order.updated_at = datetime.now()
    await db.commit()
    from app.models.client_contact import ClientContact
    contact = ClientContact(
        client_id=order.client_id,
        type="звонок", direction="исходящий",
        notes=comment or ('Изменение оценки ОКК' if order.okk_checked else 'Проверка качества'),
        status='ОКК (изменение)' if order.okk_checked else 'ОКК',
        technic_type_id=order.technic_type_id,
        department="БТ",
        operator_id=current_user.id,
        order_id=order.id,
        created_at=datetime.now(),
    )
    db.add(contact)
    await db.commit()
    return {"ok": True}


@router.put("/{order_id}/prices")
async def update_prices(
    order_id: int,
    price_total: float = None, price_prepaid: float = None,
    price_remainder: float = None, price_parts: float = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if price_total is not None:
        order.price_total = price_total
    if price_prepaid is not None:
        order.price_prepaid = price_prepaid
    if price_remainder is not None:
        order.price_remainder = price_remainder
    if price_parts is not None:
        order.price_parts = price_parts
    if order.price_total is not None and order.price_parts is not None:
        order.price_net = order.price_total - order.price_parts
    order.updated_at = datetime.now()
    await db.commit()
    if order.price_total and order.client_id:
        client_obj = (await db.execute(select(Client).filter(Client.id == order.client_id))).scalar_one_or_none()
        if client_obj:
            total_result = await db.execute(
                select(func.coalesce(func.sum(Order.price_total), 0)).filter(Order.client_id == order.client_id)
            )
            client_obj.total_earned = total_result.scalar()
            await db.commit()
    return {"ok": True}


@router.put("/{order_id}/mark-fake")
async def mark_fake(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    order.status_id = 16
    order.is_duplicate = True
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}

@router.put("/{order_id}/reschedule")
async def reschedule_order(
    order_id: int, scheduled_time: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    try:
        order.scheduled_time = datetime.fromisoformat(scheduled_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты")
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}

@router.put("/{order_id}/change-location")
async def change_location(
    order_id: int,
    city_id: int = None, branch_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if city_id is not None:
        order.city_id = city_id
    if branch_id is not None:
        order.branch_id = branch_id
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}

@router.put("/{order_id}/change-technic")
async def change_technic(
    order_id: int, technic_type_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    order.technic_type_id = technic_type_id
    order.updated_at = datetime.now()
    await db.commit()
    return {"ok": True}

# ========== DELETE ==========

@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).filter(Order.id == order_id, Order.status_id == 10))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена или не в статусе 'На удаление'")
    if order.client_id:
        client = (await db.execute(select(Client).filter(Client.id == order.client_id))).scalar_one_or_none()
        if client:
            client.total_orders = max(0, (client.total_orders or 0) - 1)
            client.total_earned = max(0, (client.total_earned or 0) - (order.price_total or 0))
            await db.flush()
    await db.delete(order)
    await db.commit()
    return {"ok": True}