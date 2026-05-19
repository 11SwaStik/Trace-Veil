from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_app import celery_app
from app.database import get_session
from app.modules.auth.models import User
from app.modules.auth.router import get_current_user
from app.modules.scenarios.models import Scenario
from app.modules.simulations.models import Simulation, SimulationEvent, SimulationStatus
from app.modules.simulations.schemas import (
    CreateSimulationRequest,
    SimulationDetail,
    SimulationEventResponse,
    SimulationSummary,
)
from app.redis_client import get_redis

router = APIRouter(prefix="/api/simulations", tags=["simulations"])

# States from which a simulation cannot be started again.
_TERMINAL_STATES = {SimulationStatus.COMPLETED, SimulationStatus.STOPPED}
_ACTIVE_STATES = {SimulationStatus.RUNNING, SimulationStatus.PAUSED}


@router.post("", response_model=SimulationDetail, status_code=status.HTTP_201_CREATED)
async def create_simulation(
    body: CreateSimulationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> Simulation:
    # Verify the scenario exists before creating a simulation against it.
    scenario = (
        await db.execute(select(Scenario).where(Scenario.id == body.scenario_id))
    ).scalar_one_or_none()
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )

    sim = Simulation(
        user_id=user.id,
        scenario_id=body.scenario_id,
        attack_speed=body.attack_speed,
    )
    db.add(sim)
    await db.flush()
    return sim


@router.get("", response_model=list[SimulationSummary])
async def list_simulations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[Simulation]:
    rows = (
        await db.execute(
            select(Simulation)
            .where(Simulation.user_id == user.id)
            .order_by(Simulation.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


@router.get("/{sim_id}", response_model=SimulationDetail)
async def get_simulation(
    sim_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> Simulation:
    sim = await _get_owned_simulation(sim_id, user, db)
    return sim


@router.post("/{sim_id}/start", response_model=SimulationDetail, status_code=status.HTTP_202_ACCEPTED)
async def start_simulation(
    sim_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> Simulation:
    sim = await _get_owned_simulation(sim_id, user, db)

    if sim.status in _TERMINAL_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Simulation is already {sim.status.value} and cannot be started",
        )
    if sim.status in _ACTIVE_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Simulation is already {sim.status.value}",
        )

    sim.status = SimulationStatus.RUNNING
    sim.started_at = datetime.now(timezone.utc)

    # Commit first so the worker reads RUNNING status, not INITIALIZING.
    await db.commit()

    # Fire-and-forget: the simulation engine worker picks this up from Redis.
    celery_app.send_task("run_simulation", args=[str(sim.id)])

    return sim


@router.post("/{sim_id}/pause", response_model=SimulationDetail, status_code=status.HTTP_202_ACCEPTED)
async def pause_simulation(
    sim_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> Simulation:
    sim = await _get_owned_simulation(sim_id, user, db)

    if sim.status != SimulationStatus.RUNNING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Simulation cannot be paused — current status is {sim.status.value}",
        )

    await get_redis().publish(f"simulation:{sim_id}:commands", "PAUSE")
    sim.status = SimulationStatus.PAUSED
    await db.commit()
    await db.refresh(sim)
    return sim


@router.post("/{sim_id}/resume", response_model=SimulationDetail, status_code=status.HTTP_202_ACCEPTED)
async def resume_simulation(
    sim_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> Simulation:
    sim = await _get_owned_simulation(sim_id, user, db)

    if sim.status != SimulationStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Simulation cannot be resumed — current status is {sim.status.value}",
        )

    await get_redis().publish(f"simulation:{sim_id}:commands", "RESUME")
    sim.status = SimulationStatus.RUNNING
    await db.commit()
    await db.refresh(sim)
    return sim


@router.post("/{sim_id}/stop", response_model=SimulationDetail, status_code=status.HTTP_202_ACCEPTED)
async def stop_simulation(
    sim_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> Simulation:
    sim = await _get_owned_simulation(sim_id, user, db)

    if sim.status in _TERMINAL_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Simulation is already {sim.status.value}",
        )

    redis = get_redis()
    await redis.publish(f"simulation:{sim_id}:commands", "STOP")

    return sim


@router.get("/{sim_id}/events", response_model=list[SimulationEventResponse])
async def list_simulation_events(
    sim_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[SimulationEvent]:
    await _get_owned_simulation(sim_id, user, db)

    rows = (
        await db.execute(
            select(SimulationEvent)
            .where(SimulationEvent.simulation_id == str(sim_id))
            .order_by(SimulationEvent.sequence_number.asc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()
    return list(rows)


async def _get_owned_simulation(
    sim_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Simulation:
    """Load a simulation, returning 404 if it doesn't exist or belongs to another user."""
    sim = (
        await db.execute(
            select(Simulation).where(
                Simulation.id == sim_id,
                Simulation.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")
    return sim
