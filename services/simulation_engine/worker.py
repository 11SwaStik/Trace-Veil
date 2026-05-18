"""Celery application for the simulation engine worker.

Start the worker locally (from this directory, with venv active):

    celery -A worker worker --loglevel=info

Or via Docker Compose:

    docker compose up simulation_engine

The worker consumes tasks from Redis and runs them in-process.
In Step 5, run_simulation will do real work: build topology, generate
events, write to PostgreSQL, publish to Redis Pub/Sub.
"""

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "simulation_engine",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],  # loads tasks.py on worker startup
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Acknowledge the task only after it completes, not on receipt.
    # This means a worker crash returns the task to the queue.
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # one task at a time per worker process
)
