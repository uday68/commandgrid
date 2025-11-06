# start_ai_backend.py
import os
import subprocess
import sys

def start_ai_backend():
    """Start the AI backend server"""
    
    print("Starting AI Backend Server...")
    
    # Change to the api directory
    os.chdir(os.path.join(os.path.dirname(__file__), "api"))
    
    # Start the server using uvicorn
    try:
        subprocess.run(
            ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_ai_backend()
