"""ConnectionManager — in-memory WebSocket room tracking.

A "room" is a set of WebSocket connections for one simulation_id.
When the background Redis listener receives an event it calls broadcast(),
which pushes the payload to every connection in that room.

Thread-safety: FastAPI is async, not multi-threaded. An asyncio.Lock is
enough to protect the rooms dict from concurrent coroutine access.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict

from fastapi import WebSocket

log = logging.getLogger("traceveil.ws.gateway")


class ConnectionManager:
    def __init__(self) -> None:
        # simulation_id (str) → set of open WebSocket connections
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, sim_id: str, ws: WebSocket) -> None:
        """Accept the WebSocket and add it to the room."""
        await ws.accept()
        async with self._lock:
            self._rooms[sim_id].add(ws)
        log.info("client joined room=%s  room_size=%d", sim_id, self.room_size(sim_id))

    async def disconnect(self, sim_id: str, ws: WebSocket) -> None:
        """Remove the WebSocket from the room; clean up empty rooms."""
        async with self._lock:
            self._rooms[sim_id].discard(ws)
            if not self._rooms[sim_id]:
                del self._rooms[sim_id]
        log.info("client left  room=%s", sim_id)

    async def broadcast(self, sim_id: str, payload: dict) -> None:
        """Send a JSON payload to every connection in a room.

        Dead connections are silently removed — a broken pipe should not
        crash the broadcast loop for other clients.
        """
        async with self._lock:
            conns = set(self._rooms.get(sim_id, set()))

        if not conns:
            return

        dead: set[WebSocket] = set()
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)

        if dead:
            async with self._lock:
                self._rooms[sim_id] -= dead

    def room_size(self, sim_id: str) -> int:
        return len(self._rooms.get(sim_id, set()))


# Module-level singleton shared by the listener and router.
manager = ConnectionManager()
