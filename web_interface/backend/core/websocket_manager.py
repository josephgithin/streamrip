"""
Modern WebSocket Manager for Real-time Communication
Handles progress updates, log streaming, and client connections
"""

import asyncio
import json
import logging
from typing import Dict, List, Set
from datetime import datetime
from dataclasses import dataclass, asdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class ProgressUpdate:
    """Modern progress update data structure"""
    download_id: str
    type: str  # 'track', 'album', 'playlist', 'artist'
    title: str
    artist: str = ""
    album: str = ""
    progress: float = 0.0  # 0.0 to 1.0
    speed: str = ""
    eta: str = ""
    status: str = "downloading"  # downloading, completed, failed, paused
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


@dataclass
class LogMessage:
    """Modern log message structure"""
    level: str
    message: str
    timestamp: str
    source: str = "streamrip"
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


class WebSocketManager:
    """Modern WebSocket connection manager with type safety"""
    
    def __init__(self):
        # Connection pools
        self.progress_connections: Set[WebSocket] = set()
        self.log_connections: Set[WebSocket] = set()
        
        # Connection metadata
        self.connection_info: Dict[WebSocket, Dict] = {}
        
        # Message queues for offline clients
        self.progress_queue: List[ProgressUpdate] = []
        self.log_queue: List[LogMessage] = []
        
        # Queue limits to prevent memory issues
        self.max_queue_size = 1000
        
        logger.info("🔌 WebSocket Manager initialized")
    
    async def connect_progress(self, websocket: WebSocket):
        """Connect client to progress updates"""
        await websocket.accept()
        self.progress_connections.add(websocket)
        
        # Store connection metadata
        self.connection_info[websocket] = {
            "type": "progress",
            "connected_at": datetime.now().isoformat(),
            "client_ip": websocket.client.host if websocket.client else "unknown"
        }
        
        logger.info(f"📊 Progress client connected: {websocket.client}")
        
        # Send recent progress updates to new client
        await self._send_queued_progress(websocket)
    
    async def connect_logs(self, websocket: WebSocket):
        """Connect client to log streaming"""
        await websocket.accept()
        self.log_connections.add(websocket)
        
        self.connection_info[websocket] = {
            "type": "logs",
            "connected_at": datetime.now().isoformat(),
            "client_ip": websocket.client.host if websocket.client else "unknown"
        }
        
        logger.info(f"📝 Log client connected: {websocket.client}")
        
        # Send recent logs to new client
        await self._send_queued_logs(websocket)
    
    def disconnect_progress(self, websocket: WebSocket):
        """Disconnect progress client"""
        self.progress_connections.discard(websocket)
        self.connection_info.pop(websocket, None)
        logger.info(f"📊 Progress client disconnected")
    
    def disconnect_logs(self, websocket: WebSocket):
        """Disconnect log client"""
        self.log_connections.discard(websocket)
        self.connection_info.pop(websocket, None)
        logger.info(f"📝 Log client disconnected")
    
    async def broadcast_progress(self, progress: ProgressUpdate):
        """Broadcast progress update to all connected clients"""
        if not self.progress_connections:
            # Queue for future clients
            self._queue_progress(progress)
            return
        
        message = {
            "type": "progress_update",
            "data": asdict(progress)
        }
        
        # Send to all connected progress clients
        disconnected = set()
        for websocket in self.progress_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send progress to client: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected:
            self.disconnect_progress(websocket)
        
        # Queue for offline clients
        self._queue_progress(progress)
    
    async def broadcast_log(self, log: LogMessage):
        """Broadcast log message to all connected clients"""
        if not self.log_connections:
            self._queue_log(log)
            return
        
        message = {
            "type": "log_message",
            "data": asdict(log)
        }
        
        # Send to all connected log clients
        disconnected = set()
        for websocket in self.log_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send log to client: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected:
            self.disconnect_logs(websocket)
        
        # Queue for offline clients
        self._queue_log(log)
    
    async def broadcast_status(self, status: Dict):
        """Broadcast general status updates"""
        message = {
            "type": "status_update",
            "data": status
        }
        
        # Send to all clients
        all_connections = self.progress_connections | self.log_connections
        disconnected = set()
        
        for websocket in all_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send status to client: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected:
            if websocket in self.progress_connections:
                self.disconnect_progress(websocket)
            if websocket in self.log_connections:
                self.disconnect_logs(websocket)
    
    def _queue_progress(self, progress: ProgressUpdate):
        """Queue progress update for offline clients"""
        self.progress_queue.append(progress)
        if len(self.progress_queue) > self.max_queue_size:
            self.progress_queue.pop(0)  # Remove oldest
    
    def _queue_log(self, log: LogMessage):
        """Queue log message for offline clients"""
        self.log_queue.append(log)
        if len(self.log_queue) > self.max_queue_size:
            self.log_queue.pop(0)  # Remove oldest
    
    async def _send_queued_progress(self, websocket: WebSocket):
        """Send queued progress updates to new client"""
        for progress in self.progress_queue[-50:]:  # Send last 50 updates
            try:
                message = {
                    "type": "progress_update",
                    "data": asdict(progress)
                }
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send queued progress: {e}")
                break
    
    async def _send_queued_logs(self, websocket: WebSocket):
        """Send queued log messages to new client"""
        for log in self.log_queue[-100:]:  # Send last 100 logs
            try:
                message = {
                    "type": "log_message",
                    "data": asdict(log)
                }
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send queued log: {e}")
                break
    
    def get_connection_stats(self) -> Dict:
        """Get connection statistics"""
        return {
            "progress_clients": len(self.progress_connections),
            "log_clients": len(self.log_connections),
            "total_clients": len(self.connection_info),
            "progress_queue_size": len(self.progress_queue),
            "log_queue_size": len(self.log_queue)
        }
    
    def is_healthy(self) -> bool:
        """Health check for the WebSocket manager"""
        return True  # Always healthy unless we add more complex logic
