# Routes module - import all route modules
from fastapi import APIRouter

# Create the main API router
api_router = APIRouter(prefix="/api")

# Import and include all route modules
from .auth import router as auth_router
from .profile import router as profile_router
from .timesheet import router as timesheet_router
from .leave import router as leave_router
from .projects import router as projects_router
from .tickets import router as tickets_router
from .calendar import router as calendar_router
from .chat import router as chat_router
from .announcements import router as announcements_router
from .documents import router as documents_router
from .notifications import router as notifications_router
from .admin import router as admin_router
from .pdf_export import router as pdf_router

# Include all routers
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(profile_router, tags=["Profile"])
api_router.include_router(timesheet_router, tags=["Timesheet"])
api_router.include_router(leave_router, tags=["Leave"])
api_router.include_router(projects_router, tags=["Projects"])
api_router.include_router(tickets_router, tags=["Tickets"])
api_router.include_router(calendar_router, tags=["Calendar"])
api_router.include_router(chat_router, tags=["Chat"])
api_router.include_router(announcements_router, tags=["Announcements"])
api_router.include_router(documents_router, tags=["Documents"])
api_router.include_router(notifications_router, tags=["Notifications"])
api_router.include_router(admin_router, tags=["Admin"])
api_router.include_router(pdf_router, tags=["PDF Export"])


@api_router.get("/")
async def root():
    return {"message": "CORtracker API v1.0.0"}
