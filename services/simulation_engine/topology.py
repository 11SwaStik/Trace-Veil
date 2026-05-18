"""Network topology generator.

Takes a scenario's step list and produces a graph of nodes + edges that
represents the target network the simulation will attack.

Design rules:
  - One node per unique node type across all steps (no duplicates)
  - Labels are short and realistic (WS-01, DC-01, DB-01, ...)
  - IPs are deterministic fake private addresses in 10.0.1.x
  - Edges are derived from consecutive source→target pairs in the steps
  - Protocol is inferred from the node types on each end of the edge
  - Node status starts as CLEAN for all nodes
"""

from __future__ import annotations

import uuid
from typing import Any

# ── Label templates per node type ────────────────────────────────────────────

_LABELS: dict[str, str] = {
    "WORKSTATION":        "WS-01",
    "SERVER":             "SRV-01",
    "DATABASE":           "DB-01",
    "DOMAIN_CONTROLLER":  "DC-01",
    "FIREWALL":           "FW-01",
    "EMAIL_SERVER":       "MAIL-01",
    "WEB_SERVER":         "WEB-01",
    "JUMP_SERVER":        "JUMP-01",
}

# ── Protocol inference ────────────────────────────────────────────────────────
# Keyed by (source_type, target_type) → protocol.
# Fall back to "TCP" when the pair isn't listed.

_PROTOCOLS: dict[tuple[str, str], str] = {
    ("WORKSTATION",       "DOMAIN_CONTROLLER"): "LDAP",
    ("WORKSTATION",       "SERVER"):            "SMB",
    ("WORKSTATION",       "DATABASE"):          "TCP",
    ("WORKSTATION",       "EMAIL_SERVER"):      "SMTP",
    ("SERVER",            "DATABASE"):          "TCP",
    ("SERVER",            "DOMAIN_CONTROLLER"): "LDAP",
    ("SERVER",            "SERVER"):            "SMB",
    ("DOMAIN_CONTROLLER", "SERVER"):            "SMB",
    ("DOMAIN_CONTROLLER", "WORKSTATION"):       "SMB",
    ("FIREWALL",          "SERVER"):            "TCP",
    ("FIREWALL",          "WORKSTATION"):       "TCP",
    ("EMAIL_SERVER",      "WORKSTATION"):       "SMTP",
    ("JUMP_SERVER",       "SERVER"):            "SSH",
    ("JUMP_SERVER",       "WORKSTATION"):       "RDP",
    ("WEB_SERVER",        "SERVER"):            "HTTPS",
    ("WEB_SERVER",        "DATABASE"):          "TCP",
}


def _protocol(src_type: str, tgt_type: str) -> str:
    return _PROTOCOLS.get((src_type, tgt_type), "TCP")


# ── IP assignment ─────────────────────────────────────────────────────────────

def _assign_ips(node_types: list[str]) -> dict[str, str]:
    """Return a mapping of node_type → fake private IP."""
    return {
        node_type: f"10.0.1.{10 + i}"
        for i, node_type in enumerate(node_types)
    }


# ── Public API ────────────────────────────────────────────────────────────────

def generate_topology(steps: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a network topology dict from a scenario's step list.

    Returns:
        {
            "nodes": [
                {
                    "id":     "<uuid>",
                    "type":   "WORKSTATION",
                    "label":  "WS-01",
                    "ip":     "10.0.1.10",
                    "status": "CLEAN"
                },
                ...
            ],
            "edges": [
                {
                    "id":       "<uuid>",
                    "source":   "<node-uuid>",
                    "target":   "<node-uuid>",
                    "protocol": "SMB"
                },
                ...
            ]
        }
    """
    # ── 1. Collect unique node types in the order they first appear ───────────
    seen: set[str] = set()
    ordered_types: list[str] = []
    for step in steps:
        for key in ("source_node_type", "target_node_type"):
            ntype = step.get(key, "")
            if ntype and ntype not in seen:
                seen.add(ntype)
                ordered_types.append(ntype)

    # ── 2. Build nodes ────────────────────────────────────────────────────────
    ip_map = _assign_ips(ordered_types)
    nodes: list[dict[str, Any]] = []
    node_id_by_type: dict[str, str] = {}

    for ntype in ordered_types:
        nid = str(uuid.uuid4())
        node_id_by_type[ntype] = nid
        nodes.append({
            "id":     nid,
            "type":   ntype,
            "label":  _LABELS.get(ntype, ntype[:3] + "-01"),
            "ip":     ip_map[ntype],
            "status": "CLEAN",
        })

    # ── 3. Build edges from consecutive source→target pairs ───────────────────
    seen_edges: set[tuple[str, str]] = set()
    edges: list[dict[str, Any]] = []

    for step in steps:
        src_type = step.get("source_node_type", "")
        tgt_type = step.get("target_node_type", "")

        if not src_type or not tgt_type:
            continue
        if src_type == tgt_type:
            continue

        src_id = node_id_by_type.get(src_type)
        tgt_id = node_id_by_type.get(tgt_type)
        if not src_id or not tgt_id:
            continue

        pair = (src_id, tgt_id)
        if pair in seen_edges:
            continue
        seen_edges.add(pair)

        edges.append({
            "id":       str(uuid.uuid4()),
            "source":   src_id,
            "target":   tgt_id,
            "protocol": _protocol(src_type, tgt_type),
        })

    return {"nodes": nodes, "edges": edges}
