from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.modules.alerts.models import Alert, DetectionRule
from app.modules.alerts.schemas import AlertResponse, DetectionRuleResponse
from app.modules.auth.models import User
from app.modules.auth.router import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

DB   = Annotated[AsyncSession, Depends(get_session)]
Auth = Annotated[User, Depends(get_current_user)]


# ── Detection rules — static path must come BEFORE /{alert_id} ───────────────

@router.get("/detection-rules", response_model=list[DetectionRuleResponse])
async def list_detection_rules(db: DB, _: Auth) -> list[DetectionRule]:
    """List all detection rules, enabled ones first."""
    result = await db.execute(
        select(DetectionRule).order_by(
            DetectionRule.enabled.desc(),
            DetectionRule.name,
        )
    )
    return list(result.scalars().all())


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    db: DB,
    _: Auth,
    simulation_id: str | None = Query(None, description="Filter by simulation ID"),
    acknowledged: bool | None = Query(None, description="Filter by acknowledged state"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[Alert]:
    q = select(Alert).order_by(Alert.created_at.desc())

    if simulation_id is not None:
        q = q.where(Alert.simulation_id == simulation_id)
    if acknowledged is not None:
        q = q.where(Alert.acknowledged == acknowledged)

    result = await db.execute(q.limit(limit).offset(offset))
    return list(result.scalars().all())


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: uuid.UUID, db: DB, _: Auth) -> Alert:
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(alert_id: uuid.UUID, db: DB, _: Auth) -> Alert:
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.acknowledged = True
    await db.commit()
    await db.refresh(alert)
    return alert
