"""Replay Engine — FastAPI entry point.

Lifespan:
  startup  → create DB tables (idempotent)
  shutdown → cancel any active playback tasks, close Redis, dispose DB pool
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.config import settings
from app.database import dispose_db, init_db
from app.playback import cancel_all
from app.redis_client import close_redis
from app.router import router

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
log = logging.getLogger("traceveil.replay.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()
    log.info("Replay Engine starting up")

    yield

    log.info("Replay Engine shutting down")
    cancel_all()
    await close_redis()
    await dispose_db()


app = FastAPI(
    title="TraceVeil Replay Engine",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}
