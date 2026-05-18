from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Replay(Base):
    """Metadata for one replayable simulation run."""

    __tablename__ = "replays"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    simulation_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_events: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Sum of all event delay_ms values at 1× speed
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class ReplayEvent(Base):
    """One recorded event in a replay, ordered by sequence_number."""

    __tablename__ = "replay_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    replay_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("replays.id"), nullable=False
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Full event payload — re-published verbatim to Redis during playback
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    # Delay before this event fires (at 1× speed)
    delay_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_replay_events_replay_seq", "replay_id", "sequence_number"),
    )
