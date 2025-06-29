"""
Modern Downloads API for Streamrip Web Interface
Handles all download-related operations with modern REST design
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field, HttpUrl

logger = logging.getLogger(__name__)

# Create router
downloads_router = APIRouter()

# Pydantic models for modern API design
class DownloadUrlRequest(BaseModel):
    """Request model for URL-based downloads"""
    url: HttpUrl = Field(..., description="URL to download from")
    quality: Optional[int] = Field(None, ge=0, le=4, description="Quality level (0-4)")
    folder: Optional[str] = Field(None, description="Custom download folder")
    
    class Config:
        schema_extra = {
            "example": {
                "url": "https://open.qobuz.com/album/abc123",
                "quality": 3,
                "folder": "/custom/path"
            }
        }


class DownloadUrlsRequest(BaseModel):
    """Request model for batch URL downloads"""
    urls: List[HttpUrl] = Field(..., min_items=1, max_items=100, description="List of URLs to download")
    quality: Optional[int] = Field(None, ge=0, le=4, description="Quality level for all downloads")
    folder: Optional[str] = Field(None, description="Custom download folder")
    
    class Config:
        schema_extra = {
            "example": {
                "urls": [
                    "https://open.qobuz.com/album/abc123",
                    "https://tidal.com/browse/album/def456"
                ],
                "quality": 3
            }
        }


class DownloadIdRequest(BaseModel):
    """Request model for ID-based downloads"""
    source: str = Field(..., pattern="^(qobuz|tidal|deezer|soundcloud)$", description="Music source")
    media_type: str = Field(..., pattern="^(track|album|playlist|artist)$", description="Media type")
    media_id: str = Field(..., description="Media ID from the source")
    quality: Optional[int] = Field(None, ge=0, le=4, description="Quality level")
    
    class Config:
        schema_extra = {
            "example": {
                "source": "qobuz",
                "media_type": "album",
                "media_id": "abc123xyz",
                "quality": 3
            }
        }


class DownloadResponse(BaseModel):
    """Response model for download operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    download_id: Optional[str] = Field(None, description="Unique download ID")
    download_ids: Optional[List[str]] = Field(None, description="List of download IDs for batch operations")
    message: str = Field(..., description="Response message")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "download_id": "abc123-def456-ghi789",
                "message": "Download added to queue successfully"
            }
        }


class QueueStatusResponse(BaseModel):
    """Response model for queue status"""
    queued: int = Field(..., description="Number of queued downloads")
    active: int = Field(..., description="Number of active downloads")
    completed: int = Field(..., description="Number of completed downloads")
    failed: int = Field(..., description="Number of failed downloads")
    queue: List[Dict[str, Any]] = Field(..., description="Current download queue")
    active_downloads: List[Dict[str, Any]] = Field(..., description="Currently active downloads")
    recent_completed: List[Dict[str, Any]] = Field(..., description="Recently completed downloads")
    recent_failed: List[Dict[str, Any]] = Field(..., description="Recently failed downloads")


# Global download manager reference (will be injected)
download_manager = None


def set_download_manager(manager):
    """Inject download manager dependency"""
    global download_manager
    download_manager = manager


