"""Seed the scenarios table with 3 pre-built attack scenarios.

Run from the services/api directory with the venv active:

    python -m scripts.seed_scenarios

Each scenario's `steps` list is the exact format the simulation engine
will consume: one dict per attack step, in execution order.

Step fields
-----------
event_type      : attack classification (maps to EventType enum later)
source_node_type: what kind of node initiates this step
target_node_type: what kind of node is targeted (or "SELF" for same-node)
ttp_id          : MITRE ATT&CK technique ID
severity        : LOW | MEDIUM | HIGH | CRITICAL
delay_ms        : milliseconds to wait before firing this step (at 1x speed)
probability     : 0.0-1.0 chance this step executes (adds realistic variance)
description     : human-readable label shown in the Attack Story panel
"""

from __future__ import annotations

import asyncio

from sqlalchemy import func, select

from app.database import SessionLocal, dispose_db, init_db
from app.modules.scenarios.models import Scenario

SCENARIOS: list[dict] = [
    {
        "name": "Lateral Movement",
        "description": (
            "An external attacker gains an initial foothold on an employee workstation "
            "via phishing, then moves laterally through the internal network toward a "
            "database server, escalating privileges along the way."
        ),
        "kill_chain_phases": [
            "RECON",
            "INITIAL_ACCESS",
            "EXECUTION",
            "LATERAL_MOVEMENT",
            "PERSISTENCE",
        ],
        "steps": [
            {
                "event_type": "RECON",
                "source_node_type": "ATTACKER",
                "target_node_type": "ANY",
                "ttp_id": "T1018",
                "severity": "LOW",
                "delay_ms": 2000,
                "probability": 1.0,
                "description": "Attacker performs network reconnaissance to map the target environment",
            },
            {
                "event_type": "INITIAL_ACCESS",
                "source_node_type": "ATTACKER",
                "target_node_type": "WORKSTATION",
                "ttp_id": "T1566",
                "severity": "HIGH",
                "delay_ms": 3000,
                "probability": 0.95,
                "description": "Spear-phishing email delivers malicious attachment; user opens it",
            },
            {
                "event_type": "EXECUTION",
                "source_node_type": "WORKSTATION",
                "target_node_type": "SELF",
                "ttp_id": "T1059",
                "severity": "HIGH",
                "delay_ms": 2000,
                "probability": 1.0,
                "description": "Malicious script executes on the compromised workstation",
            },
            {
                "event_type": "LATERAL_MOVEMENT",
                "source_node_type": "WORKSTATION",
                "target_node_type": "SERVER",
                "ttp_id": "T1021",
                "severity": "CRITICAL",
                "delay_ms": 4000,
                "probability": 0.85,
                "description": "Attacker uses stolen credentials to pivot from workstation to app server",
            },
            {
                "event_type": "PERSISTENCE",
                "source_node_type": "SERVER",
                "target_node_type": "SELF",
                "ttp_id": "T1547",
                "severity": "HIGH",
                "delay_ms": 2500,
                "probability": 0.9,
                "description": "Backdoor installed on server to maintain access after reboot",
            },
            {
                "event_type": "LATERAL_MOVEMENT",
                "source_node_type": "SERVER",
                "target_node_type": "DATABASE",
                "ttp_id": "T1021",
                "severity": "CRITICAL",
                "delay_ms": 4000,
                "probability": 0.8,
                "description": "Attacker pivots from app server to database server using internal trust",
            },
        ],
    },
    {
        "name": "Credential Dump",
        "description": (
            "An attacker exploits a public-facing vulnerability to gain initial access, "
            "then escalates privileges and extracts credential hashes from the IAM system, "
            "enabling further compromise of any account in the environment."
        ),
        "kill_chain_phases": [
            "RECON",
            "INITIAL_ACCESS",
            "EXECUTION",
            "PRIVILEGE_ESCALATION",
            "CREDENTIAL_ACCESS",
            "LATERAL_MOVEMENT",
        ],
        "steps": [
            {
                "event_type": "RECON",
                "source_node_type": "ATTACKER",
                "target_node_type": "ANY",
                "ttp_id": "T1595",
                "severity": "LOW",
                "delay_ms": 2000,
                "probability": 1.0,
                "description": "Active scanning to identify exposed services and software versions",
            },
            {
                "event_type": "INITIAL_ACCESS",
                "source_node_type": "ATTACKER",
                "target_node_type": "SERVER",
                "ttp_id": "T1190",
                "severity": "HIGH",
                "delay_ms": 3500,
                "probability": 0.9,
                "description": "Exploit public-facing web application vulnerability to gain a shell",
            },
            {
                "event_type": "EXECUTION",
                "source_node_type": "SERVER",
                "target_node_type": "SELF",
                "ttp_id": "T1059",
                "severity": "HIGH",
                "delay_ms": 2000,
                "probability": 1.0,
                "description": "Attacker drops and runs a post-exploitation framework on the server",
            },
            {
                "event_type": "PRIVILEGE_ESCALATION",
                "source_node_type": "SERVER",
                "target_node_type": "SELF",
                "ttp_id": "T1068",
                "severity": "CRITICAL",
                "delay_ms": 3000,
                "probability": 0.85,
                "description": "Kernel exploit used to escalate from www-data to root",
            },
            {
                "event_type": "CREDENTIAL_ACCESS",
                "source_node_type": "SERVER",
                "target_node_type": "IAM",
                "ttp_id": "T1003",
                "severity": "CRITICAL",
                "delay_ms": 3500,
                "probability": 0.9,
                "description": "LSASS dumped — NTLM hashes for all domain accounts extracted",
            },
            {
                "event_type": "LATERAL_MOVEMENT",
                "source_node_type": "SERVER",
                "target_node_type": "WORKSTATION",
                "ttp_id": "T1078",
                "severity": "CRITICAL",
                "delay_ms": 4000,
                "probability": 0.8,
                "description": "Pass-the-hash used to authenticate as a domain admin on workstations",
            },
        ],
    },
    {
        "name": "Data Exfiltration",
        "description": (
            "A targeted attacker moves through the network from an initial workstation "
            "compromise all the way to the database, stages a large volume of sensitive "
            "records, and exfiltrates them over an encrypted C2 channel."
        ),
        "kill_chain_phases": [
            "RECON",
            "INITIAL_ACCESS",
            "LATERAL_MOVEMENT",
            "COLLECTION",
            "EXFILTRATION",
        ],
        "steps": [
            {
                "event_type": "RECON",
                "source_node_type": "ATTACKER",
                "target_node_type": "ANY",
                "ttp_id": "T1595",
                "severity": "LOW",
                "delay_ms": 2000,
                "probability": 1.0,
                "description": "Passive and active recon to identify network topology and targets",
            },
            {
                "event_type": "INITIAL_ACCESS",
                "source_node_type": "ATTACKER",
                "target_node_type": "WORKSTATION",
                "ttp_id": "T1566",
                "severity": "HIGH",
                "delay_ms": 3000,
                "probability": 0.95,
                "description": "Watering-hole attack compromises employee browser; payload delivered",
            },
            {
                "event_type": "LATERAL_MOVEMENT",
                "source_node_type": "WORKSTATION",
                "target_node_type": "SERVER",
                "ttp_id": "T1021",
                "severity": "CRITICAL",
                "delay_ms": 4000,
                "probability": 0.85,
                "description": "SMB lateral movement from workstation to application server",
            },
            {
                "event_type": "LATERAL_MOVEMENT",
                "source_node_type": "SERVER",
                "target_node_type": "DATABASE",
                "ttp_id": "T1021",
                "severity": "CRITICAL",
                "delay_ms": 4000,
                "probability": 0.8,
                "description": "Internal service account used to connect directly to the database host",
            },
            {
                "event_type": "COLLECTION",
                "source_node_type": "DATABASE",
                "target_node_type": "SELF",
                "ttp_id": "T1005",
                "severity": "HIGH",
                "delay_ms": 5000,
                "probability": 0.95,
                "description": "Attacker queries and stages ~2 GB of customer PII records locally",
            },
            {
                "event_type": "EXFILTRATION",
                "source_node_type": "DATABASE",
                "target_node_type": "ATTACKER",
                "ttp_id": "T1041",
                "severity": "CRITICAL",
                "delay_ms": 5000,
                "probability": 0.9,
                "description": "Staged data compressed and exfiltrated over HTTPS to attacker C2 server",
            },
        ],
    },
]


async def seed() -> None:
    await init_db()

    async with SessionLocal() as db:
        count = await db.scalar(select(func.count()).select_from(Scenario))
        if count and count > 0:
            print(f"Scenarios table already has {count} row(s) — skipping seed.")
            return

        for data in SCENARIOS:
            db.add(Scenario(**data))

        await db.commit()
        print(f"Seeded {len(SCENARIOS)} scenarios:")
        for s in SCENARIOS:
            print(f"  • {s['name']}")


if __name__ == "__main__":
    async def _main() -> None:
        await seed()
        await dispose_db()

    asyncio.run(_main())
