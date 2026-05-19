"""Pytest configuration and fixtures."""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import get_session
from app.main import create_app


@pytest.fixture
async def test_engine():
    """Create an in-memory SQLite test database engine with users table only."""
    test_db_url = "sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(test_db_url, echo=False)

    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL,
                last_login TIMESTAMP
            )
        """))

    yield engine

    await engine.dispose()


@pytest.fixture
async def test_session_maker(test_engine):
    """Create a session maker for the test database."""
    return async_sessionmaker(
        bind=test_engine, class_=AsyncSession, expire_on_commit=False
    )


@pytest.fixture
async def app(test_session_maker):
    """Create FastAPI app with test database."""
    app = create_app()

    async def override_get_session():
        async with test_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_session] = override_get_session
    return app


@pytest.fixture
async def client(app):
    """Create an async test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_session(test_session_maker):
    """Get a fresh database session for assertions."""
    async with test_session_maker() as session:
        yield session
