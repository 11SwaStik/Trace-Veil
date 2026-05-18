"""Database setup: engine, session factory, Base, and init flow.

This file is the single home for everything Postgres-related at the
foundation level. Other parts of the app import:

  - `Base`         : the parent class every ORM model inherits from.
  - `get_session`  : a FastAPI dependency that hands a route one DB session
                     and commits/rolls back when the route returns.
  - `init_db`      : called once at app startup to create any tables that
                     are declared on `Base` but don't yet exist in Postgres.

Async note: we use SQLAlchemy's async API (`AsyncEngine`, `AsyncSession`)
because FastAPI itself is async — keeping the DB layer async means a
single slow query doesn't block the whole server.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Parent class for every ORM model in the project.

    A future model will look like:

        class Event(Base):
            __tablename__ = "events"
            id: Mapped[int] = mapped_column(primary_key=True)
            ...
    """


# Built once, on module import. `create_async_engine` is cheap — it just
# stores config. Actual DB connections are opened lazily when a query runs.
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.debug,   # log SQL when DEBUG=true
    pool_pre_ping=True,    # checks a pooled connection is alive before reuse
)

# `async_sessionmaker` is a factory: call `SessionLocal()` to get a fresh
# session bound to the engine above.
SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Create any tables declared on `Base` that don't yet exist.

    Called once at app startup (see app/main.py lifespan). When you add
    a real migration tool (e.g. Alembic) later, this function goes away
    and migrations take over — but for the foundation, this is enough
    to get tables on disk without extra tooling.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_db() -> None:
    """Close all pooled connections. Called once at app shutdown."""
    await engine.dispose()


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency. Use it in a route like:

        @router.get("/things")
        async def list_things(db: AsyncSession = Depends(get_session)):
            ...

    Commits on a clean return, rolls back if the route raises.
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
