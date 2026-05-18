"""Alert Service — async event loop.

Lifecycle:
  1. Create DB tables (idempotent via create_all)
  2. Load all enabled detection rules into memory
  3. psubscribe to simulation:*:events on Redis
  4. For each event: evaluate every rule; on match write an Alert row
     and publish ALERT_FIRED to alerts:{simulation_id}
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal, dispose_db, init_db
from app.models import Alert, DetectionRule
from scripts.seed_rules import seed as seed_rules

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
log = logging.getLogger("traceveil.alert")

# Severity ladder used for >= comparisons
_SEVERITY_RANK: dict[str, int] = {
    "LOW": 0,
    "MEDIUM": 1,
    "HIGH": 2,
    "CRITICAL": 3,
}


# ── Rule loading ──────────────────────────────────────────────────────────────

async def _load_rules() -> list[DetectionRule]:
    async with SessionLocal() as session:
        result = await session.execute(
            select(DetectionRule).where(DetectionRule.enabled.is_(True))
        )
        return list(result.scalars().all())


# ── Rule evaluation ───────────────────────────────────────────────────────────

def _matches(rule: DetectionRule, event: dict) -> bool:
    if rule.event_type_filter != event.get("event_type", ""):
        return False
    event_rank = _SEVERITY_RANK.get(event.get("severity", "LOW"), 0)
    rule_rank = _SEVERITY_RANK.get(rule.severity_min, 0)
    return event_rank >= rule_rank


# ── Alert persistence + publish ───────────────────────────────────────────────

async def _fire_alert(
    rule: DetectionRule,
    event: dict,
    sim_id: str,
    redis: aioredis.Redis,
) -> None:
    alert_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    affected_node = event.get("target_node_id") or event.get("source_node_id")

    async with SessionLocal() as session:
        session.add(
            Alert(
                id=alert_id,
                simulation_id=sim_id,
                event_id=event.get("event_id"),
                rule_id=rule.id,
                severity=rule.alert_severity,
                title=rule.alert_title,
                affected_node_id=affected_node,
                created_at=now,
                acknowledged=False,
            )
        )
        await session.commit()

    payload = json.dumps({
        "type": "ALERT_FIRED",
        "alert_id": str(alert_id),
        "simulation_id": sim_id,
        "rule_name": rule.name,
        "severity": rule.alert_severity,
        "title": rule.alert_title,
        "affected_node_id": affected_node,
        "created_at": now.isoformat(),
    })
    await redis.publish(f"alerts:{sim_id}", payload)
    log.info(
        "alert fired rule=%r sim=%s severity=%s",
        rule.name, sim_id, rule.alert_severity,
    )


# ── Main loop ─────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("Alert Service starting up")

    await init_db()
    log.info("DB tables ready")

    await seed_rules()

    rules = await _load_rules()
    log.info("Loaded %d detection rules", len(rules))

    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()
    await pubsub.psubscribe("simulation:*:events")
    log.info("Subscribed to simulation:*:events — waiting for events")

    try:
        async for message in pubsub.listen():
            if message["type"] != "pmessage":
                continue

            channel: str = message.get("channel", "")
            raw: str = message.get("data", "")

            # "simulation:{sim_id}:events" → ["simulation", sim_id, "events"]
            parts = channel.split(":")
            if len(parts) != 3:
                continue
            sim_id = parts[1]

            try:
                event = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                log.warning("non-JSON on %s: %r", channel, raw)
                continue

            log.debug("event sim=%s type=%s severity=%s",
                      sim_id, event.get("event_type"), event.get("severity"))

            for rule in rules:
                if _matches(rule, event):
                    await _fire_alert(rule, event, sim_id, redis)

    except asyncio.CancelledError:
        log.info("Alert Service shutting down")
    finally:
        await pubsub.punsubscribe()
        await redis.aclose()
        await dispose_db()
        log.info("Alert Service shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
