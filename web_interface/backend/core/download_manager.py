"""
Modern Download Manager for Streamrip Web Interface
Handles download queue, progress tracking, and integration with streamrip core
"""

import asyncio
import logging
import uuid
from typing import Dict, List, Optional, Set
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

from streamrip.config import Config
from streamrip.rip.main import Main as StreamripMain
from streamrip.rip.parse_url import parse_url

from .websocket_manager import WebSocketManager, ProgressUpdate, LogMessage

logger = logging.getLogger(__name__)


class DownloadStatus(Enum):
    """Modern download status enumeration"""
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


@dataclass
class DownloadTask:
    """Modern download task data structure"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    url: str = ""
    source: str = ""
    media_type: str = ""
    media_id: str = ""
    title: str = ""
    artist: str = ""
    album: str = ""
    status: DownloadStatus = DownloadStatus.QUEUED
    progress: float = 0.0
    speed: str = ""
    eta: str = ""
    error_message: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    file_path: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "url": self.url,
            "source": self.source,
            "media_type": self.media_type,
            "media_id": self.media_id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "status": self.status.value,
            "progress": self.progress,
            "speed": self.speed,
            "eta": self.eta,
            "error_message": self.error_message,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "file_path": self.file_path
        }


class DownloadManager:
    """Modern download manager with queue and progress tracking"""
    
    def __init__(self):
        self.config: Optional[Config] = None
        self.streamrip_main: Optional[StreamripMain] = None
        
        # Download queue and tracking
        self.download_queue: List[DownloadTask] = []
        self.active_downloads: Dict[str, DownloadTask] = {}
        self.completed_downloads: List[DownloadTask] = []
        self.failed_downloads: List[DownloadTask] = []
        
        # Concurrency control
        self.max_concurrent_downloads = 3
        self.download_semaphore = asyncio.Semaphore(self.max_concurrent_downloads)
        
        # Background tasks
        self.queue_processor_task: Optional[asyncio.Task] = None
        self.is_running = False
        
        # WebSocket manager reference (will be injected)
        self.websocket_manager: Optional[WebSocketManager] = None
        
        logger.info("📥 Download Manager initialized")
    
    async def initialize(self):
        """Initialize the download manager"""
        try:
            # Load streamrip configuration
            config_path = "/app/config/config.toml"
            self.config = Config(config_path)
            
            # Start queue processor
            self.is_running = True
            self.queue_processor_task = asyncio.create_task(self._process_queue())
            
            logger.info("✅ Download Manager initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Download Manager: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        self.is_running = False
        
        if self.queue_processor_task:
            self.queue_processor_task.cancel()
            try:
                await self.queue_processor_task
            except asyncio.CancelledError:
                pass
        
        # Cancel active downloads
        for task in self.active_downloads.values():
            task.status = DownloadStatus.CANCELLED
        
        logger.info("🧹 Download Manager cleaned up")
    
    def set_websocket_manager(self, websocket_manager: WebSocketManager):
        """Inject WebSocket manager for real-time updates"""
        self.websocket_manager = websocket_manager
    
    async def add_url_download(self, url: str, quality: Optional[int] = None) -> str:
        """Add URL-based download to queue"""
        try:
            # Parse URL to get metadata
            parsed = parse_url(url)
            if not parsed:
                raise ValueError(f"Unable to parse URL: {url}")
            
            # Create download task
            task = DownloadTask(
                url=url,
                source=parsed.source,
                media_type=parsed.media_type,
                media_id=parsed.id,
                title=f"{parsed.media_type.title()} from {parsed.source.title()}"
            )
            
            # Add to queue
            self.download_queue.append(task)
            
            logger.info(f"📥 Added download to queue: {task.id} - {url}")
            
            # Notify clients
            if self.websocket_manager:
                await self.websocket_manager.broadcast_status({
                    "type": "download_queued",
                    "task": task.to_dict()
                })
            
            return task.id
            
        except Exception as e:
            logger.error(f"❌ Failed to add URL download: {e}")
            raise
    
    async def add_id_download(self, source: str, media_type: str, media_id: str) -> str:
        """Add ID-based download to queue"""
        try:
            task = DownloadTask(
                source=source,
                media_type=media_type,
                media_id=media_id,
                title=f"{media_type.title()} {media_id} from {source.title()}"
            )
            
            self.download_queue.append(task)
            
            logger.info(f"📥 Added ID download to queue: {task.id} - {source}:{media_type}:{media_id}")
            
            if self.websocket_manager:
                await self.websocket_manager.broadcast_status({
                    "type": "download_queued",
                    "task": task.to_dict()
                })
            
            return task.id
            
        except Exception as e:
            logger.error(f"❌ Failed to add ID download: {e}")
            raise
    
    async def pause_download(self, download_id: str) -> bool:
        """Pause an active download"""
        if download_id in self.active_downloads:
            task = self.active_downloads[download_id]
            task.status = DownloadStatus.PAUSED
            logger.info(f"⏸️ Paused download: {download_id}")
            return True
        return False
    
    async def cancel_download(self, download_id: str) -> bool:
        """Cancel a download"""
        # Check active downloads
        if download_id in self.active_downloads:
            task = self.active_downloads[download_id]
            task.status = DownloadStatus.CANCELLED
            logger.info(f"❌ Cancelled active download: {download_id}")
            return True
        
        # Check queue
        for i, task in enumerate(self.download_queue):
            if task.id == download_id:
                task.status = DownloadStatus.CANCELLED
                self.download_queue.pop(i)
                logger.info(f"❌ Cancelled queued download: {download_id}")
                return True
        
        return False
    
    def get_queue_status(self) -> Dict:
        """Get current queue status"""
        return {
            "queued": len(self.download_queue),
            "active": len(self.active_downloads),
            "completed": len(self.completed_downloads),
            "failed": len(self.failed_downloads),
            "queue": [task.to_dict() for task in self.download_queue],
            "active_downloads": [task.to_dict() for task in self.active_downloads.values()],
            "recent_completed": [task.to_dict() for task in self.completed_downloads[-10:]],
            "recent_failed": [task.to_dict() for task in self.failed_downloads[-10:]]
        }
    
    async def _process_queue(self):
        """Background task to process download queue"""
        logger.info("🔄 Queue processor started")
        
        while self.is_running:
            try:
                # Process queued downloads
                if self.download_queue and len(self.active_downloads) < self.max_concurrent_downloads:
                    task = self.download_queue.pop(0)
                    
                    if task.status == DownloadStatus.QUEUED:
                        # Start download
                        asyncio.create_task(self._execute_download(task))
                
                # Wait before next iteration
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Error in queue processor: {e}")
                await asyncio.sleep(5)  # Wait longer on error
        
        logger.info("🛑 Queue processor stopped")
    
    async def _execute_download(self, task: DownloadTask):
        """Execute a single download task"""
        async with self.download_semaphore:
            try:
                # Move to active downloads
                self.active_downloads[task.id] = task
                task.status = DownloadStatus.DOWNLOADING
                task.started_at = datetime.now().isoformat()
                
                logger.info(f"🚀 Starting download: {task.id}")
                
                # Create streamrip main instance
                async with StreamripMain(self.config) as main:
                    # Add download based on type
                    if task.url:
                        await main.add(task.url)
                    else:
                        await main.add_by_id(task.source, task.media_type, task.media_id)
                    
                    # Resolve and download
                    await main.resolve()
                    await main.rip()
                
                # Mark as completed
                task.status = DownloadStatus.COMPLETED
                task.completed_at = datetime.now().isoformat()
                task.progress = 1.0
                
                # Move to completed
                self.active_downloads.pop(task.id)
                self.completed_downloads.append(task)
                
                logger.info(f"✅ Download completed: {task.id}")
                
                # Notify clients
                if self.websocket_manager:
                    await self.websocket_manager.broadcast_progress(
                        ProgressUpdate(
                            download_id=task.id,
                            type=task.media_type,
                            title=task.title,
                            artist=task.artist,
                            album=task.album,
                            progress=1.0,
                            status="completed"
                        )
                    )
                
            except Exception as e:
                # Mark as failed
                task.status = DownloadStatus.FAILED
                task.error_message = str(e)
                task.completed_at = datetime.now().isoformat()
                
                # Move to failed
                self.active_downloads.pop(task.id, None)
                self.failed_downloads.append(task)
                
                logger.error(f"❌ Download failed: {task.id} - {e}")
                
                # Notify clients
                if self.websocket_manager:
                    await self.websocket_manager.broadcast_log(
                        LogMessage(
                            level="ERROR",
                            message=f"Download failed: {task.title} - {str(e)}",
                            source="download_manager"
                        )
                    )
    
    def is_healthy(self) -> bool:
        """Health check for the download manager"""
        return self.is_running and self.config is not None
