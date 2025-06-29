# Reorganize Playlists

A standalone utility script to reorganize music files from playlist folders into artist/album/track structure.

## What This Script Does

This script will:
1. Scan your playlist folders
2. Read the metadata from each music file
3. Create artist/album folder structure
4. Move the files to their new locations based on metadata

## Requirements

- Python 3.6+
- mutagen library (install with: `pip install mutagen`)

## Installation

1. Download the `reorganize_playlists.py` script
2. Make it executable (optional): `chmod +x reorganize_playlists.py`
3. Install the required dependency: `pip install mutagen`

## Usage

Basic usage:

```bash
python reorganize_playlists.py --downloads-folder "/path/to/music"
```

### Command-line Options

- `--downloads-folder` or `-d`: (Required) Path to downloads folder containing your playlists
- `--playlist-folder` or `-p`: Specific playlist folder to process (default: all playlist folders)
- `--use-disc-subdirs`: Create disc subdirectories for multi-disc albums (default: enabled)
- `--no-disc-subdirs`: Don't create disc subdirectories for multi-disc albums
- `--dry-run`: Don't actually move files, just show what would be done

### Examples

1. Dry run to see what would happen without actually moving files:
   ```bash
   python reorganize_playlists.py --downloads-folder "/path/to/music" --dry-run
   ```

2. Process a specific playlist:
   ```bash
   python reorganize_playlists.py --downloads-folder "/path/to/music" --playlist-folder "My Playlist"
   ```

3. Don't create disc subdirectories:
   ```bash
   python reorganize_playlists.py --downloads-folder "/path/to/music" --no-disc-subdirs
   ```

## How It Works

1. The script scans your downloads folder for playlist folders
2. For each music file, it reads the metadata to extract the artist and album
3. It creates the appropriate artist/album folder structure
4. It moves the file to its new location
5. After moving all files from a playlist folder, it removes empty directories

## Folder Structure

Before:
```
Downloads/
└── Playlist Name/
    ├── Artist1 - Track1.mp3
    ├── Artist2 - Track2.mp3
    ├── Artist3 - Track3.mp3
    └── ...
```

After:
```
Downloads/
├── Artist1/
│   ├── Album1/
│   │   ├── 01 - Track1.mp3
│   │   └── 02 - Track2.mp3
│   └── Album2/
│       ├── 01 - Track3.mp3
│       └── 02 - Track4.mp3
├── Artist2/
│   └── Album3/
│       ├── 01 - Track5.mp3
│       └── 02 - Track6.mp3
└── ...
```

With disc subdirectories (for multi-disc albums):
```
Downloads/
└── Artist1/
    └── Album1/
        ├── Disc 1/
        │   ├── 01 - Track1.mp3
        │   └── 02 - Track2.mp3
        └── Disc 2/
            ├── 01 - Track3.mp3
            └── 02 - Track4.mp3
```

## Safety Features

- The script checks if a file already exists at the destination before moving
- It logs all actions for review
- It preserves the original file names
- Use the `--dry-run` option to see what would happen without actually moving files
