# Multi-stage Docker build for Streamrip Web Interface
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Python backend stage
FROM python:3.11-slim AS backend

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/app/venv/bin:$PATH"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Set working directory
WORKDIR /app

# Create virtual environment
RUN python -m venv /app/venv

# Copy backend requirements
COPY backend/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install streamrip
RUN pip install --no-cache-dir streamrip

# Copy backend source code
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/build ./static

# Create necessary directories
RUN mkdir -p /app/config /app/downloads /app/logs && \
    chown -R app:app /app

# Switch to app user
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health')" || exit 1

# Start command
CMD ["python", "main.py"]
