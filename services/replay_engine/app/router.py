from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import playback as pb
from app.auth import get_current_user
from app.database import get_db
from app.models import Replay
from app.schemas import PlaybackState, ReplayResponse, SeekResponse, SpeedResponse

router = APIRouter(prefix="/api/replays")

DB   = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[str, Depends(get_current_user)]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_404(replay_id: uuid.UUID, db: AsyncSession) -> Replay:
    replay = await db.get(Replay, replay_id)
    if not replay:
        raise HTTPException(status_code=404, detail="Replay not found")
    return replay


# ── List / detail ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[ReplayResponse])
async def list_replays(db: DB, _: Auth) -> list[Replay]:
    result = await db.execute(select(Replay).order_by(Replay.created_at.desc()))
    return list(result.scalars().all())


@router.get("/{replay_id}", response_model=ReplayResponse)
async def get_replay(replay_id: uuid.UUID, db: DB, _: Auth) -> Replay:
    return await _get_or_404(replay_id, db)


# ── Playback state ─────────────────────────────────────────────────────────────

@router.get("/{replay_id}/state", response_model=PlaybackState)
async def get_state(replay_id: uuid.UUID, db: DB, _: Auth) -> PlaybackState:
    replay = await _get_or_404(replay_id, db)
    cursor = await pb.get_cursor(str(replay_id))
    return PlaybackState(
        status=cursor.get("status", "STOPPED"),
        sequence=cursor.get("sequence", 0),
        speed=cursor.get("speed", 1.0),
        total_events=replay.total_events,
    )


# ── Controls ──────────────────────────────────────────────────────────────────

@router.post("/{replay_id}/play", response_model=PlaybackState)
async def play(replay_id: uuid.UUID, db: DB, _: Auth) -> PlaybackState:
    replay = await _get_or_404(replay_id, db)
    await pb.start_playback(str(replay_id), replay.simulation_id)
    cursor = await pb.get_cursor(str(replay_id))
    return PlaybackState(
        status=cursor["status"],
        sequence=cursor["sequence"],
        speed=cursor["speed"],
        total_events=replay.total_events,
    )


@router.post("/{replay_id}/pause", response_model=PlaybackState)
async def pause(replay_id: uuid.UUID, db: DB, _: Auth) -> PlaybackState:
    replay = await _get_or_404(replay_id, db)
    await pb.pause_playback(str(replay_id))
    cursor = await pb.get_cursor(str(replay_id))
    return PlaybackState(
        status=cursor["status"],
        sequence=cursor["sequence"],
        speed=cursor["speed"],
        total_events=replay.total_events,
    )


@router.post("/{replay_id}/stop", response_model=PlaybackState)
async def stop(replay_id: uuid.UUID, db: DB, _: Auth) -> PlaybackState:
    replay = await _get_or_404(replay_id, db)
    await pb.stop_playback(str(replay_id))
    return PlaybackState(
        status="STOPPED",
        sequence=0,
        speed=1.0,
        total_events=replay.total_events,
    )


@router.post("/{replay_id}/seek", response_model=SeekResponse)
async def seek(
    replay_id: uuid.UUID,
    db: DB,
    _: Auth,
    position: float = Query(..., ge=0.0, le=1.0, description="Fractional position 0.0–1.0"),
) -> SeekResponse:
    replay = await _get_or_404(replay_id, db)
    target_seq = await pb.seek_playback(replay, position)
    return SeekResponse(
        message="Seeked and resumed playback",
        sequence=target_seq,
        position=position,
    )


@router.post("/{replay_id}/speed", response_model=SpeedResponse)
async def speed(
    replay_id: uuid.UUID,
    db: DB,
    _: Auth,
    multiplier: float = Query(..., gt=0.0, description="Playback speed multiplier (0.1–16.0)"),
) -> SpeedResponse:
    await _get_or_404(replay_id, db)
    actual = await pb.set_speed(str(replay_id), multiplier)
    return SpeedResponse(message="Speed updated", speed=actual)
