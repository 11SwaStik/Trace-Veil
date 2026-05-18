"""Minimal async database access for the WebSocket Gateway.

The gateway is read-only against the DB — it only fetches the simulation
topology JSON on client connect so it can send STATE_SYNC. No ORM models
are defined here; raw SQL via text() is enough.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
)

SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def dispose_db() -> None:
    await engine.dispose()
