# 🐳 Docker Testing Guide for Streamrip Web Interface

This guide will help you test the Streamrip Web Interface using Docker, ensuring everything works correctly in a containerized environment.

## 🚀 Quick Start

### Prerequisites

- **Docker**: Version 20.10+ 
- **Docker Compose**: Version 2.0+ (or `docker-compose` 1.29+)
- **Git**: To clone the repository

### 1. One-Command Test

```bash
cd web_interface && ./docker-test.sh start
```

This single command will:
- ✅ Check all prerequisites
- ✅ Create necessary directories
- ✅ Generate default configuration
- ✅ Build the Docker image
- ✅ Start all services
- ✅ Run comprehensive tests
- ✅ Display access information

## 📋 Step-by-Step Testing

### Step 1: Verify Prerequisites

```bash
# Check Docker
docker --version
docker info

# Check Docker Compose
docker-compose --version
# OR
docker compose version
```

### Step 2: Prepare Environment

```bash
# Navigate to web interface directory
cd web_interface

# Make test script executable
chmod +x docker-test.sh

# Check what the script will do
./docker-test.sh
```

### Step 3: Start Services

```bash
# Start with automatic testing
./docker-test.sh start

# OR start manually
docker-compose up -d
```

### Step 4: Verify Services

After starting, you should see:

```
🎵 Streamrip Web Interface is running!
==================================
🌐 Web Interface: http://localhost:8000
📚 API Documentation: http://localhost:8000/api/docs
🔍 API Health: http://localhost:8000/api/health
```

## 🧪 Testing Scenarios

### 1. Basic Functionality Tests

```bash
# Test health endpoint
curl http://localhost:8000/api/health

# Test API documentation
curl http://localhost:8000/api/docs

# Test web interface
curl http://localhost:8000/
```

### 2. API Endpoint Tests

```bash
# Test queue status
curl http://localhost:8000/api/v1/downloads/queue

# Test configuration endpoint
curl http://localhost:8000/api/v1/config/

# Test search (requires authentication)
curl "http://localhost:8000/api/v1/search/qobuz?query=test&media_type=album&limit=5"
```

### 3. WebSocket Tests

```bash
# Test WebSocket connection (requires wscat)
npm install -g wscat
wscat -c ws://localhost:8000/ws/progress
```

### 4. File Upload Test

```bash
# Create test URL file
echo "https://example.com/test" > test_urls.txt

# Test file upload
curl -X POST "http://localhost:8000/api/v1/downloads/file" \
  -F "file=@test_urls.txt" \
  -F "quality=3"
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using port 8000
lsof -i :8000

# Use different port
API_PORT=8001 docker-compose up -d
```

#### 2. Permission Issues

```bash
# Fix permissions
sudo chown -R $USER:$USER config downloads logs

# Or run with sudo (not recommended)
sudo ./docker-test.sh start
```

#### 3. Build Failures

```bash
# Clean build
docker-compose down --volumes
docker system prune -f
./docker-test.sh start
```

#### 4. Service Not Ready

```bash
# Check container logs
docker-compose logs streamrip-web

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart streamrip-web
```

### Debug Commands

```bash
# View all logs
./docker-test.sh logs

# Enter container for debugging
docker-compose exec streamrip-web bash

# Check container resources
docker stats

# Inspect container
docker-compose exec streamrip-web ps aux
```

## 📊 Monitoring

### Container Health

```bash
# Check health status
docker-compose ps

# View health check logs
docker inspect streamrip-web | grep -A 10 Health
```

### Resource Usage

```bash
# Monitor resource usage
docker stats streamrip-web

# Check disk usage
docker system df
```

### Application Logs

```bash
# Follow logs
docker-compose logs -f

# View specific service logs
docker-compose logs streamrip-web

# View last 100 lines
docker-compose logs --tail=100 streamrip-web
```

## 🔧 Configuration Testing

### Environment Variables

```bash
# Test with custom environment
cat > .env << EOF
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
EOF

docker-compose --env-file .env up -d
```

### Volume Mounts

```bash
# Verify volume mounts
docker-compose exec streamrip-web ls -la /app/config
docker-compose exec streamrip-web ls -la /app/downloads
docker-compose exec streamrip-web ls -la /app/logs
```

### Configuration Files

```bash
# Check generated config
cat config/config.toml

# Test custom config
cp ~/.config/streamrip/config.toml config/
docker-compose restart streamrip-web
```

## 🚀 Performance Testing

### Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API performance
ab -n 100 -c 10 http://localhost:8000/api/health

# Test concurrent requests
ab -n 50 -c 5 http://localhost:8000/api/v1/downloads/queue
```

### Memory Usage

```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check for memory leaks
watch -n 5 'docker stats --no-stream streamrip-web'
```

## 🧹 Cleanup

### Stop Services

```bash
# Stop services
./docker-test.sh stop

# OR
docker-compose down
```

### Complete Cleanup

```bash
# Remove everything
./docker-test.sh cleanup

# OR manually
docker-compose down --volumes --remove-orphans
docker system prune -f
```

### Reset Configuration

```bash
# Remove generated config
rm -rf config downloads logs

# Restart fresh
./docker-test.sh start
```

## ✅ Success Criteria

Your Docker deployment is successful if:

- ✅ All containers start without errors
- ✅ Health check returns "healthy"
- ✅ Web interface loads at http://localhost:8000
- ✅ API documentation accessible at /api/docs
- ✅ WebSocket connections work
- ✅ File uploads are accepted
- ✅ Configuration is properly loaded
- ✅ Logs show no critical errors

## 🆘 Getting Help

If you encounter issues:

1. **Check logs**: `./docker-test.sh logs`
2. **Run tests**: `./docker-test.sh test`
3. **Clean restart**: `./docker-test.sh cleanup && ./docker-test.sh start`
4. **Check GitHub issues**: Look for similar problems
5. **Create issue**: Include logs and system information

## 📝 Next Steps

After successful Docker testing:

1. **Configure Streamrip**: Add your music service credentials
2. **Test Downloads**: Try downloading a track
3. **Explore Features**: Use the web interface
4. **Production Setup**: Configure for production use
5. **Backup Config**: Save your working configuration

---

**Happy Testing! 🎵**
