from fastapi import HTTPException, status

from app.models.user import User


# Коды ролей
ROLE_ADMIN = "admin"
ROLE_FED_BT = "fed_bt"
ROLE_FED_CC = "fed_cc"
ROLE_REG_BT = "reg_bt"
ROLE_REG_CC = "reg_cc"
ROLE_DIR_BT = "dir_bt"
ROLE_DIR_CC = "dir_cc"
ROLE_LOGIST = "logist"
ROLE_OPERATOR = "operator"
ROLE_MASTER = "master"
ROLE_OKK = "okk"


def require_role(user: User, *allowed_roles: str):
    """Проверяет, что у пользователя одна из разрешённых ролей."""
    if user.role.code not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )


def require_bt(user: User):
    """Проверяет, что пользователь из ветки БТ."""
    bt_roles = {ROLE_ADMIN, ROLE_FED_BT, ROLE_REG_BT, ROLE_DIR_BT, ROLE_LOGIST, ROLE_MASTER}
    if user.role.code not in bt_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для отдела БТ",
        )


def require_cc(user: User):
    """Проверяет, что пользователь из ветки КЦ."""
    cc_roles = {ROLE_ADMIN, ROLE_FED_CC, ROLE_REG_CC, ROLE_DIR_CC, ROLE_OPERATOR}
    if user.role.code not in cc_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для КЦ",
        )