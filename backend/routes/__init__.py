"""
Routes package - API route handlers organized by feature

This module organizes all API routes into logical groupings.
Routes are imported and registered in main.py or server.py.

Available route modules:
- auth: Authentication (signup, login, token management)
- tenants: Tenant management (CRUD, settings, domains)
- employees: Employee management (CRUD, invitations, work info)
- timesheets: Time tracking (clock in/out, corrections)
- leave: Leave management (requests, types, approvals)
- tickets: Support tickets (CRUD, comments, attachments)
"""
from fastapi import APIRouter

# Create the main API router
api_router = APIRouter(prefix="/api")

# Import route modules
from .auth import router as auth_router
from .tenants import router as tenants_router
from .employees import router as employees_router
from .timesheets import router as timesheets_router
from .leave import router as leave_router
from .tickets import router as tickets_router

# Include routers
api_router.include_router(auth_router)
api_router.include_router(tenants_router)
api_router.include_router(employees_router)
api_router.include_router(timesheets_router)
api_router.include_router(leave_router)
api_router.include_router(tickets_router)

__all__ = [
    "api_router",
    "auth_router",
    "tenants_router",
    "employees_router",
    "timesheets_router",
    "leave_router",
    "tickets_router"
]
