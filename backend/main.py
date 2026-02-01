"""
AurborBloom HRMS - Main Application Entry Point

This is the entry point for the AurborBloom backend.
The application is organized into modules:
- config.py      - Configuration settings
- database.py    - Database connection
- models/        - Pydantic models and enums
- services/      - Business logic services
- routes/        - API route handlers
- utils/         - Helper functions

Currently, all routes are still in server.py for backward compatibility.
The modular structure is ready for gradual migration.

MIGRATION PLAN:
1. Models have been extracted to /models/ (DONE)
2. Services have been extracted to /services/ (DONE)
3. Utils have been extracted to /utils/ (DONE)
4. Config centralized in config.py (DONE)
5. Routes to be gradually moved to /routes/ (IN PROGRESS)
"""

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import the server module which contains all current routes
# This maintains backward compatibility during migration
import server

# The app is already created in server.py
app = server.app

# Future migration: Once routes are fully moved to /routes/,
# this file will create its own FastAPI app and include routers:
#
# from fastapi import FastAPI
# from routes import api_router
# 
# app = FastAPI(title="AurborBloom API", version="1.0.0")
# app.include_router(api_router)
# app.add_middleware(CORSMiddleware, ...)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
