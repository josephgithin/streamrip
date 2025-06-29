#!/usr/bin/env python3
"""
Test script to verify that playlist organization works correctly.
This script will download a playlist with the new organization option enabled.
"""

import asyncio
import logging
import sys
from pathlib import Path

from streamrip.client.qobuz import QobuzClient
from streamrip.config import Config
from streamrip.media.playlist import PendingPlaylist

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("streamrip")

async def main():
    if len(sys.argv) < 2:
        print("Usage: python test_playlist_organization.py <playlist_id>")
        sys.exit(1)
    
    playlist_id = sys.argv[1]
    
    # Load config
    config_path = Path.home() / ".config" / "streamrip" / "config.toml"
    if not config_path.exists():
        print(f"Config file not found at {config_path}")
        print("Please run 'rip config setup' first to configure streamrip")
        sys.exit(1)
    
    config = Config(config_path)
    
    # Enable the organize_playlist_by_albums option
    config.session.metadata.organize_playlist_by_albums = True
    
    # Initialize client
    client = QobuzClient(config)
    await client.login()
    
    # Create a pending playlist
    from streamrip.db import Database
    db = Database(config.session.downloads.db_path)
    pending_playlist = PendingPlaylist(playlist_id, client, config, db)
    
    # Resolve and download the playlist
    try:
        playlist = await pending_playlist.resolve()
        if playlist:
            print(f"Downloading playlist: {playlist.name}")
            await playlist.download()
            print(f"Download complete. Check your downloads folder for the organized tracks.")
        else:
            print("Failed to resolve playlist.")
    
    except Exception as e:
        print(f"Error downloading playlist: {e}")
    
    finally:
        # Clean up
        if hasattr(client, 'session') and client.session:
            await client.session.close()

if __name__ == "__main__":
    asyncio.run(main())
