from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SimulationStatus(str, enum.Enum):
    """Lifecycle states a simulation moves through.

    str mixin means FastAPI/Pydantic can serialize these as plain strings
    without any extra configuration.
    """
    INITIALIZING = "INITIALIZING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    STOPPED = "STOPPED"


class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scenarios.id"), nullable=False
    )
    status: Mapped[SimulationStatus] = mapped_column(
        SAEnum(SimulationStatus, name="simulation_status"),
        nullable=False,
        default=SimulationStatus.INITIALIZING,
    )
    # Full topology JSON: {"nodes": [...], "edges": [...]}
    # Null until the simulation engine generates it at start time.
    topology: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    attack_speed: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SimulationEvent(Base):
    """Read-only view of simulation_events, owned by the simulation engine."""
    __tablename__ = "simulation_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    simulation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    source_node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ttp_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    fired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
