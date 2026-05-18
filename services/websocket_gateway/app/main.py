"""WebSocket Gateway — FastAPI application entry point.

Lifespan:
  startup  → spawn the Redis listener as a background asyncio task
  shutdown → cancel the listener, close the publish Redis client, dispose DB pool
"""

from __future__ import annotations

import asyncio
import logging

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.config import settings
from app.database import dispose_db
from app.listener import redis_listener
from app.redis_client import close_redis
from app.router import router

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
log = logging.getLogger("traceveil.ws.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # ── Startup ───────────────────────────────────────────────────────────────
    listener_task = asyncio.create_task(redis_listener(), name="redis-listener")
    log.info("WebSocket Gateway starting up")

    yield  # application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    log.info("WebSocket Gateway shutting down")
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass

    await close_redis()
    await dispose_db()
    log.info("WebSocket Gateway shutdown complete")


app = FastAPI(
    title="TraceVeil WebSocket Gateway",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}
