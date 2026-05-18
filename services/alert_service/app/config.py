from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://traceveil:traceveil@localhost:5434/traceveil",
    )
    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
