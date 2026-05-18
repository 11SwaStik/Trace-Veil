"""Health-check endpoints.

`/healthz`  -> the process is up (liveness probe).
`/readyz`   -> the process can reach Postgres (readiness probe).

These are conventional in any serious backend — orchestrators like
Kubernetes call them to decide whether to send traffic to this instance.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
async def readyz(db: AsyncSession = Depends(get_session)) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ready"}
