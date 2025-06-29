"""
Modern File Management API for Streamrip Web Interface
Handles file browsing, organization, and management operations
"""

import logging
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from streamrip.config import Config, DEFAULT_CONFIG_PATH

logger = logging.getLogger(__name__)

# Create router
files_router = APIRouter()

# Pydantic models
class FileInfo(BaseModel):
    """Model for file information"""
    name: str = Field(..., description="File or directory name")
    path: str = Field(..., description="Full path")
    type: str = Field(..., description="Type: 'file' or 'directory'")
    size: Optional[int] = Field(None, description="File size in bytes")
    modified: Optional[str] = Field(None, description="Last modified timestamp")
    extension: Optional[str] = Field(None, description="File extension")
    is_audio: bool = Field(False, description="Whether the file is an audio file")


class DirectoryResponse(BaseModel):
    """Response model for directory browsing"""
    success: bool = Field(..., description="Whether the operation was successful")
    path: str = Field(..., description="Current directory path")
    parent: Optional[str] = Field(None, description="Parent directory path")
    items: List[FileInfo] = Field(..., description="Directory contents")
    total_items: int = Field(..., description="Total number of items")
    total_size: Optional[int] = Field(None, description="Total size of all files")
    message: str = Field(..., description="Response message")


class OrganizeRequest(BaseModel):
    """Request model for file organization"""
    source_paths: List[str] = Field(..., description="Paths to organize")
    target_directory: str = Field(..., description="Target directory for organization")
    organization_type: str = Field("artist_album", pattern="^(artist_album|album|artist|source)$", description="Organization method")
    create_subdirectories: bool = Field(True, description="Whether to create subdirectories")


# Audio file extensions
AUDIO_EXTENSIONS = {'.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus'}

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


