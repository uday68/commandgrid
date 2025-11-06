#!/usr/bin/env python3
"""
Main runner for Project Management Tool
This script can start either the AI backend or provide options
"""

import os
import sys
import subprocess
import argparse

def start_ai_backend():
    """Start the AI backend server"""
    print("🤖 Starting AI Backend Server...")
    
    # Change to AI backend directory
    ai_backend_path = os.path.join(os.path.dirname(__file__), "ai_backend")
    os.chdir(ai_backend_path)
    
    # Start the AI backend
    try:
        subprocess.run([sys.executable, "start_ai_backend.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting AI backend: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 AI Backend stopped by user")

def start_main_backend():
    """Start the main backend server"""
    print("🔧 Starting Main Backend Server...")
    
    # Change to backend directory
    backend_path = os.path.join(os.path.dirname(__file__), "backend")
    if os.path.exists(backend_path):
        os.chdir(backend_path)
        try:
            subprocess.run(["npm", "start"], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Error starting main backend: {e}")
            sys.exit(1)
    else:
        print("❌ Backend directory not found")

def start_frontend():
    """Start the frontend development server"""
    print("🎨 Starting Frontend Server...")
    
    # Change to frontend directory
    frontend_path = os.path.join(os.path.dirname(__file__), "pmt")
    if os.path.exists(frontend_path):
        os.chdir(frontend_path)
        try:
            subprocess.run(["npm", "run", "dev"], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Error starting frontend: {e}")
            sys.exit(1)
    else:
        print("❌ Frontend directory not found")

def main():
    parser = argparse.ArgumentParser(description="Project Management Tool Runner")
    parser.add_argument(
        "component",
        choices=["ai", "backend", "frontend", "all"],
        help="Component to start: ai (AI backend), backend (main backend), frontend (React app), or all"
    )
    
    args = parser.parse_args()
    
    if args.component == "ai":
        start_ai_backend()
    elif args.component == "backend":
        start_main_backend()
    elif args.component == "frontend":
        start_frontend()
    elif args.component == "all":
        print("🚀 Starting all components...")
        print("Note: Start each component in separate terminals for better control")
        print("\nTo start individually:")
        print("  python run.py ai       # AI Backend on port 8000")
        print("  python run.py backend  # Main Backend on port 3001")  
        print("  python run.py frontend # Frontend on port 5173")
    
if __name__ == "__main__":
    main()