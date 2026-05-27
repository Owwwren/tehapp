from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database import get_db
from app.models.client_contact import ClientContact
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/client-contacts", tags=["Обращения"])


@router.get("/")
async def list_contacts(
    client_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список обращений клиента."""
    query = select(ClientContact).options(
        selectinload(ClientContact.operator),
        selectinload(ClientContact.technic_type),
        selectinload(ClientContact.advertising_category),
    ).order_by(ClientContact.sort_order, ClientContact.created_at.desc())
    
    if client_id:
        query = query.filter(ClientContact.client_id == client_id)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/")
async def create_contact(
    client_id: int,
    type: str = "звонок",
    direction: str = "входящий",
    status: str = None,
    notes: str = None,
    technic_type_id: int = None,
    department: str = "БТ",
    advertisement: str = None,
    advertising_category_id: int = None,
    order_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать обращение."""
    # Определяем следующий sort_order
    max_order_result = await db.execute(
        select(ClientContact.sort_order)
        .filter(ClientContact.client_id == client_id)
        .order_by(ClientContact.sort_order.desc())
        .limit(1)
    )
    max_order = max_order_result.scalar()
    next_order = (max_order or 0) + 1

    contact = ClientContact(
        client_id=client_id,
        sort_order=next_order,
        type=type,
        direction=direction,
        status=status,
        notes=notes,
        technic_type_id=technic_type_id,
        department=department,
        advertisement=advertisement,
        advertising_category_id=advertising_category_id,
        operator_id=current_user.id,
        order_id=order_id,
        created_at=datetime.now(),
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ClientContact).filter(ClientContact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
    await db.delete(contact)
    await db.commit()
    return {"ok": True}


@router.put("/reorder")
async def reorder_contacts(
    client_id: int,
    order: str = Query(..., description="ID через запятую: 1,3,2"),
    db: AsyncSession = Depends(get_db),
):
    """Обновить порядок обращений клиента."""
    ids = [int(x.strip()) for x in order.split(",") if x.strip()]
    for index, contact_id in enumerate(ids):
        contact = (await db.execute(
            select(ClientContact).filter(ClientContact.id == contact_id, ClientContact.client_id == client_id)
        )).scalar_one_or_none()
        if contact:
            contact.sort_order = index
    await db.commit()
    return {"ok": True, "reordered": len(ids)}


@router.put("/{contact_id}")
async def update_contact(
    contact_id: int,
    type: str = None,
    direction: str = None,
    status: str = None,
    notes: str = None,
    technic_type_id: int = None,
    department: str = None,
    advertisement: str = None,
    advertising_category_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ClientContact).filter(ClientContact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Обращение не найдена")
    if type is not None: contact.type = type
    if direction is not None: contact.direction = direction
    if status is not None: contact.status = status
    if notes is not None: contact.notes = notes
    if technic_type_id is not None: contact.technic_type_id = technic_type_id
    if department is not None: contact.department = department
    if advertisement is not None: contact.advertisement = advertisement
    if advertising_category_id is not None: contact.advertising_category_id = advertising_category_id
    await db.commit()
    return {"ok": True}