from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # База данных
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/crm"

    # JWT
    JWT_SECRET_KEY: str = "change-me-to-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 1440  # 24 часа

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Avito API (если нужно переиспользовать из бота)
    AVITO_CLIENT_ID: str = ""
    AVITO_CLIENT_SECRET: str = ""
    AVITO_USER_ID: int = 0

    class Config:
        env_file = ".env"


settings = Settings()