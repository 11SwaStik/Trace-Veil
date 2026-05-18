from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DetectionRule(Base):
    """A rule that fires an alert when an event matches its filters."""

    __tablename__ = "detection_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    # Exact match against event["event_type"] (e.g. "LATERAL_MOVEMENT")
    event_type_filter: Mapped[str] = mapped_column(String(100), nullable=False)
    # Minimum severity required in the incoming event (LOW/MEDIUM/HIGH/CRITICAL)
    severity_min: Mapped[str] = mapped_column(String(20), nullable=False)
    alert_title: Mapped[str] = mapped_column(String(255), nullable=False)
    alert_severity: Mapped[str] = mapped_column(String(20), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Alert(Base):
    """A fired alert — one row per rule match."""

    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    simulation_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("detection_rules.id"), nullable=False
    )
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    affected_node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
