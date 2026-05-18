from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReplayResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    simulation_id: str
    name: str
    total_events: int
    duration_ms: int
    created_at: datetime


class PlaybackState(BaseModel):
    status: str          # PLAYING | PAUSED | STOPPED
    sequence: int
    speed: float
    total_events: int


class SeekResponse(BaseModel):
    message: str
    sequence: int
    position: float


class SpeedResponse(BaseModel):
    message: str
    speed: float
