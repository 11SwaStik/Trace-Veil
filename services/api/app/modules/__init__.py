"""Feature modules.

Each future capability of Traceveil lives in its own folder under here:

    app/modules/<feature>/
        models.py    # SQLAlchemy ORM (table definitions)
        schemas.py   # Pydantic request/response shapes
        router.py    # FastAPI APIRouter with the feature's endpoints

Then in app/main.py, import the router and mount it:

    from app.modules.events.router import router as events_router
    app.include_router(events_router)

Planned modules (built in later steps, not now):
    events, sessions, scenario, runner, detections, replay, realtime, auth
"""
