"""
Modern Configuration API for Streamrip Web Interface
Handles configuration management with validation and backup
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Create router
config_router = APIRouter()

# Pydantic models for modern API design
class ConfigUpdateRequest(BaseModel):
    """Request model for configuration updates"""
    config: Dict[str, Any] = Field(..., description="Configuration data to update")
    create_backup: bool = Field(True, description="Whether to create a backup before updating")
    
    class Config:
        schema_extra = {
            "example": {
                "config": {
                    "downloads": {
                        "folder": "/new/download/path",
                        "max_connections": 8
                    }
                },
                "create_backup": True
            }
        }


class ConfigSectionUpdateRequest(BaseModel):
    """Request model for configuration section updates"""
    section_data: Dict[str, Any] = Field(..., description="Section data to update")
    create_backup: bool = Field(True, description="Whether to create a backup before updating")
    
    class Config:
        schema_extra = {
            "example": {
                "section_data": {
                    "folder": "/new/download/path",
                    "max_connections": 8,
                    "quality": 3
                },
                "create_backup": True
            }
        }


class ConfigResponse(BaseModel):
    """Response model for configuration operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    config: Dict[str, Any] = Field(..., description="Configuration data")
    message: str = Field(..., description="Response message")


class ConfigValidationResponse(BaseModel):
    """Response model for configuration validation"""
    valid: bool = Field(..., description="Whether the configuration is valid")
    errors: List[str] = Field(..., description="List of validation errors")
    warnings: List[str] = Field(..., description="List of validation warnings")
    sections: Dict[str, Dict[str, Any]] = Field(..., description="Section-specific validation results")


class BackupInfo(BaseModel):
    """Model for backup information"""
    filename: str = Field(..., description="Backup filename")
    path: str = Field(..., description="Full path to backup file")
    created_at: str = Field(..., description="Creation timestamp")
    size: int = Field(..., description="File size in bytes")


class BackupsResponse(BaseModel):
    """Response model for backup operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    backups: List[BackupInfo] = Field(..., description="List of available backups")
    message: str = Field(..., description="Response message")


# Global config manager reference (will be injected)
config_manager = None


def set_config_manager(manager):
    """Inject config manager dependency"""
    global config_manager
    config_manager = manager


@config_router.get("/", response_model=ConfigResponse, summary="Get full configuration")
async def get_config():
    """
    Get the complete streamrip configuration
    
    Returns all configuration sections including:
    - downloads: Download settings
    - sources: Music source configurations (Qobuz, Tidal, etc.)
    - metadata: Metadata handling options
    - filepaths: File naming and organization
    - artwork: Cover art settings
    - conversion: Audio conversion options
    - And more...
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        config_data = await config_manager.get_config()
        
        return ConfigResponse(
            success=True,
            config=config_data,
            message="Configuration retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to get configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration")


@config_router.put("/", response_model=ConfigResponse, summary="Update full configuration")
async def update_config(request: ConfigUpdateRequest):
    """
    Update the complete streamrip configuration
    
    This endpoint allows updating multiple configuration sections at once.
    A backup is created by default before applying changes.
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        updated_config = await config_manager.update_config(
            updates=request.config,
            create_backup=request.create_backup
        )
        
        return ConfigResponse(
            success=True,
            config=updated_config,
            message="Configuration updated successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to update configuration")


@config_router.get("/{section}", summary="Get configuration section")
async def get_config_section(section: str):
    """
    Get a specific configuration section
    
    Available sections:
    - downloads: Download folder, concurrency, SSL settings
    - qobuz: Qobuz authentication and quality settings
    - tidal: Tidal authentication and quality settings
    - deezer: Deezer authentication and quality settings
    - soundcloud: SoundCloud client settings
    - youtube: YouTube download settings
    - lastfm: Last.fm playlist settings
    - filepaths: File naming templates and organization
    - artwork: Cover art embedding and saving options
    - metadata: Metadata handling and playlist options
    - qobuz_filters: Qobuz discography filtering options
    - cli: CLI display and progress settings
    - database: Download history database settings
    - conversion: Audio format conversion settings
    - misc: Miscellaneous settings
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        section_data = await config_manager.get_config_section(section)
        
        return {
            "success": True,
            "section": section,
            "data": section_data,
            "message": f"Configuration section '{section}' retrieved successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get configuration section '{section}': {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration section")


@config_router.put("/{section}", summary="Update configuration section")
async def update_config_section(section: str, request: ConfigSectionUpdateRequest):
    """
    Update a specific configuration section
    
    This endpoint allows updating individual configuration sections
    without affecting other parts of the configuration.
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        updated_section = await config_manager.update_config_section(
            section=section,
            updates=request.section_data,
            create_backup=request.create_backup
        )
        
        return {
            "success": True,
            "section": section,
            "data": updated_section,
            "message": f"Configuration section '{section}' updated successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update configuration section '{section}': {e}")
        raise HTTPException(status_code=500, detail="Failed to update configuration section")


@config_router.post("/{section}/reset", summary="Reset configuration section")
async def reset_config_section(section: str):
    """
    Reset a configuration section to default values
    
    This creates a backup before resetting the section to its default state.
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        reset_section = await config_manager.reset_config_section(section)
        
        return {
            "success": True,
            "section": section,
            "data": reset_section,
            "message": f"Configuration section '{section}' reset to defaults successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to reset configuration section '{section}': {e}")
        raise HTTPException(status_code=500, detail="Failed to reset configuration section")


@config_router.get("/validate", response_model=ConfigValidationResponse, summary="Validate configuration")
async def validate_config():
    """
    Validate the current configuration
    
    Checks all configuration sections for:
    - Required fields
    - Valid value ranges
    - Proper data types
    - Cross-section dependencies
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        validation_results = await config_manager.validate_config()
        
        return ConfigValidationResponse(**validation_results)
        
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}")
        raise HTTPException(status_code=500, detail="Configuration validation failed")


@config_router.get("/backups", response_model=BackupsResponse, summary="Get configuration backups")
async def get_config_backups():
    """
    Get list of available configuration backups
    
    Returns information about all available configuration backups
    including creation time and file size.
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        backups_data = await config_manager.get_backups()
        backups = [BackupInfo(**backup) for backup in backups_data]
        
        return BackupsResponse(
            success=True,
            backups=backups,
            message=f"Found {len(backups)} configuration backups"
        )
        
    except Exception as e:
        logger.error(f"Failed to get configuration backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration backups")


@config_router.post("/backups/{backup_filename}/restore", response_model=ConfigResponse, summary="Restore configuration backup")
async def restore_config_backup(backup_filename: str):
    """
    Restore configuration from a backup file
    
    This will replace the current configuration with the selected backup.
    A backup of the current configuration is created before restoration.
    """
    try:
        if not config_manager:
            raise HTTPException(status_code=500, detail="Configuration manager not initialized")
        
        restored_config = await config_manager.restore_backup(backup_filename)
        
        return ConfigResponse(
            success=True,
            config=restored_config,
            message=f"Configuration restored from backup '{backup_filename}' successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to restore configuration backup '{backup_filename}': {e}")
        raise HTTPException(status_code=500, detail="Failed to restore configuration backup")
