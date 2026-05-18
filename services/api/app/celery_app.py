"""Celery client used by the API service to dispatch tasks.

The API never *consumes* tasks — that is the simulation_engine worker's job.
It only *sends* them. A minimal Celery app with just the broker URL is all
that's needed for send_task() to work.

Usage anywhere in the API:
    from app.celery_app import celery_app
    celery_app.send_task("run_simulation", args=[simulation_id])
"""

from celery import Celery

from app.config import settings

celery_app = Celery(broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
