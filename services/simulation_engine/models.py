"""SQLAlchemy models owned by the simulation engine.

Only simulation_events is defined here. Tables owned by other services
(simulations, scenarios, replays, replay_events, alerts) must be accessed
via raw text() SQL — never via ORM models defined in this service.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SimulationEvent(Base):
    """Append-only audit log — one row per event fired during a simulation."""

    __tablename__ = "simulation_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    simulation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    source_node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ttp_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    fired_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_sim_events_sim_seq", "simulation_id", "sequence_number"),
    )
