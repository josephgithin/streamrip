#!/usr/bin/env python3
"""
Reorganize Playlists

A standalone utility script to reorganize music files from playlist folders into artist/album/track structure.

This script will:
1. Scan your playlist folders
2. Read the metadata from each music file
3. Create artist/album folder structure
4. Move the files to their new locations based on metadata

Usage:
  python reorganize_playlists.py --downloads-folder "/path/to/music" [options]

Requirements:
  - Python 3.6+
  - mutagen library (install with: pip install mutagen)

This script has no dependencies on streamrip and can be used with any music collection.
"""

import argparse
import logging
import os
import re
import shutil

import mutagen  # You'll need to install this: pip install mutagen

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("reorganize")

def clean_filepath(filepath):
    """
    Clean a filepath by removing invalid characters and limiting length.
    This is a standalone version of the function from streamrip.
    """
    # Replace invalid characters with underscores
    illegal_chars = r'[<>:"/\\|?*\x00-\x1f]'
    filepath = re.sub(illegal_chars, '_', filepath)

    # Remove trailing periods and spaces
    filepath = filepath.rstrip('. ')

    # Limit length (Windows has a 255 character path limit)
    if len(filepath) > 150:  # Conservative limit
        filepath = filepath[:147] + '...'

    return filepath

def get_metadata(file_path):
    """Extract artist and album metadata from a music file."""
    try:
        audio = mutagen.File(file_path)
        if audio is None:
            return None, None, None

        # Try different tag formats
        if hasattr(audio, 'tags'):
            # MP3 and similar formats
            artist = None
            albumartist = None
            album = None

            # Try different tag variations
            if 'TPE1' in audio:
                artist = str(audio['TPE1'].text[0])
            elif 'artist' in audio:
                artist = str(audio['artist'][0])

            if 'TPE2' in audio:
                albumartist = str(audio['TPE2'].text[0])
            elif 'albumartist' in audio:
                albumartist = str(audio['albumartist'][0])

            if 'TALB' in audio:
                album = str(audio['TALB'].text[0])
            elif 'album' in audio:
                album = str(audio['album'][0])

            # Prefer albumartist over artist if available
            if albumartist:
                artist = albumartist

            return artist, album, None
        else:
            # FLAC and similar formats
            artist = None
            albumartist = None
            album = None
            disc = None

            if 'artist' in audio:
                artist = str(audio['artist'][0])
            if 'albumartist' in audio:
                albumartist = str(audio['albumartist'][0])
            if 'album' in audio:
                album = str(audio['album'][0])
            if 'discnumber' in audio:
                disc = str(audio['discnumber'][0])

            # Prefer albumartist over artist if available
            if albumartist:
                artist = albumartist

            return artist, album, disc
    except Exception as e:
        logger.error(f"Error reading metadata from {file_path}: {e}")
        return None, None, None

def reorganize_file(file_path, downloads_folder, use_disc_subdirs=True, dry_run=False):
    """Reorganize a single file into artist/album structure."""
    artist, album, disc = get_metadata(file_path)

    if not artist or not album:
        logger.warning(f"Could not extract artist or album from {file_path}")
        return False

    # Create the new folder structure
    artist_folder = os.path.join(downloads_folder, clean_filepath(artist))
    album_folder = os.path.join(artist_folder, clean_filepath(album))

    # Determine the target folder
    if use_disc_subdirs and disc and disc != '1/1':
        target_folder = os.path.join(album_folder, f"Disc {disc.split('/')[0]}")
    else:
        target_folder = album_folder

    # Create the target folder if it doesn't exist
    if not dry_run:
        os.makedirs(target_folder, exist_ok=True)

    # Get the filename
    filename = os.path.basename(file_path)
    target_path = os.path.join(target_folder, filename)

    # Check if the target file already exists
    if os.path.exists(target_path):
        logger.warning(f"File already exists at {target_path}")
        return False

    # Move the file
    logger.info(f"Moving {file_path} to {target_path}")
    if not dry_run:
        shutil.move(file_path, target_path)

    return True

