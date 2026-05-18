"""Background Redis subscriber — routes incoming events to WebSocket rooms.

This coroutine runs for the entire lifetime of the gateway process. It
holds a dedicated Redis pub/sub connection and pattern-subscribes to:

    simulation:*:events   — attack events published by the simulation engine
    alerts:*              — ALERT_FIRED events published by the alert service

When a message arrives, it extracts the simulation_id from the channel name
and calls manager.broadcast() so the payload reaches every browser client
connected to that simulation's room.

Why psubscribe (pattern) instead of subscribe (exact channel)?
Because the gateway doesn't know which simulation_ids are active in advance.
The pattern approach means zero extra setup is needed when a new simulation
starts — the listener automatically receives its events.
"""

from __future__ import annotations

import asyncio
import json
import logging

import redis.asyncio as aioredis

from app.config import settings
from app.gateway import manager

log = logging.getLogger("traceveil.ws.listener")


def _extract_sim_id(channel: str) -> str | None:
    """Map a Redis channel name to its simulation_id.

    "simulation:{sim_id}:events"  → sim_id
    "alerts:{sim_id}"             → sim_id
    """
    if channel.startswith("simulation:") and channel.endswith(":events"):
        # "simulation:abc-123:events" → ["simulation", "abc-123", "events"]
        parts = channel.split(":")
        if len(parts) == 3:
            return parts[1]

    if channel.startswith("alerts:"):
        # "alerts:abc-123" → ("alerts", ":", "abc-123")
        _, _, sim_id = channel.partition(":")
        return sim_id or None

    return None


async def redis_listener() -> None:
    """Long-running coroutine started by the FastAPI lifespan on startup.

    Uses psubscribe so a single connection covers all simulation rooms.
    Exits cleanly when cancelled (triggered by app shutdown).
    """
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()

    await pubsub.psubscribe("simulation:*:events", "alerts:*")
    log.info("Redis listener ready — subscribed to simulation:*:events and alerts:*")

    try:
        async for message in pubsub.listen():
            # psubscribe yields "psubscribe" confirmations first, then "pmessage".
            if message["type"] != "pmessage":
                continue

            channel: str = message.get("channel", "")
            raw: str = message.get("data", "")

            sim_id = _extract_sim_id(channel)
            if not sim_id:
                log.debug("unroutable channel: %s", channel)
                continue

            try:
                payload = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                log.warning("non-JSON on channel %s: %r", channel, raw)
                continue

            await manager.broadcast(sim_id, payload)

    except asyncio.CancelledError:
        log.info("Redis listener cancelled — shutting down")
    finally:
        await pubsub.punsubscribe()
        await redis.aclose()
