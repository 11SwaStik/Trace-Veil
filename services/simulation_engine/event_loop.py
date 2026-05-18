"""Core simulation coroutines.

Two coroutines run concurrently via asyncio.gather() in the Celery task:

  fire_events      — steps through scenario events, publishes to Redis + writes DB
  listen_commands  — watches simulation:{id}:commands for PAUSE / RESUME / STOP

Coordination uses SimState: two asyncio.Event objects that both coroutines
share. No locks needed — asyncio is single-threaded.

  state.running   set=playing, cleared=paused
  state.stopped   set=stop requested (or all steps completed)
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from config import settings
from models import SimulationEvent

log = logging.getLogger("traceveil.engine.event_loop")


# ── Shared state ──────────────────────────────────────────────────────────────

@dataclass
class SimState:
    # cleared = paused, set = running — starts set (unpaused)
    running: asyncio.Event = field(default_factory=asyncio.Event)
    # set = stop has been requested or all steps completed — starts cleared
    stopped: asyncio.Event = field(default_factory=asyncio.Event)
    # True only when fire_events iterates every step without a STOP command
    completed_naturally: bool = False


# ── Node status transitions per event type ────────────────────────────────────

_NODE_STATUS: dict[str, str] = {
    "INITIAL_ACCESS":       "COMPROMISED",
    "LATERAL_MOVEMENT":     "COMPROMISED",
    "PRIVILEGE_ESCALATION": "ELEVATED",
    "COLLECTION":           "EXFILTRATING",
    "EXFILTRATION":         "EXFILTRATING",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pick_node(topology: dict[str, Any], node_type: str) -> dict[str, Any] | None:
    """Return the first node in the topology that matches node_type."""
    for node in topology.get("nodes", []):
        if node.get("type") == node_type:
            return node
    return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _insert_replay_event(
    session: AsyncSession,
    replay_id: str,
    seq: int,
    event_type: str,
    payload: dict[str, Any],
    delay_ms: int,
    node_id: str | None,
) -> None:
    """Write one row to replay_events using raw SQL (table owned by replay_engine)."""
    await session.execute(
        text("""
            INSERT INTO replay_events
                (id, replay_id, sequence_number, event_type, payload, delay_ms, node_id)
            VALUES
                (:id, :replay_id, :seq, :event_type, :payload::jsonb, :delay_ms, :node_id)
        """),
        {
            "id":         str(uuid.uuid4()),
            "replay_id":  replay_id,
            "seq":        seq,
            "event_type": event_type,
            "payload":    json.dumps(payload),
            "delay_ms":   delay_ms,
            "node_id":    node_id,
        },
    )


# ── Coroutine 1: event publisher ──────────────────────────────────────────────

async def fire_events(
    simulation_id: str,
    scenario_steps: list[dict[str, Any]],
    topology: dict[str, Any],
    attack_speed: float,
    replay_id: str,
    state: SimState,
    redis: aioredis.Redis,
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Iterate scenario steps and fire attack events + node state changes.

    Each step produces two Redis publishes and two DB writes:
      1. The attack event  (e.g. LATERAL_MOVEMENT)
      2. A NODE_STATE_CHANGE event for the target node

    The global sequence counter increments for every publish so the replay
    engine can reconstruct exact ordering.
    """
    channel = f"simulation:{simulation_id}:events"
    seq = 0  # global sequence, increments per published event

    for step in scenario_steps:
        # ── pause / stop gates ────────────────────────────────────────────────
        await state.running.wait()          # blocks here while paused
        if state.stopped.is_set():
            break

        # ── probability roll ──────────────────────────────────────────────────
        if random.random() > step.get("probability", 1.0):
            log.debug("sim=%s step=%s skipped (probability roll)", simulation_id, step.get("event_type"))
            continue

        # ── timing delay ──────────────────────────────────────────────────────
        delay_s = step.get("delay_ms", 0) / max(attack_speed, 0.1) / 1000
        if delay_s > 0:
            await asyncio.sleep(delay_s)

        # ── re-check stop after sleep (a STOP could arrive during the delay) ──
        if state.stopped.is_set():
            break

        # ── resolve nodes ─────────────────────────────────────────────────────
        src_node = _pick_node(topology, step.get("source_node_type", ""))
        tgt_node = _pick_node(topology, step.get("target_node_type", ""))
        src_id   = src_node["id"] if src_node else None
        tgt_id   = tgt_node["id"] if tgt_node else None

        # ── build attack event ────────────────────────────────────────────────
        event_type = step.get("event_type", "UNKNOWN")
        severity   = step.get("severity", "MEDIUM")
        attack_seq = seq
        seq += 1

        attack_payload: dict[str, Any] = {
            "event_id":         str(uuid.uuid4()),
            "type":             event_type,
            "event_type":       event_type,
            "simulation_id":    simulation_id,
            "severity":         severity,
            "ttp_id":           step.get("ttp_id"),
            "source_node_id":   src_id,
            "target_node_id":   tgt_id,
            "source_node_type": step.get("source_node_type"),
            "target_node_type": step.get("target_node_type"),
            "description":      step.get("description", ""),
            "timestamp":        _now_iso(),
            "sequence_number":  attack_seq,
        }

        await redis.publish(channel, json.dumps(attack_payload))
        log.info(
            "sim=%s seq=%d type=%s severity=%s src=%s tgt=%s",
            simulation_id, attack_seq, event_type, severity,
            step.get("source_node_type"), step.get("target_node_type"),
        )

        # ── build NODE_STATE_CHANGE ───────────────────────────────────────────
        new_status   = _NODE_STATUS.get(event_type, "COMPROMISED")
        node_chg_seq = seq
        seq += 1

        node_change_payload: dict[str, Any] = {
            "type":            "NODE_STATE_CHANGE",
            "event_type":      "NODE_STATE_CHANGE",
            "node_id":         tgt_id,
            "new_status":      new_status,
            "simulation_id":   simulation_id,
            "sequence_number": node_chg_seq,
            "timestamp":       _now_iso(),
        }

        await redis.publish(channel, json.dumps(node_change_payload))
        log.debug("sim=%s seq=%d NODE_STATE_CHANGE node=%s status=%s",
                  simulation_id, node_chg_seq, tgt_id, new_status)

        # ── persist to DB (SimulationEvent ORM + ReplayEvent raw SQL) ─────────
        async with db_session_factory() as session:
            # Audit log — this service owns this table
            session.add(SimulationEvent(
                simulation_id=simulation_id,
                sequence_number=attack_seq,
                event_type=event_type,
                severity=severity,
                source_node_id=src_id,
                target_node_id=tgt_id,
                ttp_id=step.get("ttp_id"),
                payload=attack_payload,
                fired_at=datetime.now(timezone.utc),
            ))

            # Replay events — raw SQL, table owned by replay_engine
            await _insert_replay_event(
                session, replay_id, attack_seq,
                event_type, attack_payload,
                step.get("delay_ms", 0), tgt_id,
            )
            await _insert_replay_event(
                session, replay_id, node_chg_seq,
                "NODE_STATE_CHANGE", node_change_payload,
                0, tgt_id,
            )

            await session.commit()

    # Reached here only when the for loop exhausted all steps without a STOP
    state.completed_naturally = True
    state.stopped.set()
    log.info("sim=%s fire_events finished (seq_total=%d)", simulation_id, seq)


