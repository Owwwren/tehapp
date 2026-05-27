from fastapi import APIRouter

router = APIRouter(prefix="/settings", tags=["Настройки"])


@router.get("/")
def get_settings():
    return {"message": "Настройки системы (в разработке)"}