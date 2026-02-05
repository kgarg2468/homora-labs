
import sys
import os

# Add current directory to path so 'app' is resolvable
sys.path.append(os.getcwd())

print("Testing imports...")

try:
    from fastapi import APIRouter, Depends, HTTPException
    print("MATCH: fastapi")
except ImportError as e:
    print(f"ERROR: fastapi - {e}")

try:
    from sse_starlette.sse import EventSourceResponse
    print("MATCH: sse_starlette")
except ImportError as e:
    print(f"ERROR: sse_starlette - {e}")

try:
    from app.database import get_db
    print("MATCH: app.database")
except ImportError as e:
    print(f"ERROR: app.database - {e}")

try:
    from app.routers.settings import decrypt_value
    print("MATCH: app.routers.settings")
except ImportError as e:
    print(f"ERROR: app.routers.settings - {e}")
