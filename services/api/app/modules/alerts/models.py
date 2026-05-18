"""Read-only SQLAlchemy models for the alerts module.

These models map to tables owned and written by the alert_service.
The API never calls create_all on them — it only reads.
Column definitions must stay in sync with services/alert_service/app/models.py.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type_filter: Mapped[str] = mapped_column(String(100), nullable=False)
    severity_min: Mapped[str] = mapped_column(String(20), nullable=False)
    alert_title: Mapped[str] = mapped_column(String(255), nullable=False)
    alert_severity: Mapped[str] = mapped_column(String(20), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    simulation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("detection_rules.id"), nullable=False
    )
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    affected_node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False)
