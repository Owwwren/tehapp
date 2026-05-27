from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database import get_db
from app.models.order import Order
from app.models.user import User
from app.dependencies import get_current_user
from app.models.branch import Branch

router = APIRouter(prefix="/statistics", tags=["Статистика"])


@router.get("/orders")
async def order_stats(
    date_from: str = Query(None),
    date_to: str = Query(None),
    city_id: int = Query(None),
    master_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Статистика по заявкам."""
    total_query = select(func.count(Order.id))
    status_query = select(Order.status_id, func.count(Order.id).label("count")).group_by(Order.status_id)

    filters = []
    if date_from:
        filters.append(Order.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(Order.created_at <= datetime.fromisoformat(date_to))
    if city_id:
        filters.append(Order.city_id == city_id)
    if master_id:
        filters.append(Order.master_id == master_id)

    for f in filters:
        total_query = total_query.filter(f)
        status_query = status_query.filter(f)

    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    status_result = await db.execute(status_query)
    statuses = [{"status_id": row[0], "count": row[1]} for row in status_result.all()]

    return {"total": total, "by_status": statuses}


@router.get("/branches")
async def branch_stats(
    date_from: str = Query(None),
    date_to: str = Query(None),
    branch_id: int = Query(None),
    city_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Статистика по филиалам."""
    from collections import defaultdict
    from app.models.order_payment import OrderPayment
    from app.models.city import City
    from app.models.region import Region
    from app.models.region_department import region_departments

    query = select(Order)
    if date_from:
        query = query.filter(Order.scheduled_time >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Order.scheduled_time <= datetime.fromisoformat(date_to))
    if branch_id:
        query = query.filter(Order.branch_id == branch_id)
    if city_id:
        query = query.join(City, Order.city_id == City.id).filter(City.id == city_id)
    if region_id:
        query = query.join(City, Order.city_id == City.id).filter(City.region_id == region_id)
    if department_id:
        query = query.join(City, Order.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)

    result = await db.execute(query)
    orders = result.scalars().all()

    branches_data = defaultdict(lambda: {
        "total": 0, "completed": 0, "completed_cassa": 0, "cancelled_cc": 0, "cancelled_bt": 0,
        "fake": 0, "rejected": 0, "no_show": 0, "sd": 0, "cassa": 0, "fact_cassa": 0,
        "prepaid": 0, "parts": 0, "remainder": 0, "net": 0,
        "prices": [], "net_prices": [], "zero_count": 0,
        "technics": defaultdict(int), "by_day": defaultdict(int),
    })

    payments_query = select(OrderPayment.order_id).join(Order, OrderPayment.order_id == Order.id)
    if date_from:
        payments_query = payments_query.filter(Order.scheduled_time >= datetime.fromisoformat(date_from))
    if date_to:
        payments_query = payments_query.filter(Order.scheduled_time <= datetime.fromisoformat(date_to))
    if branch_id:
        payments_query = payments_query.filter(Order.branch_id == branch_id)
    if city_id:
        payments_query = payments_query.join(City, Order.city_id == City.id).filter(City.id == city_id)
    if region_id:
        payments_query = payments_query.join(City, Order.city_id == City.id).filter(City.region_id == region_id)
    if department_id:
        payments_query = payments_query.join(City, Order.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
    payments_result = await db.execute(payments_query)
    confirmed_ids = set(p[0] for p in payments_result.all())

    for o in orders:
        bid = o.branch_id or 0
        d = branches_data[bid]
        d["total"] += 1
        total_price = float(o.price_total or 0)
        net = float(o.price_net or 0)

        if o.status_id == 5:
            d["completed"] += 1
            d["completed_cassa"] += total_price
        if o.status_id == 11: d["cancelled_cc"] += 1
        if o.status_id == 12: d["cancelled_bt"] += 1
        if o.status_id == 16: d["fake"] += 1
        if o.status_id == 6: d["rejected"] += 1
        if o.status_id == 4: d["sd"] += 1
        
        # Недоезд — отмены с причиной "недоезд"
        if o.status_id in (11, 12) and o.description_work and 'недоезд' in (o.description_work or '').lower():
            d["no_show"] += 1

        d["cassa"] += net
        if o.id in confirmed_ids: d["fact_cassa"] += net
        d["prepaid"] += float(o.price_prepaid or 0)
        d["parts"] += float(o.price_parts or 0)
        d["remainder"] += float(o.price_remainder or 0)
        d["net"] += net
        if total_price > 0: d["prices"].append(total_price)
        if net == 0 and o.status_id not in (1, 2, 3, 4, 10, 11, 13, 14, 16):
            d["zero_count"] += 1
        if o.technic_type_id: d["technics"][o.technic_type_id] += 1
        if o.scheduled_time: d["by_day"][o.scheduled_time.strftime("%Y-%m-%d")] += 1

    from app.models.branch import Branch
    branches_result = await db.execute(select(Branch))
    branch_names = {b.id: b.name for b in branches_result.scalars().all()}

    result_list = []
    for bid, d in sorted(branches_data.items()):
        cancelled = d["cancelled_cc"] + d["cancelled_bt"]
        not_orders = d["cancelled_cc"] + d["fake"]
        prices = d["prices"]
        result_list.append({
            "branch_id": bid,
            "branch_name": branch_names.get(bid, "Неизвестно"),
            "total": d["total"],
            "completed": d["completed"],
            "completed_cassa": round(d["completed_cassa"]),
            "cancelled_cc": d["cancelled_cc"],
            "cancelled_bt": d["cancelled_bt"],
            "fake": d["fake"],
            "rejected": d["rejected"],
            "no_show": d["no_show"],
            "sd": d["sd"],
            "cancelled": cancelled,
            "not_orders": not_orders,
            "cassa": round(d["cassa"]),
            "fact_cassa": round(d["fact_cassa"]),
            "prepaid": round(d["prepaid"]),
            "parts": round(d["parts"]),
            "remainder": round(d["remainder"]),
            "net": round(d["net"]),
            "avg_check": round(sum(prices) / len(prices)) if prices else 0,
            "max_check": round(max(prices)) if prices else 0,
            "zero_count": d["zero_count"],
            "efficiency": round(d["completed"] / d["total"] * 100, 1) if d["total"] else 0,
            "cancelled_pct": round(cancelled / d["total"] * 100, 1) if d["total"] else 0,
            "sd_pct": round(d["sd"] / d["total"] * 100, 1) if d["total"] else 0,
            "technics": dict(d["technics"]),
            "by_day": dict(d["by_day"]),
        })

    return result_list


@router.get("/cities")
async def city_stats(
    date_from: str = Query(None),
    date_to: str = Query(None),
    city_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Статистика по городам."""
    from collections import defaultdict
    from app.models.order_payment import OrderPayment
    from app.models.city import City
    from app.models.region import Region
    from app.models.region_department import region_departments

    query = select(Order)
    if date_from:
        query = query.filter(Order.scheduled_time >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Order.scheduled_time <= datetime.fromisoformat(date_to))
    if city_id:
        query = query.filter(Order.city_id == city_id)
    if region_id:
        query = query.join(City, Order.city_id == City.id).filter(City.region_id == region_id)
    if department_id:
        query = query.join(City, Order.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)

    result = await db.execute(query)
    orders = result.scalars().all()

    cities_data = defaultdict(lambda: {
        "total": 0, "completed": 0, "completed_cassa": 0, "cancelled_cc": 0, "cancelled_bt": 0,
        "fake": 0, "rejected": 0, "no_show": 0, "sd": 0, "cassa": 0, "fact_cassa": 0,
        "prepaid": 0, "parts": 0, "remainder": 0, "net": 0,
        "prices": [], "zero_count": 0, "technics": defaultdict(int), "by_day": defaultdict(int),
    })

    payments_query = select(OrderPayment.order_id).join(Order, OrderPayment.order_id == Order.id)
    if date_from:
        payments_query = payments_query.filter(Order.scheduled_time >= datetime.fromisoformat(date_from))
    if date_to:
        payments_query = payments_query.filter(Order.scheduled_time <= datetime.fromisoformat(date_to))
    if city_id:
        payments_query = payments_query.filter(Order.city_id == city_id)
    if region_id:
        payments_query = payments_query.join(City, Order.city_id == City.id).filter(City.region_id == region_id)
    if department_id:
        payments_query = payments_query.join(City, Order.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
    payments_result = await db.execute(payments_query)
    confirmed_ids = set(p[0] for p in payments_result.all())

    for o in orders:
        cid = o.city_id or 0
        d = cities_data[cid]
        d["total"] += 1
        total_price = float(o.price_total or 0)
        net = float(o.price_net or 0)
        if o.status_id == 5:
            d["completed"] += 1
            d["completed_cassa"] += total_price
        if o.status_id == 11: d["cancelled_cc"] += 1
        if o.status_id == 12: d["cancelled_bt"] += 1
        if o.status_id == 16: d["fake"] += 1
        if o.status_id == 6: d["rejected"] += 1
        if o.status_id == 4: d["sd"] += 1
        
        if o.status_id in (11, 12) and o.description_work and 'недоезд' in (o.description_work or '').lower():
            d["no_show"] += 1
            
        d["cassa"] += net
        if o.id in confirmed_ids: d["fact_cassa"] += net
        d["prepaid"] += float(o.price_prepaid or 0)
        d["parts"] += float(o.price_parts or 0)
        d["remainder"] += float(o.price_remainder or 0)
        d["net"] += net
        if total_price > 0: d["prices"].append(total_price)
        if net == 0 and o.status_id not in (1, 2, 3, 4, 10, 11, 13, 14, 16):
            d["zero_count"] += 1
        if o.technic_type_id: d["technics"][o.technic_type_id] += 1
        if o.scheduled_time: d["by_day"][o.scheduled_time.strftime("%Y-%m-%d")] += 1

    cities_result = await db.execute(select(City))
    city_names = {c.id: c.name for c in cities_result.scalars().all()}

    result_list = []
    for cid, d in sorted(cities_data.items()):
        cancelled = d["cancelled_cc"] + d["cancelled_bt"]
        not_orders = d["cancelled_cc"] + d["fake"]
        prices = d["prices"]
        result_list.append({
            "city_id": cid,
            "city_name": city_names.get(cid, "Неизвестно"),
            "total": d["total"],
            "completed": d["completed"],
            "completed_cassa": round(d["completed_cassa"]),
            "cancelled_cc": d["cancelled_cc"],
            "cancelled_bt": d["cancelled_bt"],
            "fake": d["fake"],
            "rejected": d["rejected"],
            "no_show": d["no_show"],
            "sd": d["sd"],
            "cancelled": cancelled,
            "not_orders": not_orders,
            "cassa": round(d["cassa"]),
            "fact_cassa": round(d["fact_cassa"]),
            "prepaid": round(d["prepaid"]),
            "parts": round(d["parts"]),
            "remainder": round(d["remainder"]),
            "net": round(d["net"]),
            "avg_check": round(sum(prices) / len(prices)) if prices else 0,
            "max_check": round(max(prices)) if prices else 0,
            "zero_count": d["zero_count"],
            "efficiency_pct": round(d["completed"] / d["total"] * 1000) / 10 if d["total"] else 0,
            "cancelled_pct": round(cancelled / d["total"] * 1000) / 10 if d["total"] else 0,
            "sd_pct": round(d["sd"] / d["total"] * 1000) / 10 if d["total"] else 0,
            "technics": dict(d["technics"]),
            "by_day": dict(d["by_day"]),
        })

    return result_list


@router.get("/masters")
async def master_stats(
    date_from: str = Query(None),
    date_to: str = Query(None),
    branch_id: int = Query(None),
    city_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    master_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Статистика по мастерам."""
    from collections import defaultdict
    from app.models.order_payment import OrderPayment
    from app.models.transaction import Transaction
    from app.models.role import Role
    from app.models.technic import Technic
    from app.models.city import City
    from app.models.region import Region
    from app.models.region_department import region_departments
    from datetime import timedelta

    query = select(Order).options(selectinload(Order.master), selectinload(Order.technic_type), selectinload(Order.payments))
    if date_from:
        query = query.filter(Order.scheduled_time >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Order.scheduled_time <= datetime.fromisoformat(date_to))
    if branch_id:
        query = query.filter(Order.branch_id == branch_id)
    if city_id:
        query = query.filter(Order.city_id == city_id)
    if region_id:
        query = query.join(City, Order.city_id == City.id).filter(City.region_id == region_id)
    if department_id:
        query = query.join(City, Order.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
    if master_id:
        query = query.filter(Order.master_id == master_id)

    result = await db.execute(query)
    orders = result.scalars().all()

    payments_query = select(OrderPayment).join(Order, OrderPayment.order_id == Order.id)
    if date_from:
        payments_query = payments_query.filter(Order.scheduled_time >= datetime.fromisoformat(date_from))
    if date_to:
        payments_query = payments_query.filter(Order.scheduled_time <= datetime.fromisoformat(date_to))
    payments_result = await db.execute(payments_query)
    payments = payments_result.scalars().all()
    payments_by_master = defaultdict(float)
    for p in payments:
        if p.master_id:
            payments_by_master[p.master_id] += float(p.amount or 0)

    tx_query = select(Transaction).filter(
        Transaction.category == 'ЗП мастера',
        Transaction.status == 'confirmed'
    )
    if date_from:
        tx_query = tx_query.filter(Transaction.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        tx_query = tx_query.filter(Transaction.created_at <= datetime.fromisoformat(date_to))
    if master_id:
        tx_query = tx_query.filter(Transaction.master_id == master_id)
    tx_result = await db.execute(tx_query)
    transactions = tx_result.scalars().all()
    master_salary = defaultdict(float)
    master_salary_by_week = defaultdict(lambda: defaultdict(float))

    now = datetime.now()
    three_months_ago = now - timedelta(days=90)
    for tx in transactions:
        if tx.master_id:
            master_salary[tx.master_id] += float(tx.amount or 0)
            if tx.created_at and tx.created_at >= three_months_ago:
                week_start = tx.created_at - timedelta(days=tx.created_at.weekday())
                week_key = week_start.strftime("%Y-%m-%d")
                master_salary_by_week[tx.master_id][week_key] += float(tx.amount or 0)

    masters_data = defaultdict(lambda: {
        "total": 0, "completed": 0, "completed_cassa": 0, "cancelled": 0, "fake": 0,
        "warranty": 0, "zero": 0, "sd": 0, "no_show": 0,
        "cassa": 0, "parts": 0, "net": 0,
        "prices": [], "not_paid_count": 0, "not_paid_sum": 0,
        "up_to_1k": 0, "up_to_2_5k": 0, "up_to_10k": 0,
        "technics": set(),
        "by_day": defaultdict(lambda: {"total": 0, "completed": 0, "cancelled": 0, "warranty": 0, "zero": 0}),
    })

    for o in orders:
        if not o.master_id:
            continue
        mid = o.master_id
        d = masters_data[mid]
        d["total"] += 1
        tp = float(o.price_total or 0)
        net = float(o.price_net or 0)
        d["cassa"] += net
        parts = float(o.price_parts or 0)
        d["parts"] += parts
        d["net"] += net
        if tp > 0:
            d["prices"].append(tp)

        if o.status_id == 5:
            d["completed"] += 1
            d["completed_cassa"] += tp
        if o.status_id in (11, 12):
            d["cancelled"] += 1
        if o.status_id == 16:
            d["fake"] += 1
        if o.status_id == 6:
            pass  # отказы не считаем у мастеров
        if o.status_id in (11, 12) and o.description_work and 'недоезд' in (o.description_work or '').lower():
            d["no_show"] += 1
        if o.source == 'гарантия':
            d["warranty"] += 1
        if net == 0 and o.status_id not in (1, 2, 3, 4, 11, 13, 16):
            d["zero"] += 1
        if o.status_id == 4:
            d["sd"] += 1
        if o.technic_type_id:
            d["technics"].add(o.technic_type_id)

        if tp <= 1000:
            d["up_to_1k"] += 1
        if tp <= 2500:
            d["up_to_2_5k"] += 1
        if tp <= 10000:
            d["up_to_10k"] += 1

        if o.status_id == 5 and not o.payments:
            d["not_paid_count"] += 1
            d["not_paid_sum"] += net * 0.5

        if o.scheduled_time:
            day = o.scheduled_time.strftime("%Y-%m-%d")
            d["by_day"][day]["total"] += 1
            if o.status_id == 5:
                d["by_day"][day]["completed"] += 1
            if o.status_id in (11, 12):
                d["by_day"][day]["cancelled"] += 1
            if o.source == 'гарантия':
                d["by_day"][day]["warranty"] += 1
            if net == 0 and o.status_id not in (1, 2, 3, 4, 11, 13, 16):
                d["by_day"][day]["zero"] += 1

    all_masters_query = select(User).join(Role).filter(Role.code == 'master', User.is_active == True)
    if branch_id:
        all_masters_query = all_masters_query.join(User.branches).filter(Branch.id == branch_id)
    if city_id:
        all_masters_query = all_masters_query.join(User.branches).join(Branch, User.branches).filter(Branch.city_id == city_id)
    if region_id:
        all_masters_query = all_masters_query.join(User.branches).join(Branch, User.branches).join(City, Branch.city_id == City.id).filter(City.region_id == region_id)
    if department_id:
        all_masters_query = all_masters_query.join(User.branches).join(Branch, User.branches).join(City, Branch.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
    if master_id:
        all_masters_query = all_masters_query.filter(User.id == master_id)
    all_masters_result = await db.execute(all_masters_query)
    all_masters = all_masters_result.scalars().all()
    master_names = {m.id: f"{m.last_name} {m.first_name}" for m in all_masters}

    for m in all_masters:
        if m.id not in masters_data:
            masters_data[m.id] = {
                "total": 0, "completed": 0, "completed_cassa": 0, "cancelled": 0, "fake": 0,
                "warranty": 0, "zero": 0, "sd": 0, "no_show": 0,
                "cassa": 0, "parts": 0, "net": 0,
                "prices": [], "not_paid_count": 0, "not_paid_sum": 0,
                "up_to_1k": 0, "up_to_2_5k": 0, "up_to_10k": 0,
                "technics": set(),
                "by_day": {},
            }

    tech_result = await db.execute(select(Technic))
    tech_names = {t.id: t.name for t in tech_result.scalars().all()}

    result_list = []
    for mid, d in sorted(masters_data.items()):
        prices = d["prices"]
        total = d["total"]
        result_list.append({
            "master_id": mid,
            "master_name": master_names.get(mid, "Неизвестно"),
            "technics": ", ".join(tech_names.get(tid, "") for tid in d["technics"] if tech_names.get(tid)),
            "total": total,
            "completed": d["completed"],
            "completed_cassa": round(d["completed_cassa"]),
            "cancelled": d["cancelled"],
            "cancelled_pct": round(d["cancelled"] / total * 100, 1) if total else 0,
            "fake": d["fake"],
            "fake_pct": round(d["fake"] / total * 100, 1) if total else 0,
            "warranty": d["warranty"],
            "warranty_pct": round(d["warranty"] / total * 100, 1) if total else 0,
            "zero": d["zero"],
            "zero_pct": round(d["zero"] / total * 100, 1) if total else 0,
            "sd": d["sd"],
            "no_show": d["no_show"],
            "no_show_pct": round(d["no_show"] / total * 100, 1) if total else 0,
            "not_paid_count": d["not_paid_count"],
            "not_paid_sum": round(d["not_paid_sum"]),
            "up_to_1k": d["up_to_1k"],
            "up_to_2_5k": d["up_to_2_5k"],
            "up_to_10k": d["up_to_10k"],
            "avg_check": round(sum(prices) / len(prices)) if prices else 0,
            "max_check": round(max(prices)) if prices else 0,
            "cassa": round(d["cassa"]),
            "parts": round(d["parts"]),
            "net": round(d["net"]),
            "salary": round(master_salary[mid]),
            "salary_by_week": dict(master_salary_by_week[mid]),
            "parts_pct": round(d["parts"] / d["cassa"] * 100, 1) if d["cassa"] else 0,
            "by_day": dict(d["by_day"]),
        })

    return result_list