# ── Coroutine 2: command listener ─────────────────────────────────────────────

async def listen_commands(simulation_id: str, state: SimState) -> None:
    """Subscribe to simulation:{id}:commands and mutate SimState accordingly.

    Uses its own dedicated Redis connection (pub/sub blocks a connection in
    listen mode — must not share with the publishing client).

    Exits when state.stopped is set, whether by fire_events completing
    naturally or by receiving a STOP command.
    """
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()
    channel = f"simulation:{simulation_id}:commands"

    await pubsub.subscribe(channel)
    log.info("sim=%s command listener ready on %s", simulation_id, channel)

    try:
        while not state.stopped.is_set():
            # Non-blocking poll with a short timeout so we check state.stopped
            # regularly even when no commands arrive.
            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=0.5
            )
            if message is None:
                continue

            data = message.get("data", "")
            if not isinstance(data, str):
                continue

            cmd = data.strip().upper()

            if cmd == "PAUSE":
                state.running.clear()
                log.info("sim=%s PAUSED via command", simulation_id)

            elif cmd == "RESUME":
                state.running.set()
                log.info("sim=%s RESUMED via command", simulation_id)

            elif cmd == "STOP":
                state.stopped.set()
                state.running.set()   # unblock fire_events if currently paused
                log.info("sim=%s STOPPED via command", simulation_id)
                return

            else:
                log.debug("sim=%s unknown command: %r", simulation_id, cmd)

    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await redis.aclose()
        log.info("sim=%s command listener shut down", simulation_id)
