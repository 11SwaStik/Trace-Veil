from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.modules.simulations.models import SimulationStatus


class CreateSimulationRequest(BaseModel):
    scenario_id: uuid.UUID
    attack_speed: float = Field(default=1.0, ge=0.5, le=4.0)


class SimulationSummary(BaseModel):
    """Returned in list responses — lightweight, no topology blob."""

    id: uuid.UUID
    scenario_id: uuid.UUID
    status: SimulationStatus
    attack_speed: float
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class SimulationDetail(BaseModel):
    """Returned for single-simulation fetches — includes full topology JSON."""

    id: uuid.UUID
    user_id: uuid.UUID
    scenario_id: uuid.UUID
    status: SimulationStatus
    attack_speed: float
    topology: dict[str, Any] | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class SimulationEventResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    simulation_id: str
    sequence_number: int
    event_type: str
    severity: str
    source_node_id: str | None
    target_node_id: str | None
    ttp_id: str | None
    payload: dict[str, Any]
    fired_at: datetime
