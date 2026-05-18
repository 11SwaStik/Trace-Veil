"""WebSocket endpoint — /ws/{simulation_id}

Full connection lifecycle:
  1. Validate JWT from ?token= query param (close 4001 if invalid)
  2. Accept connection and join the room for this simulation
  3. Query PostgreSQL for the simulation's topology and send STATE_SYNC
  4. Loop: read client messages and publish PAUSE/RESUME/STOP to Redis
  5. On disconnect (normal or error): leave the room cleanly

Redis events flow the *other* direction — the background listener in
listener.py receives them and calls manager.broadcast(), which pushes
them to this (and every other) connected client in the same room.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal
from app.gateway import manager
from app.redis_client import get_redis

router = APIRouter()
log = logging.getLogger("traceveil.ws.router")

# Client messages that map to Redis command-channel publishes.
_CONTROL_COMMANDS = {"PAUSE", "RESUME", "STOP"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _decode_token(token: str) -> str | None:
    """Return user_id (sub) for a valid access JWT, else None."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "access":
            return None
        return payload.get("sub")
    except JWTError:
        return None


async def _get_topology(simulation_id: str) -> dict | None:
    """Fetch the topology JSONB field from the simulations table.

    Returns None if the simulation doesn't exist yet or has no topology
    (engine hasn't generated it yet). The frontend handles a null topology
    gracefully by rendering an empty canvas.
    """
    async with SessionLocal() as session:
        result = await session.execute(
            text("SELECT topology FROM simulations WHERE id = :id"),
            {"id": simulation_id},
        )
        row = result.fetchone()
        return row[0] if row else None


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/{simulation_id}")
async def ws_endpoint(
    websocket: WebSocket,
    simulation_id: str,
    token: str = Query(..., description="JWT access token"),
) -> None:
    # ── 1. Authenticate ───────────────────────────────────────────────────
    user_id = _decode_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    log.info("user=%s connecting to room=%s", user_id, simulation_id)

    # ── 2. Accept + join room ─────────────────────────────────────────────
    await manager.connect(simulation_id, websocket)

    try:
        # ── 3. Send current topology as STATE_SYNC ────────────────────────
        topology = await _get_topology(simulation_id)
        await websocket.send_json({
            "type": "STATE_SYNC",
            "simulation_id": simulation_id,
            "topology": topology,
        })

        # ── 4. Client → Server message loop ──────────────────────────────
        # iter_text() yields one message per client send.
        # It raises WebSocketDisconnect when the client closes.
        redis = get_redis()
        commands_channel = f"simulation:{simulation_id}:commands"

        async for raw in websocket.iter_text():
            msg = raw.strip().upper()

            if msg in _CONTROL_COMMANDS:
                await redis.publish(commands_channel, msg)
                log.info("published command=%s room=%s", msg, simulation_id)
            else:
                log.debug("unknown client message room=%s: %r", simulation_id, raw)

    except WebSocketDisconnect:
        log.info("user=%s disconnected from room=%s", user_id, simulation_id)

    except Exception:
        log.exception("unexpected error in ws_endpoint room=%s", simulation_id)

    finally:
        # Always leave the room — even if an exception occurred.
        await manager.disconnect(simulation_id, websocket)
