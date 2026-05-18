from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    # --- Redis ---
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # --- Database (used only to fetch simulation topology on connect) ---
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://traceveil:traceveil@localhost:5434/traceveil",
    )

    # --- JWT (must match the API service values) ---
    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY",
        "CHANGE-ME-this-is-not-safe-for-production-use-a-long-random-string",
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")

    # --- Logging ---
    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
