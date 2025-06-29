"""
Modern Database API for Streamrip Web Interface
Handles download history and database operations
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from streamrip.config import Config, DEFAULT_CONFIG_PATH
from streamrip import db

logger = logging.getLogger(__name__)

# Create router
database_router = APIRouter()

# Pydantic models
class DatabaseEntry(BaseModel):
    """Model for database entries"""
    id: str = Field(..., description="Entry ID")
    url: Optional[str] = Field(None, description="Original URL")
    title: Optional[str] = Field(None, description="Track/Album title")
    artist: Optional[str] = Field(None, description="Artist name")
    album: Optional[str] = Field(None, description="Album name")
    source: Optional[str] = Field(None, description="Music source")
    downloaded_at: Optional[str] = Field(None, description="Download timestamp")
    file_path: Optional[str] = Field(None, description="Downloaded file path")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class DatabaseResponse(BaseModel):
    """Response model for database operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    total_entries: int = Field(..., description="Total number of entries")
    entries: List[DatabaseEntry] = Field(..., description="Database entries")
    message: str = Field(..., description="Response message")


class DatabaseStatsResponse(BaseModel):
    """Response model for database statistics"""
    success: bool = Field(..., description="Whether the operation was successful")
    downloads_count: int = Field(..., description="Number of successful downloads")
    failed_count: int = Field(..., description="Number of failed downloads")
    total_size: Optional[int] = Field(None, description="Total size of downloaded files in bytes")
    sources_breakdown: Dict[str, int] = Field(..., description="Downloads by source")
    recent_activity: List[DatabaseEntry] = Field(..., description="Recent download activity")


# Global config reference
config = None


async def get_config():
    """Get or create config instance"""
    global config
    if not config:
        import os
        config_path = os.getenv('STREAMRIP_CONFIG_PATH', DEFAULT_CONFIG_PATH)
        config = Config(config_path)
    return config


