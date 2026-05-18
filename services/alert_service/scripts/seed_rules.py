"""Seed the detection_rules table with 5 default rules.

Run from services/alert_service/:
    python -m scripts.seed_rules
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import func, select

from app.database import SessionLocal, dispose_db, init_db
from app.models import DetectionRule

logging.basicConfig(level="INFO", format="%(levelname)s %(message)s")
log = logging.getLogger("traceveil.seed_rules")

_RULES = [
    DetectionRule(
        name="Initial Access Detected",
        event_type_filter="INITIAL_ACCESS",
        severity_min="HIGH",
        alert_title="Initial Access Attempt Detected",
        alert_severity="HIGH",
        enabled=True,
    ),
    DetectionRule(
        name="Lateral Movement Detected",
        event_type_filter="LATERAL_MOVEMENT",
        severity_min="HIGH",
        alert_title="Lateral Movement Activity Detected",
        alert_severity="HIGH",
        enabled=True,
    ),
    DetectionRule(
        name="Privilege Escalation Detected",
        event_type_filter="PRIVILEGE_ESCALATION",
        severity_min="CRITICAL",
        alert_title="Critical Privilege Escalation Detected",
        alert_severity="CRITICAL",
        enabled=True,
    ),
    DetectionRule(
        name="Data Collection Detected",
        event_type_filter="COLLECTION",
        severity_min="HIGH",
        alert_title="Sensitive Data Collection Detected",
        alert_severity="HIGH",
        enabled=True,
    ),
    DetectionRule(
        name="Data Exfiltration Detected",
        event_type_filter="EXFILTRATION",
        severity_min="CRITICAL",
        alert_title="Critical Data Exfiltration Detected",
        alert_severity="CRITICAL",
        enabled=True,
    ),
]


async def seed() -> None:
    async with SessionLocal() as session:
        count = await session.scalar(
            select(func.count()).select_from(DetectionRule)
        )
        if count and count > 0:
            log.info("detection_rules already seeded (%d rows) — skipping", count)
            return

        for rule in _RULES:
            session.add(rule)
        await session.commit()
        log.info("Seeded %d detection rules", len(_RULES))


if __name__ == "__main__":
    async def _main() -> None:
        await init_db()
        await seed()
        await dispose_db()

    asyncio.run(_main())
