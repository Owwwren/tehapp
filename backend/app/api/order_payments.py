from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.transaction import Transaction
from app.database import get_db
from app.models.order_payment import OrderPayment
from app.models.order import Order
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/order-payments", tags=["Подтверждение оплаты"])


@router.post("/")
async def confirm_payment(
    order_id: int,
    master_id: int,
    amount: float,
    percent: float = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Подтвердить оплату заявки."""
    order = (await db.execute(select(Order).filter(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if order.status_id != 5:
        raise HTTPException(status_code=400, detail="Заявка не выполнена")
    
    # Проверяем что платёж ещё не существует
    existing = (await db.execute(
        select(OrderPayment).filter(OrderPayment.order_id == order_id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Платёж уже подтверждён")

    payment = OrderPayment(
        order_id=order_id,
        master_id=master_id,
        amount=amount,
        percent=percent,
        confirmed_by=current_user.id,
        created_at=datetime.now(),
    )
    db.add(payment)
    await db.commit()
    
    # Создаём транзакцию расхода на ЗП мастера
    master_amount = float(order.price_net or 0) * float(percent) / 100
    if master_amount > 0:
        master_user = (await db.execute(select(User).filter(User.id == master_id))).scalar_one_or_none()
        transaction = Transaction(
            branch_id=order.branch_id,
            type_id=2,
            amount=master_amount,
            category="ЗП мастера",
            status="confirmed",
            description=f"Заявка №{order_id}, мастер {master_user.last_name} {master_user.first_name}, сумма заявки {amount} ₽, расчёт мастера {percent}%",
            user_id=current_user.id,
            master_id=master_id,
            created_at=datetime.now(),
        )
        db.add(transaction)
        await db.commit()
    
    await db.refresh(payment)
    return payment


@router.get("/")
async def list_payments(
    order_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список подтверждений."""
    query = select(OrderPayment).options(
        selectinload(OrderPayment.master),
        selectinload(OrderPayment.confirmer),
    )
    if order_id:
        query = query.filter(OrderPayment.order_id == order_id)
    result = await db.execute(query)
    return result.scalars().all()