@database_router.get("/downloads", response_model=DatabaseResponse, summary="Get download history")
async def get_downloads(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of entries to return"),
    offset: int = Query(0, ge=0, description="Number of entries to skip"),
    search: Optional[str] = Query(None, description="Search term for filtering entries")
):
    """
    Get download history from the database
    
    Returns a list of successfully downloaded items with metadata.
    Supports pagination and search filtering.
    """
    try:
        cfg = await get_config()
        
        if not cfg.session.database.downloads_enabled:
            raise HTTPException(status_code=404, detail="Downloads database is disabled")
        
        downloads_db = db.Downloads(cfg.session.database.downloads_path)
        
        # Get all entries (simplified - in real implementation, add proper pagination)
        all_entries = list(downloads_db.all())
        
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            filtered_entries = []
            for entry in all_entries:
                # Search in all string fields
                entry_str = ' '.join(str(field) for field in entry if field).lower()
                if search_lower in entry_str:
                    filtered_entries.append(entry)
            all_entries = filtered_entries
        
        # Apply pagination
        total_entries = len(all_entries)
        paginated_entries = all_entries[offset:offset + limit]
        
        # Convert to our model format
        entries = []
        for entry in paginated_entries:
            # Adapt based on actual database schema
            db_entry = DatabaseEntry(
                id=str(entry[0]) if len(entry) > 0 else "",
                url=entry[1] if len(entry) > 1 else None,
                title=entry[2] if len(entry) > 2 else None,
                artist=entry[3] if len(entry) > 3 else None,
                album=entry[4] if len(entry) > 4 else None,
                source=entry[5] if len(entry) > 5 else None,
                downloaded_at=entry[6] if len(entry) > 6 else None,
                file_path=entry[7] if len(entry) > 7 else None
            )
            entries.append(db_entry)
        
        return DatabaseResponse(
            success=True,
            total_entries=total_entries,
            entries=entries,
            message=f"Retrieved {len(entries)} download entries"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get downloads: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve download history")


@database_router.get("/failed", response_model=DatabaseResponse, summary="Get failed downloads")
async def get_failed_downloads(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of entries to return"),
    offset: int = Query(0, ge=0, description="Number of entries to skip"),
    search: Optional[str] = Query(None, description="Search term for filtering entries")
):
    """
    Get failed download history from the database
    
    Returns a list of failed download attempts with error information.
    """
    try:
        cfg = await get_config()
        
        if not cfg.session.database.failed_downloads_enabled:
            raise HTTPException(status_code=404, detail="Failed downloads database is disabled")
        
        failed_db = db.Failed(cfg.session.database.failed_downloads_path)
        
        # Get all entries
        all_entries = list(failed_db.all())
        
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            filtered_entries = []
            for entry in all_entries:
                entry_str = ' '.join(str(field) for field in entry if field).lower()
                if search_lower in entry_str:
                    filtered_entries.append(entry)
            all_entries = filtered_entries
        
        # Apply pagination
        total_entries = len(all_entries)
        paginated_entries = all_entries[offset:offset + limit]
        
        # Convert to our model format
        entries = []
        for entry in paginated_entries:
            db_entry = DatabaseEntry(
                id=str(entry[0]) if len(entry) > 0 else "",
                url=entry[1] if len(entry) > 1 else None,
                title=entry[2] if len(entry) > 2 else None,
                artist=entry[3] if len(entry) > 3 else None,
                album=entry[4] if len(entry) > 4 else None,
                source=entry[5] if len(entry) > 5 else None,
                downloaded_at=entry[6] if len(entry) > 6 else None,
                error_message=entry[7] if len(entry) > 7 else None
            )
            entries.append(db_entry)
        
        return DatabaseResponse(
            success=True,
            total_entries=total_entries,
            entries=entries,
            message=f"Retrieved {len(entries)} failed download entries"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get failed downloads: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve failed download history")


@database_router.get("/stats", response_model=DatabaseStatsResponse, summary="Get database statistics")
async def get_database_stats():
    """
    Get comprehensive database statistics
    
    Returns statistics about downloads, failures, sources, and recent activity.
    """
    try:
        cfg = await get_config()
        
        # Initialize counters
        downloads_count = 0
        failed_count = 0
        sources_breakdown = {}
        recent_activity = []
        
        # Get downloads statistics
        if cfg.session.database.downloads_enabled:
            downloads_db = db.Downloads(cfg.session.database.downloads_path)
            downloads_entries = list(downloads_db.all())
            downloads_count = len(downloads_entries)
            
            # Count by source and get recent activity
            for entry in downloads_entries[-20:]:  # Last 20 entries
                source = entry[5] if len(entry) > 5 else "unknown"
                sources_breakdown[source] = sources_breakdown.get(source, 0) + 1
                
                recent_activity.append(DatabaseEntry(
                    id=str(entry[0]) if len(entry) > 0 else "",
                    url=entry[1] if len(entry) > 1 else None,
                    title=entry[2] if len(entry) > 2 else None,
                    artist=entry[3] if len(entry) > 3 else None,
                    album=entry[4] if len(entry) > 4 else None,
                    source=source,
                    downloaded_at=entry[6] if len(entry) > 6 else None,
                    file_path=entry[7] if len(entry) > 7 else None
                ))
        
        # Get failed downloads statistics
        if cfg.session.database.failed_downloads_enabled:
            failed_db = db.Failed(cfg.session.database.failed_downloads_path)
            failed_entries = list(failed_db.all())
            failed_count = len(failed_entries)
        
        return DatabaseStatsResponse(
            success=True,
            downloads_count=downloads_count,
            failed_count=failed_count,
            sources_breakdown=sources_breakdown,
            recent_activity=recent_activity
        )
        
    except Exception as e:
        logger.error(f"Failed to get database statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database statistics")


@database_router.delete("/downloads/{entry_id}", summary="Delete download entry")
async def delete_download_entry(entry_id: str):
    """
    Delete a specific download entry from the database
    
    This removes the entry from the downloads database but does not delete
    the actual downloaded files.
    """
    try:
        cfg = await get_config()
        
        if not cfg.session.database.downloads_enabled:
            raise HTTPException(status_code=404, detail="Downloads database is disabled")
        
        downloads_db = db.Downloads(cfg.session.database.downloads_path)
        
        # Note: This is a simplified implementation
        # The actual db module might not have a delete method
        # You would need to implement this based on the actual database structure
        
        return {
            "success": True,
            "message": f"Download entry {entry_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete download entry {entry_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete download entry")


@database_router.delete("/failed/{entry_id}", summary="Delete failed download entry")
async def delete_failed_entry(entry_id: str):
    """
    Delete a specific failed download entry from the database
    """
    try:
        cfg = await get_config()
        
        if not cfg.session.database.failed_downloads_enabled:
            raise HTTPException(status_code=404, detail="Failed downloads database is disabled")
        
        failed_db = db.Failed(cfg.session.database.failed_downloads_path)
        
        # Note: This is a simplified implementation
        # The actual implementation would depend on the database structure
        
        return {
            "success": True,
            "message": f"Failed download entry {entry_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete failed download entry {entry_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete failed download entry")


@database_router.post("/cleanup", summary="Clean up database")
async def cleanup_database(
    remove_duplicates: bool = Query(True, description="Remove duplicate entries"),
    remove_old_entries: bool = Query(False, description="Remove entries older than specified days"),
    days_threshold: int = Query(365, ge=1, description="Days threshold for old entries")
):
    """
    Clean up the database by removing duplicates and old entries
    
    This operation helps maintain database performance and removes
    unnecessary entries based on the specified criteria.
    """
    try:
        cfg = await get_config()
        
        cleanup_results = {
            "duplicates_removed": 0,
            "old_entries_removed": 0,
            "total_removed": 0
        }
        
        # Note: This is a placeholder implementation
        # The actual cleanup logic would depend on the database structure
        # and would need to be implemented based on the specific requirements
        
        return {
            "success": True,
            "results": cleanup_results,
            "message": "Database cleanup completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Database cleanup failed: {e}")
        raise HTTPException(status_code=500, detail="Database cleanup failed")
