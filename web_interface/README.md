# Streamrip Web Interface

A modern, responsive web interface for the Streamrip music downloader with real-time progress tracking, configuration management, and advanced features.

## ✨ Features

### 🎵 Core Functionality
- **Multi-source Downloads**: Support for Qobuz, Tidal, Deezer, SoundCloud, and Last.fm
- **Real-time Progress**: Live download progress with WebSocket connections
- **Batch Operations**: Upload files with multiple URLs or download multiple items
- **Queue Management**: Pause, cancel, and monitor download queues

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful dark theme optimized for music enthusiasts
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live progress bars, status updates, and notifications
- **Smooth Animations**: Framer Motion animations for enhanced user experience

### ⚙️ Advanced Features
- **Configuration Management**: Full control over all streamrip settings with backup/restore
- **Database Browser**: View download history and manage failed downloads
- **File Manager**: Browse and organize downloaded music files
- **Search Interface**: Search across all music sources with filtering
- **Authentication**: Secure credential management for music services

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Streamrip installed and configured

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd web_interface/backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install fastapi uvicorn websockets aiofiles python-multipart
   ```

3. **Start the backend server**:
   ```bash
   python main.py
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd web_interface/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

   The web interface will be available at `http://localhost:3000`

## 📁 Project Structure

```
web_interface/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application entry point
│   ├── api/                # API route modules
│   │   ├── downloads.py    # Download management
│   │   ├── search.py       # Music search
│   │   ├── config.py       # Configuration management
│   │   ├── database.py     # Database operations
│   │   ├── auth.py         # Authentication
│   │   └── files.py        # File management
│   └── core/               # Core functionality
│       ├── websocket_manager.py    # WebSocket handling
│       ├── download_manager.py     # Download queue management
│       └── config_manager.py       # Configuration management
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── App.tsx         # Main app component
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Backend Configuration

The backend automatically uses your existing streamrip configuration. Make sure streamrip is properly configured before starting the web interface.

### Environment Variables

Create a `.env` file in the backend directory:

```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS Origins (for development)
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30
WS_MAX_QUEUE_SIZE=1000
```

## 🌐 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/openapi.json`

## 🔌 WebSocket Endpoints

- **Progress Updates**: `ws://localhost:8000/ws/progress`
- **Log Streaming**: `ws://localhost:8000/ws/logs`

## 🎯 Usage Examples

### Download from URL
```bash
curl -X POST "http://localhost:8000/api/v1/downloads/url" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://open.qobuz.com/album/abc123", "quality": 3}'
```

### Search Music
```bash
curl "http://localhost:8000/api/v1/search/qobuz?query=Pink%20Floyd&media_type=album&limit=10"
```

### Get Queue Status
```bash
curl "http://localhost:8000/api/v1/downloads/queue"
```

## 🐳 Docker Deployment

### Quick Docker Test

The easiest way to test the web interface is using our Docker test script:

```bash
# Navigate to the web interface directory
cd web_interface

# Make the test script executable (if not already)
chmod +x docker-test.sh

# Start the containers and run tests
./docker-test.sh start
```

This will:
- ✅ Check Docker installation
- ✅ Create necessary directories and config
- ✅ Build the Docker image
- ✅ Start the containers
- ✅ Run health checks
- ✅ Display access URLs

### Manual Docker Compose

If you prefer manual control:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Docker Test Script Commands

```bash
./docker-test.sh start    # Build and start (default)
./docker-test.sh stop     # Stop containers
./docker-test.sh logs     # Show logs
./docker-test.sh test     # Run tests
./docker-test.sh restart  # Restart containers
./docker-test.sh cleanup  # Clean up everything
```

## 🔒 Security Considerations

- **Authentication**: Implement proper authentication for production use
- **HTTPS**: Use HTTPS in production environments
- **CORS**: Configure CORS origins appropriately
- **Rate Limiting**: Consider implementing rate limiting for API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the same license as Streamrip.

## 🆘 Support

- **Issues**: Report bugs and request features on GitHub
- **Documentation**: Check the API documentation at `/api/docs`
- **Community**: Join the Streamrip community for support

## 🔄 Updates

The web interface automatically stays in sync with your streamrip installation. Update streamrip as usual, and the web interface will use the latest features.

---

**Made with ❤️ for the Streamrip community**
