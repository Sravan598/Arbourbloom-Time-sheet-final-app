"""
Routes package - API route handlers organized by feature
"""
from fastapi import APIRouter

# Create the main API router
api_router = APIRouter(prefix="/api")

# Note: Routes are currently in server.py and will be migrated incrementally
# Once migrated, import and include route modules like this:
# from .auth import router as auth_router
# api_router.include_router(auth_router, tags=["Authentication"])
