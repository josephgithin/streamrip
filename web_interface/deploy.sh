#!/bin/bash

# Streamrip Web Interface Deployment Script
# This script builds and deploys the complete Streamrip web interface

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_ONLY_COMPOSE_FILE="docker-compose.backend.yml"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Streamrip Web Interface Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment (backend only)"
    echo "  build       Build frontend and backend"
    echo "  start       Start production environment"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Show logs from all services"
    echo "  clean       Clean up containers and images"
    echo "  status      Show status of all services"
    echo "  backup      Backup configuration and data"
    echo "  restore     Restore from backup"
    echo ""
    echo "Options:"
    echo "  --prod      Use production configuration"
    echo "  --monitoring Enable monitoring stack (Prometheus/Grafana)"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Start development backend"
    echo "  $0 build                  # Build all components"
    echo "  $0 start --prod           # Start production environment"
    echo "  $0 start --monitoring     # Start with monitoring"
    echo "  $0 logs backend           # Show backend logs"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p downloads
    mkdir -p config
    mkdir -p logs
    mkdir -p nginx/ssl
    mkdir -p nginx/logs
    mkdir -p monitoring
    mkdir -p backups
    
    # Set proper permissions
    chmod 755 downloads config logs
    
    log_success "Directories created"
}

build_frontend() {
    log_info "Building frontend..."
    
    cd frontend
    
    if [ ! -f "package.json" ]; then
        log_error "Frontend package.json not found"
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Build the frontend
    log_info "Building React application..."
    npm run build
    
    cd ..
    log_success "Frontend built successfully"
}

build_backend() {
    log_info "Building backend Docker image..."

    # Use the main compose file which has the backend service
    docker-compose -f $COMPOSE_FILE build streamrip-web

    log_success "Backend built successfully"
}

start_development() {
    log_info "Starting development environment..."
    
    # Start only backend for development
    docker-compose -f $BACKEND_ONLY_COMPOSE_FILE up -d
    
    log_success "Development environment started"
    log_info "Backend API: http://localhost:8000"
    log_info "API Documentation: http://localhost:8000/api/docs"
    log_info ""
    log_info "To start frontend development server:"
    log_info "  cd frontend && npm start"
}

start_production() {
    local use_monitoring=false
    local compose_files="-f $PROD_COMPOSE_FILE"
    
    # Parse options
    for arg in "$@"; do
        case $arg in
            --monitoring)
                use_monitoring=true
                compose_files="$compose_files --profile monitoring"
                ;;
        esac
    done
    
    log_info "Starting production environment..."
    
    # Build if needed
    if [ ! -d "frontend/build" ]; then
        build_frontend
    fi
    
    # Start services
    docker-compose $compose_files up -d
    
    log_success "Production environment started"
    log_info "Web Interface: http://localhost"
    log_info "API: http://localhost/api"
    
    if [ "$use_monitoring" = true ]; then
        log_info "Prometheus: http://localhost:9090"
        log_info "Grafana: http://localhost:3001 (admin/admin)"
    fi
}

stop_services() {
    log_info "Stopping all services..."
    
    docker-compose -f $COMPOSE_FILE down
    docker-compose -f $PROD_COMPOSE_FILE down
    docker-compose -f $BACKEND_ONLY_COMPOSE_FILE down
    
    log_success "All services stopped"
}

show_logs() {
    local service=$1
    local compose_file=$COMPOSE_FILE
    
    if [ -f "$PROD_COMPOSE_FILE" ] && docker-compose -f $PROD_COMPOSE_FILE ps | grep -q "Up"; then
        compose_file=$PROD_COMPOSE_FILE
    elif [ -f "$BACKEND_ONLY_COMPOSE_FILE" ] && docker-compose -f $BACKEND_ONLY_COMPOSE_FILE ps | grep -q "Up"; then
        compose_file=$BACKEND_ONLY_COMPOSE_FILE
    fi
    
    if [ -n "$service" ]; then
        docker-compose -f $compose_file logs -f $service
    else
        docker-compose -f $compose_file logs -f
    fi
}

show_status() {
    log_info "Service Status:"
    echo ""
    
    # Check different compose files
    for file in $COMPOSE_FILE $PROD_COMPOSE_FILE $BACKEND_ONLY_COMPOSE_FILE; do
        if [ -f "$file" ]; then
            echo "=== $file ==="
            docker-compose -f $file ps
            echo ""
        fi
    done
}

clean_up() {
    log_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Cleaning up..."
        
        # Stop all services
        stop_services
        
        # Remove containers and images
        docker-compose -f $COMPOSE_FILE down --rmi all --volumes --remove-orphans
        docker-compose -f $PROD_COMPOSE_FILE down --rmi all --volumes --remove-orphans
        docker-compose -f $BACKEND_ONLY_COMPOSE_FILE down --rmi all --volumes --remove-orphans
        
        # Clean up build artifacts
        rm -rf frontend/build
        rm -rf frontend/node_modules
        
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

backup_data() {
    log_info "Creating backup..."
    
    local backup_dir="backups/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup configuration
    if [ -d "config" ]; then
        cp -r config "$backup_dir/"
    fi
    
    # Backup downloads metadata (not the actual files)
    if [ -d "downloads" ]; then
        find downloads -name "*.json" -o -name "*.db" | tar -czf "$backup_dir/downloads-metadata.tar.gz" -T -
    fi
    
    # Backup Docker volumes
    docker run --rm -v streamrip_data:/data -v $(pwd)/$backup_dir:/backup alpine tar czf /backup/streamrip-data.tar.gz -C /data .
    
    log_success "Backup created: $backup_dir"
}

# Main script logic
case "${1:-help}" in
    dev|development)
        check_dependencies
        create_directories
        start_development
        ;;
    build)
        check_dependencies
        build_frontend
        build_backend
        ;;
    start)
        check_dependencies
        create_directories
        shift
        start_production "$@"
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        shift
        start_production "$@"
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    clean)
        clean_up
        ;;
    backup)
        backup_data
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
