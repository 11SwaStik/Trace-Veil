"""Celery task: run_simulation.

The Celery task itself is synchronous (Celery workers are sync by default).
All real work happens inside _run(), an async coroutine executed via
asyncio.run() so we can use the same async SQLAlchemy + asyncio Redis
patterns as every other service.

Data flow:
  API dispatches task → Celery picks it up → _run() executes:
    load sim + scenario  →  generate topology  →  save topology to DB
    →  publish STATE_SYNC  →  create Replay record
    →  asyncio.gather(fire_events, listen_commands)
    →  update final status (COMPLETED or STOPPED)
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy import text

from config import settings
from database import SessionLocal, dispose_db, init_db
from event_loop import SimState, fire_events, listen_commands
from topology import generate_topology
from worker import celery_app

log = logging.getLogger("traceveil.engine.tasks")


# ── Async implementation ──────────────────────────────────────────────────────

async def _run(simulation_id: str) -> None:
    await init_db()

    # Dedicated publish client — shared across fire_events publishes
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)

    try:
        # ── 1. LOAD ───────────────────────────────────────────────────────────
        async with SessionLocal() as session:
            sim_row = (await session.execute(
                text("""
                    SELECT id, scenario_id, user_id, status, attack_speed
                    FROM simulations
                    WHERE id = :id
                """),
                {"id": simulation_id},
            )).fetchone()

        if not sim_row:
            log.error("simulation %s not found — aborting", simulation_id)
            return

        sim_status = sim_row[3]
        if sim_status not in ("INITIALIZING", "RUNNING"):
            log.warning(
                "simulation %s has status=%s — aborting (expected INITIALIZING or RUNNING)",
                simulation_id, sim_status,
            )
            return

        scenario_id  = str(sim_row[1])
        attack_speed = float(sim_row[4]) if sim_row[4] else 1.0

        async with SessionLocal() as session:
            scenario_row = (await session.execute(
                text("SELECT name, steps FROM scenarios WHERE id = :id"),
                {"id": scenario_id},
            )).fetchone()

        if not scenario_row:
            log.error("scenario %s not found for simulation %s", scenario_id, simulation_id)
            return

        scenario_name  = scenario_row[0]
        scenario_steps = scenario_row[1]   # asyncpg returns JSONB as a Python list

        log.info(
            "sim=%s scenario=%r steps=%d speed=%.1fx",
            simulation_id, scenario_name, len(scenario_steps), attack_speed,
        )

        # ── 2. TOPOLOGY ───────────────────────────────────────────────────────
        topology = generate_topology(scenario_steps)

        async with SessionLocal() as session:
            await session.execute(
                text("""
                    UPDATE simulations
                    SET topology   = :topology::jsonb,
                        status     = 'RUNNING',
                        started_at = :now
                    WHERE id = :id
                """),
                {
                    "topology": json.dumps(topology),
                    "now":      datetime.now(timezone.utc),
                    "id":       simulation_id,
                },
            )
            await session.commit()

        log.info("sim=%s topology saved (%d nodes, %d edges)",
                 simulation_id, len(topology["nodes"]), len(topology["edges"]))

        # ── 3. STATE_SYNC ─────────────────────────────────────────────────────
        await redis.publish(
            f"simulation:{simulation_id}:events",
            json.dumps({
                "type":          "STATE_SYNC",
                "simulation_id": simulation_id,
                "topology":      topology,
            }),
        )
        log.info("sim=%s STATE_SYNC published", simulation_id)

        # ── 4. REPLAY RECORD ──────────────────────────────────────────────────
        replay_id    = str(uuid.uuid4())
        total_events = len(scenario_steps) * 2     # attack event + NODE_STATE_CHANGE per step
        duration_ms  = sum(s.get("delay_ms", 0) for s in scenario_steps)

        async with SessionLocal() as session:
            await session.execute(
                text("""
                    INSERT INTO replays (id, simulation_id, name, total_events, duration_ms, created_at)
                    VALUES (:id, :simulation_id, :name, :total_events, :duration_ms, :created_at)
                """),
                {
                    "id":           replay_id,
                    "simulation_id": simulation_id,
                    "name":         f"{scenario_name} replay",
                    "total_events": total_events,
                    "duration_ms":  duration_ms,
                    "created_at":   datetime.now(timezone.utc),
                },
            )
            await session.commit()

        log.info("sim=%s replay record created id=%s total_events=%d duration_ms=%d",
                 simulation_id, replay_id, total_events, duration_ms)

        # ── 5. STATE ──────────────────────────────────────────────────────────
        state = SimState(
            running=asyncio.Event(),
            stopped=asyncio.Event(),
        )
        state.running.set()    # start unpaused

        # ── 6. RUN ────────────────────────────────────────────────────────────
        # fire_events uses the shared publish client.
        # listen_commands opens its own dedicated pubsub connection internally.
        await asyncio.gather(
            fire_events(
                simulation_id=simulation_id,
                scenario_steps=scenario_steps,
                topology=topology,
                attack_speed=attack_speed,
                replay_id=replay_id,
                state=state,
                redis=redis,
                db_session_factory=SessionLocal,
            ),
            listen_commands(
                simulation_id=simulation_id,
                state=state,
            ),
        )

        # ── 7. FINAL STATUS ───────────────────────────────────────────────────
        final_status = "COMPLETED" if state.completed_naturally else "STOPPED"

        async with SessionLocal() as session:
            await session.execute(
                text("""
                    UPDATE simulations
                    SET status       = :status,
                        completed_at = :now
                    WHERE id = :id
                """),
                {
                    "status": final_status,
                    "now":    datetime.now(timezone.utc),
                    "id":     simulation_id,
                },
            )
            await session.commit()

        log.info("sim=%s finished status=%s", simulation_id, final_status)

    except Exception:
        log.exception("sim=%s unexpected error — marking STOPPED", simulation_id)

        # Best-effort status update on crash
        try:
            async with SessionLocal() as session:
                await session.execute(
                    text("""
                        UPDATE simulations
                        SET status       = 'STOPPED',
                            completed_at = :now
                        WHERE id = :id
                    """),
                    {"now": datetime.now(timezone.utc), "id": simulation_id},
                )
                await session.commit()
        except Exception:
            log.exception("sim=%s also failed to update status after crash", simulation_id)

        raise   # re-raise so Celery marks the task as FAILURE

    finally:
        await redis.aclose()
        await dispose_db()


# ── Celery task (sync shell) ──────────────────────────────────────────────────

@celery_app.task(name="run_simulation", bind=True, max_retries=0)
def run_simulation(self, simulation_id: str) -> None:
    """Entry point called by Celery. Delegates to the async _run coroutine."""
    log.info("task received sim=%s", simulation_id)
    asyncio.run(_run(simulation_id))
    log.info("task complete sim=%s", simulation_id)