def reorganize_playlist_folder(playlist_folder, downloads_folder, use_disc_subdirs=True, dry_run=False):
    """Reorganize all files in a playlist folder."""
    logger.info(f"Processing playlist folder: {playlist_folder}")

    # Count statistics
    total_files = 0
    moved_files = 0
    skipped_files = 0

    # Process all music files in the playlist folder
    for root, _, files in os.walk(playlist_folder):
        for file in files:
            if file.endswith(('.mp3', '.flac', '.m4a', '.ogg', '.opus')):
                total_files += 1
                file_path = os.path.join(root, file)

                if reorganize_file(file_path, downloads_folder, use_disc_subdirs, dry_run):
                    moved_files += 1
                else:
                    skipped_files += 1

    logger.info(f"Playlist folder {playlist_folder} processed:")
    logger.info(f"  Total files: {total_files}")
    logger.info(f"  Moved files: {moved_files}")
    logger.info(f"  Skipped files: {skipped_files}")

    # Remove empty directories if not in dry run mode
    if not dry_run and total_files == moved_files:
        for root, dirs, files in os.walk(playlist_folder, topdown=False):
            for dir in dirs:
                dir_path = os.path.join(root, dir)
                if not os.listdir(dir_path):
                    logger.info(f"Removing empty directory: {dir_path}")
                    os.rmdir(dir_path)

        # Try to remove the playlist folder itself if it's empty
        if not os.listdir(playlist_folder):
            logger.info(f"Removing empty playlist folder: {playlist_folder}")
            os.rmdir(playlist_folder)

    return total_files, moved_files, skipped_files

def main():
    parser = argparse.ArgumentParser(description="Reorganize playlist downloads into artist/album structure")
    parser.add_argument("--downloads-folder", "-d", required=True, help="Path to downloads folder containing your playlists")
    parser.add_argument("--playlist-folder", "-p", help="Specific playlist folder to process (default: all playlist folders)")
    parser.add_argument("--use-disc-subdirs", action="store_true", default=True, help="Create disc subdirectories for multi-disc albums")
    parser.add_argument("--no-disc-subdirs", action="store_true", help="Don't create disc subdirectories for multi-disc albums")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually move files, just show what would be done")
    args = parser.parse_args()

    # Determine downloads folder
    downloads_folder = args.downloads_folder
    if not os.path.isdir(downloads_folder):
        logger.error(f"Downloads folder not found: {downloads_folder}")
        return

    logger.info(f"Using downloads folder: {downloads_folder}")

    # Determine whether to use disc subdirectories
    use_disc_subdirs = args.use_disc_subdirs and not args.no_disc_subdirs
    logger.info(f"Using disc subdirectories: {use_disc_subdirs}")

    # Process specific playlist folder or all playlist folders
    if args.playlist_folder:
        playlist_folder = os.path.join(downloads_folder, args.playlist_folder)
        if not os.path.isdir(playlist_folder):
            logger.error(f"Playlist folder not found: {playlist_folder}")
            return

        logger.info(f"Dry run mode: {args.dry_run}")
        reorganize_playlist_folder(playlist_folder, downloads_folder, use_disc_subdirs, args.dry_run)
    else:
        # Process all folders in the downloads folder that might be playlists
        total_playlists = 0
        total_files = 0
        total_moved = 0
        total_skipped = 0

        logger.info(f"Dry run mode: {args.dry_run}")
        logger.info("Scanning for playlist folders...")

        for item in os.listdir(downloads_folder):
            item_path = os.path.join(downloads_folder, item)

            # Skip artist folders (they should contain album subfolders)
            if os.path.isdir(item_path):
                is_artist_folder = False
                for subitem in os.listdir(item_path):
                    subitem_path = os.path.join(item_path, subitem)
                    if os.path.isdir(subitem_path):
                        is_artist_folder = True
                        break

                if is_artist_folder:
                    logger.debug(f"Skipping artist folder: {item_path}")
                    continue

                # Process as a playlist folder
                total_playlists += 1
                files, moved, skipped = reorganize_playlist_folder(
                    item_path, downloads_folder, use_disc_subdirs, args.dry_run
                )
                total_files += files
                total_moved += moved
                total_skipped += skipped

        logger.info("Reorganization complete:")
        logger.info(f"  Total playlists processed: {total_playlists}")
        logger.info(f"  Total files: {total_files}")
        logger.info(f"  Total moved: {total_moved}")
        logger.info(f"  Total skipped: {total_skipped}")

if __name__ == "__main__":
    main()