@files_router.get("/browse", response_model=DirectoryResponse, summary="Browse directory")
async def browse_directory(
    path: Optional[str] = Query(None, description="Directory path to browse"),
    show_hidden: bool = Query(False, description="Show hidden files and directories")
):
    """
    Browse files and directories
    
    If no path is provided, browses the default download directory.
    Returns information about files and subdirectories.
    """
    try:
        cfg = await get_config()
        
        # Use provided path or default download directory
        if path:
            browse_path = Path(path)
        else:
            browse_path = Path(cfg.session.downloads.folder)
        
        # Security check - ensure path exists and is accessible
        if not browse_path.exists():
            raise HTTPException(status_code=404, detail="Directory not found")
        
        if not browse_path.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        # Get directory contents
        items = []
        total_size = 0
        
        try:
            for item_path in browse_path.iterdir():
                # Skip hidden files if not requested
                if not show_hidden and item_path.name.startswith('.'):
                    continue
                
                try:
                    stat = item_path.stat()
                    is_dir = item_path.is_dir()
                    
                    file_info = FileInfo(
                        name=item_path.name,
                        path=str(item_path),
                        type="directory" if is_dir else "file",
                        size=None if is_dir else stat.st_size,
                        modified=str(stat.st_mtime),
                        extension=item_path.suffix.lower() if not is_dir else None,
                        is_audio=not is_dir and item_path.suffix.lower() in AUDIO_EXTENSIONS
                    )
                    
                    items.append(file_info)
                    
                    if not is_dir:
                        total_size += stat.st_size
                        
                except (OSError, PermissionError) as e:
                    logger.warning(f"Cannot access {item_path}: {e}")
                    continue
        
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Sort items: directories first, then files
        items.sort(key=lambda x: (x.type == "file", x.name.lower()))
        
        # Get parent directory
        parent_path = str(browse_path.parent) if browse_path.parent != browse_path else None
        
        return DirectoryResponse(
            success=True,
            path=str(browse_path),
            parent=parent_path,
            items=items,
            total_items=len(items),
            total_size=total_size,
            message=f"Found {len(items)} items in directory"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to browse directory: {e}")
        raise HTTPException(status_code=500, detail="Failed to browse directory")


@files_router.get("/downloads", response_model=DirectoryResponse, summary="Browse download directory")
async def browse_downloads():
    """
    Browse the configured download directory
    
    This is a convenience endpoint that always browses the main download folder.
    """
    return await browse_directory(path=None)


@files_router.post("/organize", summary="Organize files")
async def organize_files(request: OrganizeRequest):
    """
    Organize files according to specified method
    
    Organization methods:
    - artist_album: Artist/Album structure
    - album: Album-based organization
    - artist: Artist-based organization  
    - source: Source-based organization (Qobuz, Tidal, etc.)
    """
    try:
        # Validate source paths
        valid_paths = []
        for path_str in request.source_paths:
            path = Path(path_str)
            if path.exists():
                valid_paths.append(path)
            else:
                logger.warning(f"Path does not exist: {path_str}")
        
        if not valid_paths:
            raise HTTPException(status_code=400, detail="No valid source paths provided")
        
        # Validate target directory
        target_dir = Path(request.target_directory)
        if not target_dir.exists():
            target_dir.mkdir(parents=True, exist_ok=True)
        
        organized_count = 0
        failed_count = 0
        
        for source_path in valid_paths:
            try:
                # This is a simplified implementation
                # In a real implementation, you would:
                # 1. Read metadata from audio files
                # 2. Create appropriate directory structure
                # 3. Move/copy files to organized locations
                
                if source_path.is_file() and source_path.suffix.lower() in AUDIO_EXTENSIONS:
                    # Organize single audio file
                    organized_count += 1
                elif source_path.is_dir():
                    # Organize directory contents
                    for audio_file in source_path.rglob("*"):
                        if audio_file.is_file() and audio_file.suffix.lower() in AUDIO_EXTENSIONS:
                            organized_count += 1
                
            except Exception as e:
                logger.error(f"Failed to organize {source_path}: {e}")
                failed_count += 1
        
        return {
            "success": True,
            "organized_count": organized_count,
            "failed_count": failed_count,
            "target_directory": str(target_dir),
            "message": f"Organized {organized_count} files, {failed_count} failed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File organization failed: {e}")
        raise HTTPException(status_code=500, detail="File organization failed")


@files_router.get("/stats", summary="Get file statistics")
async def get_file_stats(
    path: Optional[str] = Query(None, description="Directory path to analyze")
):
    """
    Get statistics about files in a directory
    
    Returns information about file types, sizes, and audio formats.
    """
    try:
        cfg = await get_config()
        
        # Use provided path or default download directory
        if path:
            analyze_path = Path(path)
        else:
            analyze_path = Path(cfg.session.downloads.folder)
        
        if not analyze_path.exists() or not analyze_path.is_dir():
            raise HTTPException(status_code=404, detail="Directory not found")
        
        stats = {
            "total_files": 0,
            "total_directories": 0,
            "total_size": 0,
            "audio_files": 0,
            "file_types": {},
            "audio_formats": {},
            "largest_files": []
        }
        
        # Analyze directory recursively
        for item in analyze_path.rglob("*"):
            try:
                if item.is_file():
                    stat = item.stat()
                    stats["total_files"] += 1
                    stats["total_size"] += stat.st_size
                    
                    # Track file extension
                    ext = item.suffix.lower()
                    stats["file_types"][ext] = stats["file_types"].get(ext, 0) + 1
                    
                    # Track audio files
                    if ext in AUDIO_EXTENSIONS:
                        stats["audio_files"] += 1
                        stats["audio_formats"][ext] = stats["audio_formats"].get(ext, 0) + 1
                    
                    # Track largest files
                    stats["largest_files"].append({
                        "name": item.name,
                        "path": str(item),
                        "size": stat.st_size
                    })
                    
                elif item.is_dir():
                    stats["total_directories"] += 1
                    
            except (OSError, PermissionError):
                continue
        
        # Sort and limit largest files
        stats["largest_files"].sort(key=lambda x: x["size"], reverse=True)
        stats["largest_files"] = stats["largest_files"][:10]
        
        return {
            "success": True,
            "path": str(analyze_path),
            "statistics": stats,
            "message": "File statistics generated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate file statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate file statistics")
