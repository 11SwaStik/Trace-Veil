"""Shared async Redis connection for the gateway.

The listener uses its own dedicated connection (for pub/sub, which blocks
the connection in listening mode). This module provides a separate pooled
connection used only for *publishing* commands back to Redis.
"""

from __future__ import annotations

import redis.asyncio as aioredis

from app.config import settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    """Return the shared Redis client, creating it on first call."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
