"""
Streamrip Web Interface - Modern FastAPI Backend
Provides RESTful API for all streamrip functionality with real-time features
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from streamrip.config import Config, DEFAULT_CONFIG_PATH
from streamrip.rip.main import Main as StreamripMain

from api.downloads import downloads_router, set_download_manager
from api.search import search_router
from api.config import config_router, set_config_manager
from api.database import database_router
from api.auth import auth_router
from api.files import files_router
from core.websocket_manager import WebSocketManager
from core.download_manager import DownloadManager
from core.config_manager import ConfigManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global managers
websocket_manager = WebSocketManager()
download_manager = DownloadManager()
config_manager = ConfigManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Starting Streamrip Web Interface")

    # Initialize managers
    await download_manager.initialize()
    await config_manager.initialize()

    # Inject managers into API modules
    download_manager.set_websocket_manager(websocket_manager)
    set_download_manager(download_manager)
    set_config_manager(config_manager)

    yield

    # Cleanup
    logger.info("🛑 Shutting down Streamrip Web Interface")
    await download_manager.cleanup()


# Create FastAPI app with modern configuration
app = FastAPI(
    title="Streamrip Web Interface",
    description="Modern web interface for the Streamrip music downloader",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Modern CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers with modern versioning
app.include_router(downloads_router, prefix="/api/v1/downloads", tags=["Downloads"])
app.include_router(search_router, prefix="/api/v1/search", tags=["Search"])
app.include_router(config_router, prefix="/api/v1/config", tags=["Configuration"])
app.include_router(database_router, prefix="/api/v1/database", tags=["Database"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(files_router, prefix="/api/v1/files", tags=["File Management"])


# WebSocket endpoints for real-time features
@app.websocket("/ws/progress")
async def websocket_progress(websocket: WebSocket):
    """WebSocket endpoint for real-time download progress"""
    await websocket_manager.connect_progress(websocket)
    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            # Handle client commands if needed
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        websocket_manager.disconnect_progress(websocket)


@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time log streaming"""
    await websocket_manager.connect_logs(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        websocket_manager.disconnect_logs(websocket)


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "download_manager": download_manager.is_healthy(),
            "config_manager": config_manager.is_healthy(),
            "websocket_manager": websocket_manager.is_healthy()
        }
    }


# Serve React frontend in production
static_dir = os.getenv("STATIC_DIR", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React app for all non-API routes"""
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404, detail="Endpoint not found")

        # Serve index.html for all frontend routes
        index_path = f"{static_dir}/index.html"
        if os.path.exists(index_path):
            with open(index_path) as f:
                return HTMLResponse(content=f.read())
        else:
            return HTMLResponse(content="<h1>Streamrip Web Interface</h1><p>Frontend not built yet.</p>")


# Development server configuration
if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
        access_log=True
    )
