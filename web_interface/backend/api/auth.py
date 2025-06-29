"""
Modern Authentication API for Streamrip Web Interface
Handles music source authentication and credential management
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from streamrip.config import Config, DEFAULT_CONFIG_PATH
from streamrip.rip.main import Main as StreamripMain

logger = logging.getLogger(__name__)

# Create router
auth_router = APIRouter()

# Pydantic models
class AuthRequest(BaseModel):
    """Request model for authentication"""
    credentials: Dict[str, Any] = Field(..., description="Authentication credentials")
    
    class Config:
        schema_extra = {
            "example": {
                "credentials": {
                    "email_or_userid": "user@example.com",
                    "password_or_token": "password123"
                }
            }
        }


class AuthStatusResponse(BaseModel):
    """Response model for authentication status"""
    success: bool = Field(..., description="Whether the operation was successful")
    source: str = Field(..., description="Music source")
    authenticated: bool = Field(..., description="Whether the source is authenticated")
    user_info: Optional[Dict[str, Any]] = Field(None, description="User information if available")
    message: str = Field(..., description="Response message")


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


@auth_router.get("/{source}", response_model=AuthStatusResponse, summary="Check authentication status")
async def check_auth_status(source: str):
    """
    Check authentication status for a music source
    
    Supported sources:
    - qobuz: Requires email/userid and password/token
    - tidal: Uses OAuth tokens
    - deezer: Requires ARL cookie
    - soundcloud: Requires client ID
    """
    try:
        if source not in ["qobuz", "tidal", "deezer", "soundcloud"]:
            raise HTTPException(status_code=400, detail="Invalid source")
        
        cfg = await get_config()
        
        async with StreamripMain(cfg) as main:
            try:
                client = await main.get_logged_in_client(source)
                authenticated = client.logged_in if hasattr(client, 'logged_in') else True
                
                return AuthStatusResponse(
                    success=True,
                    source=source,
                    authenticated=authenticated,
                    message=f"{source.title()} authentication status checked"
                )
                
            except Exception as e:
                return AuthStatusResponse(
                    success=True,
                    source=source,
                    authenticated=False,
                    message=f"{source.title()} is not authenticated: {str(e)}"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check auth status for {source}: {e}")
        raise HTTPException(status_code=500, detail="Failed to check authentication status")


@auth_router.post("/{source}", response_model=AuthStatusResponse, summary="Authenticate with source")
async def authenticate_source(source: str, request: AuthRequest):
    """
    Authenticate with a music source
    
    Updates the configuration with the provided credentials and tests the connection.
    """
    try:
        if source not in ["qobuz", "tidal", "deezer", "soundcloud"]:
            raise HTTPException(status_code=400, detail="Invalid source")
        
        cfg = await get_config()
        
        # Update configuration with new credentials
        source_config = getattr(cfg.session, source)
        
        for key, value in request.credentials.items():
            if hasattr(source_config, key):
                setattr(source_config, key, value)
        
        # Mark config as modified and save
        cfg.session.set_modified()
        cfg.save_file()
        
        # Test authentication
        async with StreamripMain(cfg) as main:
            try:
                client = await main.get_logged_in_client(source)
                authenticated = client.logged_in if hasattr(client, 'logged_in') else True
                
                if authenticated:
                    return AuthStatusResponse(
                        success=True,
                        source=source,
                        authenticated=True,
                        message=f"{source.title()} authenticated successfully"
                    )
                else:
                    return AuthStatusResponse(
                        success=False,
                        source=source,
                        authenticated=False,
                        message=f"{source.title()} authentication failed"
                    )
                    
            except Exception as e:
                return AuthStatusResponse(
                    success=False,
                    source=source,
                    authenticated=False,
                    message=f"{source.title()} authentication failed: {str(e)}"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to authenticate {source}: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@auth_router.delete("/{source}", summary="Clear authentication")
async def clear_authentication(source: str):
    """
    Clear authentication credentials for a source
    
    This removes stored credentials and logs out from the service.
    """
    try:
        if source not in ["qobuz", "tidal", "deezer", "soundcloud"]:
            raise HTTPException(status_code=400, detail="Invalid source")
        
        cfg = await get_config()
        source_config = getattr(cfg.session, source)
        
        # Clear credentials based on source type
        if source == "qobuz":
            source_config.email_or_userid = ""
            source_config.password_or_token = ""
        elif source == "tidal":
            source_config.access_token = ""
            source_config.refresh_token = ""
            source_config.user_id = ""
        elif source == "deezer":
            source_config.arl = ""
        elif source == "soundcloud":
            source_config.client_id = ""
        
        # Save configuration
        cfg.session.set_modified()
        cfg.save_file()
        
        return {
            "success": True,
            "source": source,
            "message": f"{source.title()} authentication cleared successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to clear authentication for {source}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear authentication")
