"""
Routes package - API route handlers organized by feature

This module organizes all API routes into logical groupings.
Routes are imported and registered in main.py.

Available route modules:
- auth: Authentication (signup, login, token management)
- tenants: Tenant management (CRUD, settings, domains)
- (more modules will be added as refactoring progresses)
"""
from fastapi import APIRouter

# Create the main API router - will be used when fully migrated
api_router = APIRouter(prefix="/api")

# Import route modules (to be populated as migration progresses)
# from .auth import router as auth_router
# from .tenants import router as tenants_router

# Include routers (to be uncommented as migration completes)
# api_router.include_router(auth_router)
# api_router.include_router(tenants_router)

__all__ = ["api_router"]
