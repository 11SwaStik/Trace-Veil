from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.modules.auth.models import User
from app.modules.auth.router import get_current_user
from app.modules.scenarios.models import Scenario
from app.modules.scenarios.schemas import ScenarioDetail, ScenarioSummary

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioSummary])
async def list_scenarios(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[Scenario]:
    rows = (await db.execute(select(Scenario).order_by(Scenario.name))).scalars().all()
    return list(rows)


@router.get("/{scenario_id}", response_model=ScenarioDetail)
async def get_scenario(
    scenario_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> Scenario:
    row = (
        await db.execute(select(Scenario).where(Scenario.id == scenario_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return row
