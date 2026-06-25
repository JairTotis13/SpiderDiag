import json
import asyncio
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time OBD data broadcasting."""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, diagnostic_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if diagnostic_id not in self.active_connections:
                self.active_connections[diagnostic_id] = set()
            self.active_connections[diagnostic_id].add(websocket)
        logger.info(f"WebSocket connected to diagnostic {diagnostic_id}")

    async def disconnect(self, diagnostic_id: int, websocket: WebSocket):
        async with self._lock:
            if diagnostic_id in self.active_connections:
                self.active_connections[diagnostic_id].discard(websocket)
                if not self.active_connections[diagnostic_id]:
                    del self.active_connections[diagnostic_id]
        logger.info(f"WebSocket disconnected from diagnostic {diagnostic_id}")

    async def broadcast_data(self, diagnostic_id: int, data: dict):
        async with self._lock:
            connections = list(self.active_connections.get(diagnostic_id, set()))

        if not connections:
            return

        message = json.dumps(data, default=str)
        disconnected = []
        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)

        if disconnected:
            async with self._lock:
                if diagnostic_id in self.active_connections:
                    for ws in disconnected:
                        self.active_connections[diagnostic_id].discard(ws)

    async def broadcast_alert(self, alert_data: dict):
        """Broadcast alert to all connected clients."""
        message = json.dumps({"type": "alert", "data": alert_data}, default=str)
        async with self._lock:
            all_connections = []
            for conns in self.active_connections.values():
                all_connections.extend(conns)

        for ws in all_connections:
            try:
                await ws.send_text(message)
            except Exception:
                pass

    async def send_dtc_codes(self, diagnostic_id: int, codes: list):
        message = json.dumps({"type": "dtc_codes", "data": codes})
        async with self._lock:
            connections = list(self.active_connections.get(diagnostic_id, set()))

        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception:
                pass


ws_manager = ConnectionManager()
