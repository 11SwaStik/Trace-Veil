"""Application settings.

Loads values from a `.env` file (via python-dotenv) and exposes them
as attributes on a single `Settings` object. Import `settings` anywhere
in the app instead of reading os.environ directly — that way every
config value has one well-known home.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

# Reads `.env` from the current working directory if present. Safe to call
# at import time — missing file is a no-op, real env vars always win.
load_dotenv()


def _env_bool(key: str, default: bool) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(key: str, default: int) -> int:
    raw = os.getenv(key)
    return int(raw) if raw is not None else default


def _env_list(key: str, default: list[str]) -> list[str]:
    raw = os.getenv(key)
    if raw is None:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # --- App ---
    env: str = os.getenv("ENV", "local")
    debug: bool = _env_bool("DEBUG", True)
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # --- HTTP server ---
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = _env_int("PORT", 8000)

    # --- Database ---
    # Default points to localhost:5432 for local development (when running API outside Docker).
    # When running via docker-compose, DATABASE_URL env var is overridden to use 'postgres:5432'
    # (internal Docker network) and the postgres service ports 5434:5432 (host:container).
    # So from the host machine: postgres is at localhost:5434
    # But from inside a container: postgres is at postgres:5432
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://traceveil:traceveil@localhost:5432/traceveil",
    )

    # --- CORS ---
    # Allowed frontend origins. Update if frontend runs on a different port.
    # 5173: Vite default (npm run dev)
    # 3000: Next.js default
    # In production, set CORS_ORIGINS env var to your actual domain.
    cors_origins: list[str] = field(
        default_factory=lambda: _env_list(
            "CORS_ORIGINS",
            ["http://localhost:5173", "http://localhost:3000"],
        )
    )

    # --- Redis ---
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # --- JWT ---
    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY",
        "CHANGE-ME-this-is-not-safe-for-production-use-a-long-random-string",
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = _env_int("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 15)
    jwt_refresh_token_expire_days: int = _env_int("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7)


# A single shared instance. Import this from anywhere:
#     from app.config import settings
settings = Settings()
