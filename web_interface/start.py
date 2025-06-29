#!/usr/bin/env python3
"""
Streamrip Web Interface Startup Script
Starts both backend and frontend servers for development
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

def check_requirements():
    """Check if required dependencies are installed"""
    print("🔍 Checking requirements...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required")
        return False
    
    # Check if streamrip is installed
    try:
        import streamrip
        print(f"✅ Streamrip {streamrip.__version__} found")
    except ImportError:
        print("❌ Streamrip not found. Please install streamrip first:")
        print("   pip install streamrip")
        return False
    
    # Check if Node.js is available
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} found")
        else:
            print("❌ Node.js not found. Please install Node.js 16+")
            return False
    except FileNotFoundError:
        print("❌ Node.js not found. Please install Node.js 16+")
        return False
    
    return True

def install_backend_deps():
    """Install backend dependencies"""
    print("📦 Installing backend dependencies...")
    backend_dir = Path(__file__).parent / "backend"
    
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], cwd=backend_dir, check=True)
        print("✅ Backend dependencies installed")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install backend dependencies")
        return False

def install_frontend_deps():
    """Install frontend dependencies"""
    print("📦 Installing frontend dependencies...")
    frontend_dir = Path(__file__).parent / "frontend"
    
    if not (frontend_dir / "node_modules").exists():
        try:
            subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
            print("✅ Frontend dependencies installed")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install frontend dependencies")
            return False
    else:
        print("✅ Frontend dependencies already installed")
        return True

def start_backend():
    """Start the backend server"""
    print("🚀 Starting backend server...")
    backend_dir = Path(__file__).parent / "backend"
    
    return subprocess.Popen([
        sys.executable, "main.py"
    ], cwd=backend_dir)

def start_frontend():
    """Start the frontend development server"""
    print("🚀 Starting frontend server...")
    frontend_dir = Path(__file__).parent / "frontend"
    
    return subprocess.Popen([
        "npm", "start"
    ], cwd=frontend_dir)

def main():
    """Main startup function"""
    print("🎵 Streamrip Web Interface Startup")
    print("=" * 40)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Install dependencies
    if not install_backend_deps():
        sys.exit(1)
    
    if not install_frontend_deps():
        sys.exit(1)
    
    print("\n🚀 Starting servers...")
    print("=" * 40)
    
    # Start backend
    backend_process = start_backend()
    time.sleep(2)  # Give backend time to start
    
    # Start frontend
    frontend_process = start_frontend()
    
    print("\n✅ Servers started successfully!")
    print("=" * 40)
    print("🌐 Web Interface: http://localhost:3000")
    print("🔧 API Documentation: http://localhost:8000/api/docs")
    print("📊 API Status: http://localhost:8000/api/health")
    print("\nPress Ctrl+C to stop all servers")
    print("=" * 40)
    
    # Handle shutdown
    def signal_handler(sig, frame):
        print("\n🛑 Shutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        
        # Wait for processes to terminate
        backend_process.wait()
        frontend_process.wait()
        
        print("✅ Servers stopped")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Wait for processes
    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
