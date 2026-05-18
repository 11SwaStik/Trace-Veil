from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ScenarioSummary(BaseModel):
    """Returned by GET /api/scenarios — just enough to populate a picker UI."""

    id: uuid.UUID
    name: str
    description: str
    kill_chain_phases: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ScenarioDetail(BaseModel):
    """Returned by GET /api/scenarios/{id} — includes the full step definitions."""

    id: uuid.UUID
    name: str
    description: str
    kill_chain_phases: list[str]
    steps: list[dict[str, Any]]
    created_at: datetime

    model_config = {"from_attributes": True}