@downloads_router.post("/url", response_model=DownloadResponse, summary="Download from URL")
async def download_url(request: DownloadUrlRequest):
    """
    Download music from a single URL
    
    Supports URLs from:
    - Qobuz
    - Tidal  
    - Deezer
    - SoundCloud
    - Last.fm playlists
    """
    try:
        if not download_manager:
            raise HTTPException(status_code=500, detail="Download manager not initialized")
        
        download_id = await download_manager.add_url_download(
            url=str(request.url),
            quality=request.quality
        )
        
        return DownloadResponse(
            success=True,
            download_id=download_id,
            message="Download added to queue successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add URL download: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@downloads_router.post("/urls", response_model=DownloadResponse, summary="Download from multiple URLs")
async def download_urls(request: DownloadUrlsRequest):
    """
    Download music from multiple URLs in batch
    
    Maximum 100 URLs per request for performance reasons.
    """
    try:
        if not download_manager:
            raise HTTPException(status_code=500, detail="Download manager not initialized")
        
        download_ids = []
        
        for url in request.urls:
            download_id = await download_manager.add_url_download(
                url=str(url),
                quality=request.quality
            )
            download_ids.append(download_id)
        
        return DownloadResponse(
            success=True,
            download_ids=download_ids,
            message=f"Added {len(download_ids)} downloads to queue successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add batch URL downloads: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@downloads_router.post("/file", response_model=DownloadResponse, summary="Download from uploaded file")
async def download_file(
    file: UploadFile = File(..., description="Text file containing URLs (one per line) or JSON file"),
    quality: Optional[int] = Form(None, ge=0, le=4, description="Quality level")
):
    """
    Download music from URLs in an uploaded file
    
    Supports:
    - Plain text files (one URL per line)
    - JSON files with URL arrays or streamrip export format
    """
    try:
        if not download_manager:
            raise HTTPException(status_code=500, detail="Download manager not initialized")
        
        # Read file content
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Parse content
        urls = []
        
        if file.filename and file.filename.endswith('.json'):
            import json
            try:
                data = json.loads(content_str)
                if isinstance(data, list):
                    # Simple URL array
                    urls = [str(url) for url in data if url]
                else:
                    # Streamrip export format
                    urls = [item.get('url', '') for item in data if item.get('url')]
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON file format")
        else:
            # Plain text file
            urls = [line.strip() for line in content_str.split('\n') if line.strip()]
        
        if not urls:
            raise HTTPException(status_code=400, detail="No valid URLs found in file")
        
        if len(urls) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 URLs per file")
        
        # Add downloads
        download_ids = []
        for url in urls:
            try:
                download_id = await download_manager.add_url_download(url=url, quality=quality)
                download_ids.append(download_id)
            except Exception as e:
                logger.warning(f"Failed to add URL {url}: {e}")
                continue
        
        return DownloadResponse(
            success=True,
            download_ids=download_ids,
            message=f"Added {len(download_ids)} downloads from file successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process file upload: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@downloads_router.post("/id", response_model=DownloadResponse, summary="Download by ID")
async def download_id(request: DownloadIdRequest):
    """
    Download music by source ID
    
    Useful when you have the specific ID from a music service.
    """
    try:
        if not download_manager:
            raise HTTPException(status_code=500, detail="Download manager not initialized")
        
        download_id = await download_manager.add_id_download(
            source=request.source,
            media_type=request.media_type,
            media_id=request.media_id
        )
        
        return DownloadResponse(
            success=True,
            download_id=download_id,
            message="Download added to queue successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add ID download: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@downloads_router.get("/queue", response_model=QueueStatusResponse, summary="Get download queue status")
async def get_queue_status():
    """
    Get current download queue status and statistics
    
    Returns information about queued, active, completed, and failed downloads.
    """
    try:
        if not download_manager:
            raise HTTPException(status_code=500, detail="Download manager not initialized")
        
        status = download_manager.get_queue_status()
        return QueueStatusResponse(**status)
        
    except Exception as e:
        logger.error(f"Failed to get queue status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@downloads_router.post("/{download_id}/pause", summary="Pause download")
async def pause_download(download_id: str):
    """Pause an active download"""
    try:
        if not download_manager:
            raise HTTPException(status_code=500, detail="Download manager not initialized")
        
        success = await download_manager.pause_download(download_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Download not found or cannot be paused")
        
        return {"success": True, "message": "Download paused successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to pause download {download_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@downloads_router.delete("/{download_id}", summary="Cancel download")
async def cancel_download(download_id: str):
    """Cancel a queued or active download"""
    try:
        if not download_manager:
            raise HTTPException(status_code=500, detail="Download manager not initialized")
        
        success = await download_manager.cancel_download(download_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Download not found")
        
        return {"success": True, "message": "Download cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel download {download_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
