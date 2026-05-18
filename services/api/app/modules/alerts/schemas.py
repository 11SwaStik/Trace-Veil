from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class AlertResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    simulation_id: str
    event_id: str | None
    rule_id: uuid.UUID
    severity: str
    title: str
    affected_node_id: str | None
    created_at: datetime
    acknowledged: bool


class DetectionRuleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    event_type_filter: str
    severity_min: str
    alert_title: str
    alert_severity: str
    enabled: bool
