import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.dependencies import get_current_user
from app.models.transaction_photo import TransactionPhoto
from app.models.order import Order


UPLOAD_DIR_TX = "uploads/transactions"
os.makedirs(UPLOAD_DIR_TX, exist_ok=True)
router = APIRouter(prefix="/transactions", tags=["Транзакции"])


@router.get("/")
async def list_transactions(
    branch_id: int = Query(None),
    city_id: int = Query(None),
    region_id: int = Query(None),
    department_id: int = Query(None),
    type_id: int = Query(None),
    status: str = Query(None),
    category: str = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Transaction).options(
        selectinload(Transaction.type),
        selectinload(Transaction.user),
        selectinload(Transaction.branch),
    )

    if branch_id:
        query = query.filter(Transaction.branch_id == branch_id)
    if city_id:
        from app.models.branch import Branch
        query = query.join(Branch, Transaction.branch_id == Branch.id).filter(Branch.city_id == city_id)
    if region_id:
        from app.models.branch import Branch
        from app.models.city import City
        query = query.join(Branch, Transaction.branch_id == Branch.id).join(City, Branch.city_id == City.id).filter(City.region_id == region_id)
    if department_id:
        from app.models.branch import Branch
        from app.models.city import City
        from app.models.region import Region
        from app.models.region_department import region_departments
        query = query.join(Branch, Transaction.branch_id == Branch.id).join(City, Branch.city_id == City.id).join(Region, City.region_id == Region.id).join(region_departments, Region.id == region_departments.c.region_id).filter(region_departments.c.department_id == department_id)
    if type_id:
        query = query.filter(Transaction.type_id == type_id)
    if status:
        query = query.filter(Transaction.status == status)
    if category:
        query = query.filter(Transaction.category == category)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            query = query.filter(Transaction.created_at >= df)
        except ValueError: pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(Transaction.created_at <= dt)
        except ValueError: pass

    query = query.order_by(Transaction.id.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/")
async def create_transaction(
    branch_id: int,
    type_id: int,
    amount: float,
    description: str = None,
    category: str = None,
    client_id: int = None,
    order_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = Transaction(
        branch_id=branch_id,
        type_id=type_id,
        amount=amount,
        description=description,
        category=category,
        client_id=client_id,
        order_id=order_id,
        user_id=current_user.id,
        created_at=datetime.now(),
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.put("/{transaction_id}/confirm")
async def confirm_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Transaction).filter(Transaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")
    tx.status = "confirmed"
    await db.commit()
    return {"ok": True, "status": tx.status}


@router.put("/{transaction_id}/cancel")
async def cancel_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Transaction).filter(Transaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")
    if tx.category == 'Возврат' and tx.client_id:
        from app.models.client import Client
        client_obj = (await db.execute(select(Client).filter(Client.id == tx.client_id))).scalar_one_or_none()
        if client_obj:
            client_obj.returned = (client_obj.returned or 0) - tx.amount
    tx.status = "cancelled"
    await db.commit()
    return {"ok": True, "status": tx.status}


@router.put("/{transaction_id}/restore")
async def restore_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Transaction).filter(Transaction.id == transaction_id, Transaction.status == "cancelled"))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена или не обнулена")
    if tx.category == 'Возврат' and tx.client_id:
        from app.models.client import Client
        client_obj = (await db.execute(select(Client).filter(Client.id == tx.client_id))).scalar_one_or_none()
        if client_obj:
            client_obj.returned = (client_obj.returned or 0) + tx.amount
    tx.status = "created"
    await db.commit()
    return {"ok": True, "status": tx.status}


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Transaction).filter(Transaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")
    if tx.category == 'Возврат' and tx.client_id and tx.status != 'cancelled':
        from app.models.client import Client
        client_obj = (await db.execute(select(Client).filter(Client.id == tx.client_id))).scalar_one_or_none()
        if client_obj:
            client_obj.returned = (client_obj.returned or 0) - tx.amount
    await db.delete(tx)
    await db.commit()
    return {"ok": True}


@router.post("/{transaction_id}/photos")
async def upload_tx_photo(
    transaction_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR_TX, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    photo = TransactionPhoto(
        transaction_id=transaction_id,
        filename=filename,
        filepath=filepath,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.get("/{transaction_id}/photos")
async def get_tx_photos(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TransactionPhoto).filter(TransactionPhoto.transaction_id == transaction_id)
    )
    return result.scalars().all()


@router.get("/photos/{filename}")
async def get_tx_photo_file(filename: str):
    filepath = os.path.join(UPLOAD_DIR_TX, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(filepath)


@router.delete("/{transaction_id}/photos/{photo_id}")
async def delete_tx_photo(
    transaction_id: int,
    photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TransactionPhoto).filter(
            TransactionPhoto.id == photo_id,
            TransactionPhoto.transaction_id == transaction_id,
        )
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Фото не найдено")
    filepath = os.path.join(UPLOAD_DIR_TX, photo.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    await db.delete(photo)
    await db.commit()
    return {"ok": True}


@router.get("/types")
async def get_transaction_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.transaction_type import TransactionType
    result = await db.execute(select(TransactionType).order_by(TransactionType.name))
    return result.scalars().all()


@router.get("/balance")
async def get_balance(
    branch_id: int = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.order_payment import OrderPayment
    
    fact_query = select(func.coalesce(func.sum(Order.price_net), 0)).join(OrderPayment, Order.id == OrderPayment.order_id)
    if branch_id:
        fact_query = fact_query.filter(Order.branch_id == branch_id)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            fact_query = fact_query.filter(Order.scheduled_time >= df)
        except ValueError: pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            fact_query = fact_query.filter(Order.scheduled_time <= dt)
        except ValueError: pass
    
    fact_cassa = (await db.execute(fact_query)).scalar() or 0
    
    inc_query = select(func.coalesce(func.sum(Transaction.amount), 0)).filter(Transaction.type_id == 1, Transaction.status != 'cancelled')
    if branch_id: inc_query = inc_query.filter(Transaction.branch_id == branch_id)
    if date_from:
        try: inc_query = inc_query.filter(Transaction.created_at >= df)
        except: pass
    if date_to:
        try: inc_query = inc_query.filter(Transaction.created_at <= dt)
        except: pass
    income = (await db.execute(inc_query)).scalar() or 0
    
    exp_query = select(func.coalesce(func.sum(Transaction.amount), 0)).filter(Transaction.type_id == 2, Transaction.status != 'cancelled')
    if branch_id: exp_query = exp_query.filter(Transaction.branch_id == branch_id)
    if date_from:
        try: exp_query = exp_query.filter(Transaction.created_at >= df)
        except: pass
    if date_to:
        try: exp_query = exp_query.filter(Transaction.created_at <= dt)
        except: pass
    expense = (await db.execute(exp_query)).scalar() or 0
    
    return {
        "fact_cassa": float(fact_cassa),
        "income": float(income),
        "expense": float(expense),
        "balance": float(fact_cassa) + float(income) - float(expense),
    }