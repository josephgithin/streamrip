#!/bin/bash

# Streamrip Web Interface Backend Test Script
# Tests only the backend API without frontend complexity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    print_success "Docker Compose is available: $COMPOSE_CMD"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p config downloads logs
    
    # Create a basic streamrip config if it doesn't exist
    if [ ! -f "config/config.toml" ]; then
        print_status "Creating default streamrip configuration..."
        cat > config/config.toml << 'EOF'
[downloads]
folder = "/app/downloads"
source_subdirectories = false
disc_subdirectories = true
concurrency = true
max_connections = 6
requests_per_minute = 60
verify_ssl = true

[qobuz]
quality = 3
download_booklets = true
use_auth_token = false
email_or_userid = ""
password_or_token = ""
app_id = ""
secrets = []

[tidal]
quality = 3
download_videos = true
user_id = ""
country_code = ""
access_token = ""
refresh_token = ""
token_expiry = ""

[deezer]
arl = ""
quality = 2
use_deezloader = false
deezloader_warnings = true

[soundcloud]
quality = 0
client_id = ""
app_version = ""

[youtube]
quality = 0
download_videos = false
video_downloads_folder = "/app/downloads/YouTubeVideos"

[database]
downloads_enabled = true
downloads_path = "/app/config/downloads.db"
failed_downloads_enabled = true
failed_downloads_path = "/app/config/failed_downloads.db"

[conversion]
enabled = false
codec = "FLAC"
sampling_rate = 48000
bit_depth = 24
lossy_bitrate = 320

[qobuz_filters]
extras = false
repeats = false
non_albums = false
features = false
non_studio_albums = false
non_remaster = false

[artwork]
embed = true
embed_size = "large"
embed_max_width = -1
save_artwork = true
saved_max_width = -1

[metadata]
set_playlist_to_album = false
renumber_playlist_tracks = false
organize_playlist_by_albums = false
exclude = []

[filepaths]
add_singles_to_folder = false
folder_format = "{albumartist} - {title} ({year}) [{container}] [{bit_depth}B-{sampling_rate}kHz]"
track_format = "{tracknumber:02}. {artist} - {title}{explicit}"
restrict_characters = false
truncate_to = 120

[lastfm]
source = "qobuz"
fallback_source = ""

[cli]
text_output = true
progress_bars = true
max_search_results = 100

[misc]
version = "2.0.6"
check_for_updates = true
EOF
        print_success "Default configuration created"
    else
        print_success "Configuration file already exists"
    fi
}

# Function to build and start the backend
start_backend() {
    print_status "Building and starting backend..."
    
    # Build the image
    print_status "Building backend Docker image..."
    $COMPOSE_CMD -f docker-compose.backend.yml build
    
    # Start the container
    print_status "Starting backend container..."
    $COMPOSE_CMD -f docker-compose.backend.yml up -d
    
    print_success "Backend started"
}

# Function to wait for the service to be ready
wait_for_service() {
    print_status "Waiting for backend service to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            print_success "Backend service is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for backend..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Backend service failed to start within expected time"
    return 1
}

# Function to run API tests
run_tests() {
    print_status "Running backend API tests..."
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -s http://localhost:8000/api/health | grep -q "healthy"; then
        print_success "✅ Health check passed"
    else
        print_error "❌ Health check failed"
        return 1
    fi
    
    # Test API documentation
    print_status "Testing API documentation..."
    if curl -s http://localhost:8000/api/docs > /dev/null; then
        print_success "✅ API documentation accessible"
    else
        print_error "❌ API documentation not accessible"
        return 1
    fi
    
    # Test basic web interface
    print_status "Testing basic web interface..."
    if curl -s http://localhost:8000/ | grep -q "Streamrip Web Interface"; then
        print_success "✅ Basic web interface accessible"
    else
        print_error "❌ Basic web interface not accessible"
        return 1
    fi
    
    # Test queue endpoint
    print_status "Testing downloads queue endpoint..."
    if curl -s http://localhost:8000/api/v1/downloads/queue > /dev/null; then
        print_success "✅ Downloads queue endpoint accessible"
    else
        print_error "❌ Downloads queue endpoint not accessible"
        return 1
    fi
    
    # Test configuration endpoint
    print_status "Testing configuration endpoint..."
    if curl -s http://localhost:8000/api/v1/config/ > /dev/null; then
        print_success "✅ Configuration endpoint accessible"
    else
        print_error "❌ Configuration endpoint not accessible"
        return 1
    fi
    
    print_success "🎉 All backend tests passed!"
}

# Function to show service information
show_info() {
    echo ""
    echo "🎵 Streamrip Backend is running!"
    echo "================================"
    echo "🌐 Basic Interface: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/api/docs"
    echo "🔍 API Health: http://localhost:8000/api/health"
    echo "📊 Container Status:"
    $COMPOSE_CMD -f docker-compose.backend.yml ps
    echo ""
    echo "📝 To view logs: $COMPOSE_CMD -f docker-compose.backend.yml logs -f"
    echo "🛑 To stop: $COMPOSE_CMD -f docker-compose.backend.yml down"
    echo "🔄 To restart: $COMPOSE_CMD -f docker-compose.backend.yml restart"
    echo "================================"
}

# Function to show logs
show_logs() {
    print_status "Showing backend logs (Ctrl+C to exit)..."
    $COMPOSE_CMD -f docker-compose.backend.yml logs -f
}

# Function to stop containers
stop_backend() {
    print_status "Stopping backend..."
    $COMPOSE_CMD -f docker-compose.backend.yml down
    print_success "Backend stopped"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up backend resources..."
    $COMPOSE_CMD -f docker-compose.backend.yml down --volumes --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Main function
main() {
    echo "🐳 Streamrip Backend Docker Test"
    echo "================================"
    
    case "${1:-start}" in
        "start")
            check_docker
            check_docker_compose
            create_directories
            start_backend
            wait_for_service && run_tests && show_info
            ;;
        "stop")
            check_docker_compose
            stop_backend
            ;;
        "logs")
            check_docker_compose
            show_logs
            ;;
        "test")
            check_docker
            wait_for_service && run_tests
            ;;
        "cleanup")
            check_docker_compose
            cleanup
            ;;
        "restart")
            check_docker_compose
            stop_backend
            start_backend
            wait_for_service && show_info
            ;;
        *)
            echo "Usage: $0 {start|stop|logs|test|cleanup|restart}"
            echo ""
            echo "Commands:"
            echo "  start   - Build and start the backend (default)"
            echo "  stop    - Stop the backend"
            echo "  logs    - Show backend logs"
            echo "  test    - Run tests on running backend"
            echo "  cleanup - Stop backend and clean up resources"
            echo "  restart - Restart the backend"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
