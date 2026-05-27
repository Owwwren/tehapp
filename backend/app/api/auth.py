from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.utils.security import verify_password, create_access_token, hash_password
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Авторизация"])

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("30/minute")
async def login(
    request: Request,
    login: str,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Вход по телефону или логину."""
    result = await db.execute(
        select(User).options(selectinload(User.role)).filter(
            (User.phone == login) | (User.username == login)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )

    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.code if user.role else None,
            "theme": user.theme,
        },
    }


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    """Информация о текущем пользователе."""
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "middle_name": user.middle_name,
        "phone": user.phone,
        "username": user.username,
        "birth_date": user.birth_date.strftime("%Y-%m-%d") if user.birth_date else None,
        "telegram_nick": user.telegram_nick,
        "role": user.role.code if user.role else None,
        "is_active": user.is_active,
        "theme": user.theme,
    }


@router.put("/profile")
async def update_profile(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    middle_name: Optional[str] = None,
    phone: Optional[str] = None,
    birth_date: Optional[str] = None,
    telegram_nick: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить личные данные."""
    result = await db.execute(select(User).filter(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if middle_name is not None:
        user.middle_name = middle_name
    if phone is not None:
        # Проверка уникальности телефона
        existing = (await db.execute(select(User).filter(User.phone == phone, User.id != current_user.id))).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Телефон уже занят")
        user.phone = phone
    if birth_date is not None:
        try:
            user.birth_date = datetime.fromisoformat(birth_date) if birth_date else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный формат даты")
    if telegram_nick is not None:
        user.telegram_nick = telegram_nick

    user.updated_at = datetime.now()
    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "middle_name": user.middle_name,
        "phone": user.phone,
        "birth_date": user.birth_date.strftime("%Y-%m-%d") if user.birth_date else None,
        "telegram_nick": user.telegram_nick,
    }


@router.put("/password")
async def change_password(
    old_password: str = Body(...),
    new_password: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Смена пароля."""
    result = await db.execute(select(User).filter(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if not verify_password(old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный старый пароль")

    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="Пароль должен быть не менее 4 символов")

    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.now()
    await db.commit()

    return {"ok": True}