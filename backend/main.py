"""
CORtracker API - Main Application Entry Point

This is the refactored entry point for the CORtracker backend.
The application is now organized into modules:
- core/ - Config, database, authentication
- models/ - Pydantic models and enums
- services/ - Business logic services
- routes/ - API route handlers

For backward compatibility, this file imports from the original server.py
until all routes are fully migrated.
"""

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging

# Import the original server module (contains all routes)
# This maintains backward compatibility during migration
import server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# The app is already created in server.py
app = server.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
