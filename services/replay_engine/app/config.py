from __future__ import annotations

import os
from dataclasses import dataclass, field


def _env_list(key: str, default: list[str]) -> list[str]:
    raw = os.getenv(key)
    if raw is None:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://traceveil:traceveil@localhost:5434/traceveil",
    )
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "CHANGE-ME")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    cors_origins: list[str] = field(
        default_factory=lambda: _env_list(
            "CORS_ORIGINS",
            ["http://localhost:5173", "http://localhost:3000"],
        )
    )


settings = Settings()
