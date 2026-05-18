"""FastAPI application entry point.

This is the first file that runs when you start the server with:

    uvicorn app.main:app --reload

It builds the app, configures CORS, mounts routers, and uses a
"lifespan" context to run startup/shutdown logic — creating database
tables on startup and closing the DB pool on shutdown.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import dispose_db, init_db
from app.redis_client import close_redis
from scripts.seed_scenarios import seed as seed_scenarios
from app.modules.alerts.router import router as alerts_router
from app.modules.auth.router import router as auth_router
from app.modules.scenarios.router import router as scenarios_router
from app.modules.simulations.router import router as simulations_router
from app.routes.health import router as health_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Runs once at startup, then once at shutdown."""
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
    )
    log = logging.getLogger("traceveil.api")
    log.info("startup env=%s", settings.env)

    await init_db()
    await seed_scenarios()
    try:
        yield
    finally:
        await dispose_db()
        await close_redis()
        log.info("shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Traceveil API",
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount routers. Feature modules under app/modules/<name>/ will register
    # their own routers here as the project grows.
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(scenarios_router)
    app.include_router(simulations_router)
    app.include_router(alerts_router)

    return app


# The object uvicorn looks for: `uvicorn app.main:app`.
app = create_app()
