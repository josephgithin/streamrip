"""
Modern Search API for Streamrip Web Interface
Handles search operations across all music sources with modern REST design
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field

from streamrip.config import Config, DEFAULT_CONFIG_PATH
from streamrip.rip.main import Main as StreamripMain

logger = logging.getLogger(__name__)

# Create router
search_router = APIRouter()

# Pydantic models for modern API design
class SearchRequest(BaseModel):
    """Request model for search operations"""
    query: str = Field(..., min_length=1, max_length=200, description="Search query")
    source: str = Field(..., pattern="^(qobuz|tidal|deezer|soundcloud|all)$", description="Music source to search")
    media_type: str = Field(..., pattern="^(track|album|playlist|artist)$", description="Type of media to search for")
    limit: int = Field(50, ge=1, le=500, description="Maximum number of results")
    
    class Config:
        schema_extra = {
            "example": {
                "query": "Pink Floyd Dark Side",
                "source": "qobuz",
                "media_type": "album",
                "limit": 20
            }
        }


class SearchResult(BaseModel):
    """Individual search result model"""
    id: str = Field(..., description="Unique ID from the source")
    title: str = Field(..., description="Title of the item")
    artist: str = Field("", description="Artist name")
    album: str = Field("", description="Album name")
    source: str = Field(..., description="Music source")
    media_type: str = Field(..., description="Media type")
    duration: Optional[int] = Field(None, description="Duration in seconds")
    release_date: Optional[str] = Field(None, description="Release date")
    quality: Optional[str] = Field(None, description="Available quality")
    cover_url: Optional[str] = Field(None, description="Cover image URL")
    preview_url: Optional[str] = Field(None, description="Preview audio URL")
    external_url: Optional[str] = Field(None, description="External URL to the item")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "abc123xyz",
                "title": "The Dark Side of the Moon",
                "artist": "Pink Floyd",
                "album": "The Dark Side of the Moon",
                "source": "qobuz",
                "media_type": "album",
                "duration": 2580,
                "release_date": "1973-03-01",
                "quality": "24-bit/96kHz",
                "cover_url": "https://example.com/cover.jpg"
            }
        }


class SearchResponse(BaseModel):
    """Response model for search operations"""
    success: bool = Field(..., description="Whether the search was successful")
    query: str = Field(..., description="Original search query")
    source: str = Field(..., description="Source that was searched")
    media_type: str = Field(..., description="Media type that was searched")
    total_results: int = Field(..., description="Total number of results found")
    results: List[SearchResult] = Field(..., description="Search results")
    search_time: float = Field(..., description="Search time in seconds")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "query": "Pink Floyd Dark Side",
                "source": "qobuz",
                "media_type": "album",
                "total_results": 15,
                "results": [],
                "search_time": 1.23
            }
        }


class MultiSourceSearchResponse(BaseModel):
    """Response model for multi-source search operations"""
    success: bool = Field(..., description="Whether the search was successful")
    query: str = Field(..., description="Original search query")
    media_type: str = Field(..., description="Media type that was searched")
    sources_searched: List[str] = Field(..., description="Sources that were searched")
    total_results: int = Field(..., description="Total number of results across all sources")
    results_by_source: Dict[str, List[SearchResult]] = Field(..., description="Results grouped by source")
    search_time: float = Field(..., description="Total search time in seconds")


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


@search_router.get("/{source}", response_model=SearchResponse, summary="Search specific source")
async def search_source(
    source: str = Path(..., pattern="^(qobuz|tidal|deezer|soundcloud)$"),
    query: str = Query(..., min_length=1, max_length=200, description="Search query"),
    media_type: str = Query(..., pattern="^(track|album|playlist|artist)$", description="Media type"),
    limit: int = Query(50, ge=1, le=500, description="Maximum results")
):
    """
    Search for music on a specific source
    
    Supported sources:
    - qobuz: High-quality music streaming
    - tidal: High-fidelity music streaming  
    - deezer: Music streaming service
    - soundcloud: Audio platform
    
    Supported media types:
    - track: Individual songs
    - album: Music albums
    - playlist: Curated playlists
    - artist: Music artists
    """
    import time
    start_time = time.time()
    
    try:
        cfg = await get_config()
        
        async with StreamripMain(cfg) as main:
            client = await main.get_logged_in_client(source)
            
            # Perform search
            pages = await client.search(media_type, query, limit=limit)
            
            if not pages:
                return SearchResponse(
                    success=True,
                    query=query,
                    source=source,
                    media_type=media_type,
                    total_results=0,
                    results=[],
                    search_time=time.time() - start_time
                )
            
            # Convert results to our format
            results = []
            for page in pages:
                for item in page.get('items', []):
                    result = _convert_search_result(item, source, media_type)
                    if result:
                        results.append(result)
            
            return SearchResponse(
                success=True,
                query=query,
                source=source,
                media_type=media_type,
                total_results=len(results),
                results=results[:limit],  # Ensure we don't exceed limit
                search_time=time.time() - start_time
            )
            
    except Exception as e:
        logger.error(f"Search failed for {source}: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@search_router.get("/all", response_model=MultiSourceSearchResponse, summary="Search all sources")
async def search_all_sources(
    query: str = Query(..., min_length=1, max_length=200, description="Search query"),
    media_type: str = Query(..., pattern="^(track|album|playlist|artist)$", description="Media type"),
    limit_per_source: int = Query(20, ge=1, le=100, description="Maximum results per source")
):
    """
    Search for music across all available sources
    
    This endpoint searches all configured sources in parallel and returns
    results grouped by source. Useful for comparing results across platforms.
    """
    import time
    import asyncio
    start_time = time.time()
    
    try:
        cfg = await get_config()
        sources = ["qobuz", "tidal", "deezer", "soundcloud"]
        
        # Search all sources concurrently
        search_tasks = []
        async with StreamripMain(cfg) as main:
            for source in sources:
                task = _search_source_internal(main, source, media_type, query, limit_per_source)
                search_tasks.append(task)
            
            # Wait for all searches to complete
            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        # Process results
        results_by_source = {}
        sources_searched = []
        total_results = 0
        
        for i, result in enumerate(search_results):
            source = sources[i]
            
            if isinstance(result, Exception):
                logger.warning(f"Search failed for {source}: {result}")
                results_by_source[source] = []
            else:
                results_by_source[source] = result
                sources_searched.append(source)
                total_results += len(result)
        
        return MultiSourceSearchResponse(
            success=True,
            query=query,
            media_type=media_type,
            sources_searched=sources_searched,
            total_results=total_results,
            results_by_source=results_by_source,
            search_time=time.time() - start_time
        )
        
    except Exception as e:
        logger.error(f"Multi-source search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


async def _search_source_internal(main: StreamripMain, source: str, media_type: str, query: str, limit: int) -> List[SearchResult]:
    """Internal helper for searching a single source"""
    try:
        client = await main.get_logged_in_client(source)
        pages = await client.search(media_type, query, limit=limit)
        
        results = []
        for page in pages:
            for item in page.get('items', []):
                result = _convert_search_result(item, source, media_type)
                if result:
                    results.append(result)
        
        return results[:limit]
        
    except Exception as e:
        logger.warning(f"Search failed for {source}: {e}")
        return []


def _convert_search_result(item: Dict[str, Any], source: str, media_type: str) -> Optional[SearchResult]:
    """Convert raw search result to our SearchResult model"""
    try:
        # Extract common fields (this will need to be adapted based on actual API responses)
        result = SearchResult(
            id=str(item.get('id', '')),
            title=item.get('title', item.get('name', '')),
            artist=item.get('artist', {}).get('name', '') if isinstance(item.get('artist'), dict) else str(item.get('artist', '')),
            album=item.get('album', {}).get('title', '') if isinstance(item.get('album'), dict) else str(item.get('album', '')),
            source=source,
            media_type=media_type,
            duration=item.get('duration'),
            release_date=item.get('release_date', item.get('released_at')),
            quality=_extract_quality_info(item, source),
            cover_url=_extract_cover_url(item),
            preview_url=item.get('preview_url'),
            external_url=item.get('external_url', item.get('url'))
        )
        
        return result
        
    except Exception as e:
        logger.warning(f"Failed to convert search result: {e}")
        return None


def _extract_quality_info(item: Dict[str, Any], source: str) -> Optional[str]:
    """Extract quality information from search result"""
    # This will need to be implemented based on actual API responses
    quality_map = {
        'qobuz': item.get('maximum_bit_depth', ''),
        'tidal': item.get('audioQuality', ''),
        'deezer': 'MP3 320kbps',  # Default for Deezer
        'soundcloud': 'MP3 128kbps'  # Default for SoundCloud
    }
    
    return quality_map.get(source)


def _extract_cover_url(item: Dict[str, Any]) -> Optional[str]:
    """Extract cover image URL from search result"""
    # Handle different cover URL formats
    cover = item.get('image', item.get('cover', item.get('artwork_url')))
    
    if isinstance(cover, dict):
        # Handle nested cover objects
        return cover.get('large', cover.get('medium', cover.get('small')))
    elif isinstance(cover, str):
        return cover
    
    return None
