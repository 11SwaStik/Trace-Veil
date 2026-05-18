"""Playback engine — manages per-replay asyncio tasks and Redis cursor state.

Redis key  replay:{replay_id}:cursor  stores a JSON object:
    {"status": "PLAYING|PAUSED|STOPPED", "sequence": <int>, "speed": <float>}

The task reads this cursor on every event so that pause/stop/speed changes
made via the API endpoints are picked up without restarting the task.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Replay, ReplayEvent
from app.redis_client import get_redis

log = logging.getLogger("traceveil.replay.playback")

# One background task per active replay_id (string form of UUID)
_tasks: dict[str, asyncio.Task] = {}

_CURSOR_TTL = 86_400   # Redis key expiry — 24 h
_PAUSE_POLL  = 0.2     # seconds between pause-state checks


# ── Cursor helpers ────────────────────────────────────────────────────────────

async def _get_cursor(replay_id: str) -> dict[str, Any]:
    raw = await get_redis().get(f"replay:{replay_id}:cursor")
    if not raw:
        return {"status": "STOPPED", "sequence": 0, "speed": 1.0}
    return json.loads(raw)


async def _set_cursor(replay_id: str, data: dict[str, Any]) -> None:
    await get_redis().set(
        f"replay:{replay_id}:cursor", json.dumps(data), ex=_CURSOR_TTL
    )


async def _patch_cursor(replay_id: str, **kwargs: Any) -> dict[str, Any]:
    cursor = await _get_cursor(replay_id)
    cursor.update(kwargs)
    await _set_cursor(replay_id, cursor)
    return cursor


# ── Background play loop ──────────────────────────────────────────────────────

async def _play_loop(replay_id: str, simulation_id: str, start_sequence: int) -> None:
    redis = get_redis()
    channel = f"simulation:{simulation_id}:events"

    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(ReplayEvent)
                .where(ReplayEvent.replay_id == replay_id)  # type: ignore[arg-type]
                .where(ReplayEvent.sequence_number >= start_sequence)
                .order_by(ReplayEvent.sequence_number)
            )
        ).scalars().all()

    for event in rows:
        cursor = await _get_cursor(replay_id)

        if cursor["status"] == "STOPPED":
            break

        # Spin-wait while paused
        while cursor["status"] == "PAUSED":
            await asyncio.sleep(_PAUSE_POLL)
            cursor = await _get_cursor(replay_id)
            if cursor["status"] == "STOPPED":
                _tasks.pop(replay_id, None)
                return

        speed = max(float(cursor.get("speed", 1.0)), 0.1)
        delay_s = event.delay_ms / speed / 1000
        if delay_s > 0:
            await asyncio.sleep(delay_s)

        payload = dict(event.payload)
        payload.setdefault("type", event.event_type)
        await redis.publish(channel, json.dumps(payload))
        await _patch_cursor(replay_id, sequence=event.sequence_number)

    await _set_cursor(replay_id, {"status": "STOPPED", "sequence": 0, "speed": 1.0})
    _tasks.pop(replay_id, None)
    log.info("replay %s playback complete", replay_id)


# ── Public control functions ──────────────────────────────────────────────────

async def start_playback(replay_id: str, simulation_id: str) -> None:
    """Start (or resume) playback from the current cursor sequence."""
    cursor = await _get_cursor(replay_id)

    if cursor["status"] == "PAUSED":
        await _patch_cursor(replay_id, status="PLAYING")
        return

    if replay_id in _tasks and not _tasks[replay_id].done():
        return  # already playing

    start_seq = cursor.get("sequence", 0)
    await _set_cursor(replay_id, {
        "status": "PLAYING",
        "sequence": start_seq,
        "speed": cursor.get("speed", 1.0),
    })
    _tasks[replay_id] = asyncio.create_task(
        _play_loop(replay_id, simulation_id, start_seq),
        name=f"replay-{replay_id}",
    )
    log.info("replay %s started from seq=%d", replay_id, start_seq)


async def pause_playback(replay_id: str) -> None:
    await _patch_cursor(replay_id, status="PAUSED")
    log.info("replay %s paused", replay_id)


async def stop_playback(replay_id: str) -> None:
    task = _tasks.pop(replay_id, None)
    if task and not task.done():
        task.cancel()
    await _set_cursor(replay_id, {"status": "STOPPED", "sequence": 0, "speed": 1.0})
    log.info("replay %s stopped", replay_id)


async def seek_playback(replay: Replay, position: float) -> int:
    """Seek to a fractional position (0.0–1.0) through the event log.

    Steps:
      1. Cancel the running task (if any)
      2. Compute target sequence_number
      3. Load all NODE_STATE_CHANGE events up to that sequence and merge them
         into a STATE_SYNC payload so the frontend canvas reflects the new position
      4. Publish STATE_SYNC, update cursor, restart the play loop from there
    """
    replay_id = str(replay.id)
    simulation_id = replay.simulation_id

    task = _tasks.pop(replay_id, None)
    if task and not task.done():
        task.cancel()

    position = max(0.0, min(1.0, position))
    target_seq = int(position * max(replay.total_events - 1, 0))

    # Reconstruct node states from all NODE_STATE_CHANGE events up to target
    async with SessionLocal() as session:
        state_rows = (
            await session.execute(
                select(ReplayEvent)
                .where(ReplayEvent.replay_id == replay.id)
                .where(ReplayEvent.event_type == "NODE_STATE_CHANGE")
                .where(ReplayEvent.sequence_number <= target_seq)
                .order_by(ReplayEvent.sequence_number)
            )
        ).scalars().all()

    node_states: dict[str, Any] = {}
    for ev in state_rows:
        nid = ev.node_id or ev.payload.get("node_id")
        if nid:
            node_states[nid] = ev.payload

    redis = get_redis()
    await redis.publish(
        f"simulation:{simulation_id}:events",
        json.dumps({
            "type": "STATE_SYNC",
            "simulation_id": simulation_id,
            "node_states": node_states,
        }),
    )

    prior_speed = (await _get_cursor(replay_id)).get("speed", 1.0)
    await _set_cursor(replay_id, {
        "status": "PLAYING",
        "sequence": target_seq,
        "speed": prior_speed,
    })

    _tasks[replay_id] = asyncio.create_task(
        _play_loop(replay_id, simulation_id, target_seq),
        name=f"replay-{replay_id}",
    )
    log.info("replay %s seeked to seq=%d (position=%.2f)", replay_id, target_seq, position)
    return target_seq


async def set_speed(replay_id: str, multiplier: float) -> float:
    multiplier = max(0.1, min(multiplier, 16.0))
    await _patch_cursor(replay_id, speed=multiplier)
    log.info("replay %s speed set to %.1fx", replay_id, multiplier)
    return multiplier


async def get_cursor(replay_id: str) -> dict[str, Any]:
    return await _get_cursor(replay_id)


def cancel_all() -> None:
    """Cancel every active task — called on app shutdown."""
    for task in _tasks.values():
        task.cancel()
    _tasks.clear()
