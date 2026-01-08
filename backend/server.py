from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cortracker-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app without a prefix
app = FastAPI(title="CORtracker API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== ENUMS ==============
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"


class CorrectionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class LeaveType(str, Enum):
    VACATION = "VACATION"
    SICK = "SICK"
    PERSONAL = "PERSONAL"
    UNPAID = "UNPAID"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class AnnouncementPriority(str, Enum):
    NORMAL = "NORMAL"
    IMPORTANT = "IMPORTANT"
    URGENT = "URGENT"


# ============== MODELS ==============
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    role: UserRole = UserRole.EMPLOYEE
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[UserRole] = UserRole.EMPLOYEE
    admin_invite_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class Timesheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    clock_in_at: datetime
    clock_out_at: Optional[datetime] = None
    total_minutes: Optional[int] = None
    notes: Optional[str] = None
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimesheetUpdate(BaseModel):
    clock_in_at: Optional[datetime] = None
    clock_out_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_approved: Optional[bool] = None


class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_user_id: str
    admin_user_name: str
    entity_type: str
    entity_id: str
    action: str
    before_json: Optional[dict] = None
    after_json: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    timesheet_id: str
    requested_change: dict
    reason: str
    status: CorrectionStatus = CorrectionStatus.PENDING
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRequestCreate(BaseModel):
    timesheet_id: str
    requested_change: dict
    reason: str = Field(..., min_length=10)


class CorrectionRequestUpdate(BaseModel):
    status: CorrectionStatus
    admin_notes: Optional[str] = None


# ============== LEAVE/PTO MODELS ==============
class LeaveBalance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    year: int = Field(default_factory=lambda: datetime.now().year)
    vacation_days: int = 15  # Default annual vacation days
    sick_days: int = 10  # Default annual sick days
    personal_days: int = 5  # Default personal days
    vacation_used: int = 0
    sick_used: int = 0
    personal_used: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveBalanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    vacation_total: int
    vacation_used: int
    vacation_remaining: int
    sick_total: int
    sick_used: int
    sick_remaining: int
    personal_total: int
    personal_used: int
    personal_remaining: int
    year: int


class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    total_days: int
    reason: str
    status: LeaveStatus = LeaveStatus.PENDING
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    reason: str = Field(..., min_length=5, max_length=500)


class LeaveRequestUpdate(BaseModel):
    status: LeaveStatus
    admin_notes: Optional[str] = None


# ============== BREAK MODELS ==============
class BreakStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class Break(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timesheet_id: Optional[str] = None  # Link to active timesheet
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    break_type: str = "GENERAL"  # GENERAL, LUNCH, COFFEE, etc.
    status: BreakStatus = BreakStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BreakCreate(BaseModel):
    break_type: str = "GENERAL"


class BreakResponse(BaseModel):
    id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    break_type: str
    status: str


class DailyBreakSummary(BaseModel):
    total_breaks: int
    total_break_minutes: int
    breaks: List[BreakResponse]
    is_on_break: bool
    current_break_id: Optional[str] = None
    current_break_start: Optional[datetime] = None


# ============== ANNOUNCEMENT MODELS ==============
class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    is_pinned: bool = False
    created_by: str
    created_by_name: Optional[str] = None
    expires_at: Optional[datetime] = None
    read_by: List[str] = []  # List of user IDs who have read this
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    message: str = Field(..., min_length=5, max_length=2000)
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    is_pinned: bool = False
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    priority: Optional[AnnouncementPriority] = None
    is_pinned: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    message: str
    priority: str
    is_pinned: bool
    created_by: str
    created_by_name: Optional[str]
    expires_at: Optional[datetime]
    is_read: bool = False
    read_count: int = 0
    created_at: datetime
    updated_at: datetime


# ============== PROJECT/TASK MODELS ==============
class ProjectStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ON_HOLD = "ON_HOLD"
    ARCHIVED = "ARCHIVED"


class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    color: str = "#EF4444"  # Default red color
    status: ProjectStatus = ProjectStatus.ACTIVE
    assigned_users: List[str] = []  # List of user IDs
    estimated_hours: Optional[float] = None
    total_logged_minutes: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    color: str = "#EF4444"
    estimated_hours: Optional[float] = None
    assigned_users: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[ProjectStatus] = None
    estimated_hours: Optional[float] = None
    assigned_users: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: str
    status: str
    assigned_users: List[str]
    estimated_hours: Optional[float]
    total_logged_minutes: int
    created_at: datetime


class TimeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    project_id: str
    project_name: Optional[str] = None
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_manual: bool = False  # True if manually entered, False if from timer
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimeEntryCreate(BaseModel):
    project_id: str
    description: Optional[str] = None
    # For manual entries:
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class TimeEntryResponse(BaseModel):
    id: str
    project_id: str
    project_name: Optional[str]
    project_color: Optional[str] = None
    description: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    created_at: datetime


class ProjectTimeSummary(BaseModel):
    project_id: str
    project_name: str
    project_color: str
    total_minutes: int
    entry_count: int


# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_employee(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Employee access required")
    return current_user


def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings for MongoDB storage"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj


def deserialize_datetime(obj, fields):
    """Convert ISO format strings back to datetime objects"""
    if isinstance(obj, dict):
        for field in fields:
            if field in obj and isinstance(obj[field], str):
                try:
                    obj[field] = datetime.fromisoformat(obj[field])
                except (ValueError, TypeError):
                    pass
    return obj


# ============== AUTH ROUTES ==============
@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Handle admin signup with invite code
    role = UserRole.EMPLOYEE
    if user_data.role == UserRole.ADMIN:
        admin_code = os.environ.get('ADMIN_INVITE_CODE', 'CORTRACKER-ADMIN-2024')
        if user_data.admin_invite_code != admin_code:
            raise HTTPException(status_code=403, detail="Invalid admin invite code")
        role = UserRole.ADMIN
    
    # Create user
    user = UserBase(
        name=user_data.name,
        email=user_data.email.lower(),
        role=role
    )
    
    user_doc = user.model_dump()
    user_doc["password_hash"] = hash_password(user_data.password)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_token(user.id, user.email, user.role.value)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact administrator.")
    
    # Create token
    token = create_token(user["id"], user["email"], user["role"])
    
    # Parse created_at
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=created_at
        )
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    created_at = current_user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        is_active=current_user["is_active"],
        created_at=created_at
    )


# ============== EMPLOYEE ROUTES ==============
class ClockInRequest(BaseModel):
    notes: Optional[str] = None


class ClockOutRequest(BaseModel):
    notes: Optional[str] = None


@api_router.post("/employee/clock-in", response_model=Timesheet)
async def clock_in(
    request: ClockInRequest = ClockInRequest(),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can clock in")
    
    # Check if already clocked in (has open shift)
    open_shift = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    })
    
    if open_shift:
        raise HTTPException(status_code=400, detail="You are already clocked in. Please clock out first.")
    
    # Create new timesheet entry
    timesheet = Timesheet(
        user_id=current_user["id"],
        user_name=current_user["name"],
        user_email=current_user["email"],
        clock_in_at=datetime.now(timezone.utc),
        notes=request.notes
    )
    
    doc = serialize_datetime(timesheet.model_dump())
    await db.timesheets.insert_one(doc)
    
    return timesheet


@api_router.post("/employee/clock-out", response_model=Timesheet)
async def clock_out(
    request: ClockOutRequest = ClockOutRequest(),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can clock out")
    
    # Find open shift
    open_shift = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    }, {"_id": 0})
    
    if not open_shift:
        raise HTTPException(status_code=400, detail="You are not clocked in. Please clock in first.")
    
    # Calculate total minutes
    clock_in_at = open_shift["clock_in_at"]
    if isinstance(clock_in_at, str):
        clock_in_at = datetime.fromisoformat(clock_in_at)
    
    clock_out_at = datetime.now(timezone.utc)
    total_minutes = int((clock_out_at - clock_in_at).total_seconds() / 60)
    
    # Combine notes (clock-in notes + clock-out notes)
    existing_notes = open_shift.get("notes", "")
    if request.notes:
        if existing_notes:
            combined_notes = f"{existing_notes} | Out: {request.notes}"
        else:
            combined_notes = f"Out: {request.notes}"
    else:
        combined_notes = existing_notes
    
    # Update timesheet
    await db.timesheets.update_one(
        {"id": open_shift["id"]},
        {"$set": {
            "clock_out_at": clock_out_at.isoformat(),
            "total_minutes": total_minutes,
            "notes": combined_notes if combined_notes else None
        }}
    )
    
    # Return updated timesheet
    updated = await db.timesheets.find_one({"id": open_shift["id"]}, {"_id": 0})
    updated = deserialize_datetime(updated, ["clock_in_at", "clock_out_at", "created_at"])
    
    return Timesheet(**updated)


@api_router.get("/employee/current-shift")
async def get_current_shift(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    open_shift = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    }, {"_id": 0})
    
    if open_shift:
        open_shift = deserialize_datetime(open_shift, ["clock_in_at", "created_at"])
        return {"clocked_in": True, "shift": open_shift}
    
    return {"clocked_in": False, "shift": None}


@api_router.get("/employee/timesheets", response_model=List[Timesheet])
async def get_employee_timesheets(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    query = {"user_id": current_user["id"]}
    
    if start_date:
        query["clock_in_at"] = {"$gte": start_date}
    if end_date:
        if "clock_in_at" in query:
            query["clock_in_at"]["$lte"] = end_date + "T23:59:59"
        else:
            query["clock_in_at"] = {"$lte": end_date + "T23:59:59"}
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("clock_in_at", -1).to_list(1000)
    
    for ts in timesheets:
        ts = deserialize_datetime(ts, ["clock_in_at", "clock_out_at", "created_at"])
    
    return timesheets


@api_router.get("/employee/today-punches")
async def get_today_punches(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    timesheets = await db.timesheets.find({
        "user_id": current_user["id"],
        "clock_in_at": {"$gte": today}
    }, {"_id": 0}).sort("clock_in_at", -1).to_list(100)
    
    for ts in timesheets:
        ts = deserialize_datetime(ts, ["clock_in_at", "clock_out_at", "created_at"])
    
    return timesheets


# ============== CORRECTION REQUESTS ==============
@api_router.post("/employee/correction-request", response_model=CorrectionRequest)
async def create_correction_request(
    request_data: CorrectionRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can submit correction requests")
    
    # Verify timesheet belongs to user
    timesheet = await db.timesheets.find_one({
        "id": request_data.timesheet_id,
        "user_id": current_user["id"]
    })
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found or doesn't belong to you")
    
    # Create correction request
    correction = CorrectionRequest(
        user_id=current_user["id"],
        user_name=current_user["name"],
        timesheet_id=request_data.timesheet_id,
        requested_change=request_data.requested_change,
        reason=request_data.reason
    )
    
    doc = serialize_datetime(correction.model_dump())
    await db.correction_requests.insert_one(doc)
    
    return correction


@api_router.get("/employee/correction-requests", response_model=List[CorrectionRequest])
async def get_employee_correction_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    requests = await db.correction_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


# ============== ADMIN ROUTES ==============
@api_router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(admin: dict = Depends(require_admin)):
    # Get current week's start
    today = datetime.now(timezone.utc)
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    
    # Total hours this week
    week_timesheets = await db.timesheets.find({
        "clock_in_at": {"$gte": week_start},
        "total_minutes": {"$ne": None}
    }).to_list(10000)
    
    total_minutes = sum(ts.get("total_minutes", 0) for ts in week_timesheets)
    total_hours = round(total_minutes / 60, 1)
    
    # Active employees (currently clocked in)
    active_count = await db.timesheets.count_documents({"clock_out_at": None})
    
    # Pending correction requests
    pending_corrections = await db.correction_requests.count_documents({"status": "PENDING"})
    
    # Total employees
    total_employees = await db.users.count_documents({"role": "EMPLOYEE", "is_active": True})
    
    return {
        "total_hours_this_week": total_hours,
        "active_employees": active_count,
        "pending_corrections": pending_corrections,
        "total_employees": total_employees
    }


@api_router.get("/admin/employees", response_model=List[UserResponse])
async def get_all_employees(admin: dict = Depends(require_admin)):
    users = await db.users.find({"role": "EMPLOYEE"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return users


@api_router.get("/admin/timesheets", response_model=List[Timesheet])
async def get_all_timesheets(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    if start_date:
        query["clock_in_at"] = {"$gte": start_date}
    if end_date:
        if "clock_in_at" in query:
            query["clock_in_at"]["$lte"] = end_date + "T23:59:59"
        else:
            query["clock_in_at"] = {"$lte": end_date + "T23:59:59"}
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("clock_in_at", -1).to_list(1000)
    
    for ts in timesheets:
        ts = deserialize_datetime(ts, ["clock_in_at", "clock_out_at", "created_at"])
    
    return timesheets


@api_router.put("/admin/timesheets/{timesheet_id}", response_model=Timesheet)
async def update_timesheet(
    timesheet_id: str,
    update_data: TimesheetUpdate,
    admin: dict = Depends(require_admin)
):
    # Get existing timesheet
    existing = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Prepare update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    # Calculate total minutes if both times are set
    clock_in = update_dict.get("clock_in_at") or existing.get("clock_in_at")
    clock_out = update_dict.get("clock_out_at") or existing.get("clock_out_at")
    
    if clock_in and clock_out:
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in)
        if isinstance(clock_out, str):
            clock_out = datetime.fromisoformat(clock_out)
        update_dict["total_minutes"] = int((clock_out - clock_in).total_seconds() / 60)
    
    # Serialize datetimes
    update_dict = serialize_datetime(update_dict)
    
    # Create audit log
    audit = AuditLog(
        admin_user_id=admin["id"],
        admin_user_name=admin["name"],
        entity_type="timesheet",
        entity_id=timesheet_id,
        action="UPDATE",
        before_json=existing,
        after_json={**existing, **update_dict}
    )
    
    audit_doc = serialize_datetime(audit.model_dump())
    await db.audit_logs.insert_one(audit_doc)
    
    # Update timesheet
    await db.timesheets.update_one({"id": timesheet_id}, {"$set": update_dict})
    
    # Return updated
    updated = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    updated = deserialize_datetime(updated, ["clock_in_at", "clock_out_at", "created_at"])
    
    return Timesheet(**updated)


@api_router.get("/admin/correction-requests", response_model=List[CorrectionRequest])
async def get_all_correction_requests(
    status: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.correction_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return requests


@api_router.put("/admin/correction-requests/{request_id}")
async def update_correction_request(
    request_id: str,
    update_data: CorrectionRequestUpdate,
    admin: dict = Depends(require_admin)
):
    existing = await db.correction_requests.find_one({"id": request_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Correction request not found")
    
    update_dict = {
        "status": update_data.status.value,
        "admin_notes": update_data.admin_notes,
        "reviewed_by": admin["id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If approved, apply the changes to timesheet
    if update_data.status == CorrectionStatus.APPROVED:
        timesheet_id = existing["timesheet_id"]
        requested_change = existing.get("requested_change", {})
        
        if requested_change:
            change_dict = serialize_datetime(requested_change)
            
            # Calculate total minutes if needed
            ts = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
            if ts:
                clock_in = change_dict.get("clock_in_at") or ts.get("clock_in_at")
                clock_out = change_dict.get("clock_out_at") or ts.get("clock_out_at")
                
                if clock_in and clock_out:
                    if isinstance(clock_in, str):
                        clock_in = datetime.fromisoformat(clock_in)
                    if isinstance(clock_out, str):
                        clock_out = datetime.fromisoformat(clock_out)
                    change_dict["total_minutes"] = int((clock_out - clock_in).total_seconds() / 60)
            
            await db.timesheets.update_one({"id": timesheet_id}, {"$set": change_dict})
            
            # Create audit log
            audit = AuditLog(
                admin_user_id=admin["id"],
                admin_user_name=admin["name"],
                entity_type="timesheet",
                entity_id=timesheet_id,
                action="CORRECTION_APPROVED",
                before_json=ts,
                after_json={**ts, **change_dict} if ts else change_dict
            )
            audit_doc = serialize_datetime(audit.model_dump())
            await db.audit_logs.insert_one(audit_doc)
    
    await db.correction_requests.update_one({"id": request_id}, {"$set": update_dict})
    
    updated = await db.correction_requests.find_one({"id": request_id}, {"_id": 0})
    return updated


@api_router.get("/admin/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return logs


@api_router.post("/admin/create-employee", response_model=UserResponse)
async def admin_create_employee(
    user_data: UserCreate,
    admin: dict = Depends(require_admin)
):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user as employee
    user = UserBase(
        name=user_data.name,
        email=user_data.email.lower(),
        role=UserRole.EMPLOYEE
    )
    
    user_doc = user.model_dump()
    user_doc["password_hash"] = hash_password(user_data.password)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )


@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(admin: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for u in users:
        created_at = u.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(UserResponse(
            id=u["id"],
            name=u["name"],
            email=u["email"],
            role=u.get("role", "EMPLOYEE"),
            is_active=u.get("is_active", True),
            created_at=created_at
        ))
    
    return result


@api_router.put("/admin/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"id": user_id, "is_active": new_status}


# ============== PROJECT/TASK ROUTES ==============

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new project (admin only)"""
    project = Project(
        name=project_data.name,
        description=project_data.description,
        color=project_data.color,
        estimated_hours=project_data.estimated_hours,
        assigned_users=project_data.assigned_users,
        created_by=admin["id"]
    )
    
    project_doc = project.model_dump()
    project_doc["created_at"] = project_doc["created_at"].isoformat()
    project_doc["updated_at"] = project_doc["updated_at"].isoformat()
    
    await db.projects.insert_one(project_doc)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        status=project.status.value,
        assigned_users=project.assigned_users,
        estimated_hours=project.estimated_hours,
        total_logged_minutes=0,
        created_at=project.created_at
    )


@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Get projects - employees see only assigned, admins see all"""
    if current_user.get("role") == "ADMIN":
        query = {}
    else:
        # Employees see projects they're assigned to
        query = {
            "$or": [
                {"assigned_users": current_user["id"]},
                {"assigned_users": {"$size": 0}}  # Or projects with no specific assignment (everyone)
            ]
        }
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for p in projects:
        created_at = p.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ProjectResponse(
            id=p["id"],
            name=p["name"],
            description=p.get("description"),
            color=p.get("color", "#EF4444"),
            status=p.get("status", "ACTIVE"),
            assigned_users=p.get("assigned_users", []),
            estimated_hours=p.get("estimated_hours"),
            total_logged_minutes=p.get("total_logged_minutes", 0),
            created_at=created_at
        ))
    
    return result


@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    created_at = project.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return ProjectResponse(
        id=project["id"],
        name=project["name"],
        description=project.get("description"),
        color=project.get("color", "#EF4444"),
        status=project.get("status", "ACTIVE"),
        assigned_users=project.get("assigned_users", []),
        estimated_hours=project.get("estimated_hours"),
        total_logged_minutes=project.get("total_logged_minutes", 0),
        created_at=created_at
    )


@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    admin: dict = Depends(require_admin)
):
    """Update a project (admin only)"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update_data.name is not None:
        update_fields["name"] = update_data.name
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.color is not None:
        update_fields["color"] = update_data.color
    if update_data.status is not None:
        update_fields["status"] = update_data.status.value
    if update_data.estimated_hours is not None:
        update_fields["estimated_hours"] = update_data.estimated_hours
    if update_data.assigned_users is not None:
        update_fields["assigned_users"] = update_data.assigned_users
    
    await db.projects.update_one({"id": project_id}, {"$set": update_fields})
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    created_at = updated_project.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return ProjectResponse(
        id=updated_project["id"],
        name=updated_project["name"],
        description=updated_project.get("description"),
        color=updated_project.get("color", "#EF4444"),
        status=updated_project.get("status", "ACTIVE"),
        assigned_users=updated_project.get("assigned_users", []),
        estimated_hours=updated_project.get("estimated_hours"),
        total_logged_minutes=updated_project.get("total_logged_minutes", 0),
        created_at=created_at
    )


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, admin: dict = Depends(require_admin)):
    """Delete/archive a project (admin only)"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Archive instead of delete to preserve time entries
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"status": "ARCHIVED", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Project archived successfully"}


# Time Entry Routes
@api_router.post("/time-entries/start", response_model=TimeEntryResponse)
async def start_time_entry(
    entry_data: TimeEntryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Start tracking time on a project"""
    # Check if project exists
    project = await db.projects.find_one({"id": entry_data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if user already has an active time entry
    active_entry = await db.time_entries.find_one({
        "user_id": current_user["id"],
        "end_time": None
    }, {"_id": 0})
    
    if active_entry:
        raise HTTPException(status_code=400, detail="You already have an active time entry. Please stop it first.")
    
    # Create new time entry
    entry = TimeEntry(
        user_id=current_user["id"],
        user_name=current_user.get("name"),
        project_id=entry_data.project_id,
        project_name=project["name"],
        description=entry_data.description,
        start_time=datetime.now(timezone.utc)
    )
    
    entry_doc = entry.model_dump()
    entry_doc["start_time"] = entry_doc["start_time"].isoformat()
    entry_doc["created_at"] = entry_doc["created_at"].isoformat()
    
    await db.time_entries.insert_one(entry_doc)
    
    return TimeEntryResponse(
        id=entry.id,
        project_id=entry.project_id,
        project_name=entry.project_name,
        project_color=project.get("color", "#EF4444"),
        description=entry.description,
        start_time=entry.start_time,
        end_time=None,
        duration_minutes=None,
        created_at=entry.created_at
    )


@api_router.post("/time-entries/stop", response_model=TimeEntryResponse)
async def stop_time_entry(current_user: dict = Depends(get_current_user)):
    """Stop the active time entry"""
    active_entry = await db.time_entries.find_one({
        "user_id": current_user["id"],
        "end_time": None
    }, {"_id": 0})
    
    if not active_entry:
        raise HTTPException(status_code=400, detail="No active time entry found")
    
    # Calculate duration
    end_time = datetime.now(timezone.utc)
    start_time = active_entry["start_time"]
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)
    
    duration_minutes = int((end_time - start_time).total_seconds() / 60)
    
    # Update time entry
    await db.time_entries.update_one(
        {"id": active_entry["id"]},
        {
            "$set": {
                "end_time": end_time.isoformat(),
                "duration_minutes": duration_minutes
            }
        }
    )
    
    # Update project total time
    await db.projects.update_one(
        {"id": active_entry["project_id"]},
        {"$inc": {"total_logged_minutes": duration_minutes}}
    )
    
    # Get project for color
    project = await db.projects.find_one({"id": active_entry["project_id"]}, {"_id": 0})
    
    return TimeEntryResponse(
        id=active_entry["id"],
        project_id=active_entry["project_id"],
        project_name=active_entry.get("project_name"),
        project_color=project.get("color", "#EF4444") if project else "#EF4444",
        description=active_entry.get("description"),
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration_minutes,
        created_at=datetime.fromisoformat(active_entry["created_at"]) if isinstance(active_entry["created_at"], str) else active_entry["created_at"]
    )


@api_router.get("/time-entries/active")
async def get_active_time_entry(current_user: dict = Depends(get_current_user)):
    """Get current active time entry if any"""
    active_entry = await db.time_entries.find_one({
        "user_id": current_user["id"],
        "end_time": None
    }, {"_id": 0})
    
    if not active_entry:
        return {"is_tracking": False, "entry": None}
    
    # Get project for color
    project = await db.projects.find_one({"id": active_entry["project_id"]}, {"_id": 0})
    
    start_time = active_entry["start_time"]
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)
    
    return {
        "is_tracking": True,
        "entry": {
            "id": active_entry["id"],
            "project_id": active_entry["project_id"],
            "project_name": active_entry.get("project_name"),
            "project_color": project.get("color", "#EF4444") if project else "#EF4444",
            "description": active_entry.get("description"),
            "start_time": start_time
        }
    }


@api_router.get("/time-entries/today", response_model=List[TimeEntryResponse])
async def get_today_time_entries(current_user: dict = Depends(get_current_user)):
    """Get all time entries for today"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    entries = await db.time_entries.find({
        "user_id": current_user["id"],
        "created_at": {
            "$gte": today_start.isoformat(),
            "$lt": today_end.isoformat()
        }
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    result = []
    for entry in entries:
        start_time = entry["start_time"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        end_time = entry.get("end_time")
        if end_time and isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        created_at = entry["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        # Get project color
        project = await db.projects.find_one({"id": entry["project_id"]}, {"_id": 0})
        
        result.append(TimeEntryResponse(
            id=entry["id"],
            project_id=entry["project_id"],
            project_name=entry.get("project_name"),
            project_color=project.get("color", "#EF4444") if project else "#EF4444",
            description=entry.get("description"),
            start_time=start_time,
            end_time=end_time,
            duration_minutes=entry.get("duration_minutes"),
            created_at=created_at
        ))
    
    return result


@api_router.get("/time-entries/summary", response_model=List[ProjectTimeSummary])
async def get_time_summary(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get time summary by project for the last N days"""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    entries = await db.time_entries.find({
        "user_id": current_user["id"],
        "created_at": {"$gte": start_date.isoformat()},
        "duration_minutes": {"$ne": None}
    }, {"_id": 0}).to_list(500)
    
    # Aggregate by project
    project_summary = {}
    for entry in entries:
        pid = entry["project_id"]
        if pid not in project_summary:
            project_summary[pid] = {
                "project_id": pid,
                "project_name": entry.get("project_name", "Unknown"),
                "total_minutes": 0,
                "entry_count": 0
            }
        project_summary[pid]["total_minutes"] += entry.get("duration_minutes", 0)
        project_summary[pid]["entry_count"] += 1
    
    # Get project colors
    result = []
    for pid, data in project_summary.items():
        project = await db.projects.find_one({"id": pid}, {"_id": 0})
        result.append(ProjectTimeSummary(
            project_id=data["project_id"],
            project_name=data["project_name"],
            project_color=project.get("color", "#EF4444") if project else "#EF4444",
            total_minutes=data["total_minutes"],
            entry_count=data["entry_count"]
        ))
    
    # Sort by total time descending
    result.sort(key=lambda x: x.total_minutes, reverse=True)
    
    return result


# ============== PDF EXPORT ROUTES ==============

def generate_timesheet_pdf(user_data: dict, timesheets: list, breaks: list, week_start: datetime, week_end: datetime) -> bytes:
    """Generate a professional timesheet PDF"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1F2937'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#6B7280'),
        alignment=TA_CENTER,
        spaceAfter=30
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#EF4444'),
        spaceBefore=20,
        spaceAfter=10
    )
    
    # Title
    elements.append(Paragraph("CORtracker", title_style))
    elements.append(Paragraph("Employee Timesheet Report", subtitle_style))
    
    # Employee Info
    elements.append(Paragraph("Employee Information", section_style))
    
    info_data = [
        ["Name:", user_data.get("name", "N/A")],
        ["Email:", user_data.get("email", "N/A")],
        ["Report Period:", f"{week_start.strftime('%B %d, %Y')} - {week_end.strftime('%B %d, %Y')}"],
        ["Generated:", datetime.now().strftime("%B %d, %Y at %I:%M %p")]
    ]
    
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1F2937')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Daily Summary
    elements.append(Paragraph("Daily Time Summary", section_style))
    
    # Calculate daily totals
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily_data = {}
    
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        date_str = day_date.strftime("%Y-%m-%d")
        daily_data[date_str] = {
            "day": day_names[i],
            "date": day_date.strftime("%m/%d/%Y"),
            "minutes": 0,
            "clock_in": None,
            "clock_out": None
        }
    
    for ts in timesheets:
        clock_in = ts.get("clock_in_at")
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in)
        
        date_str = clock_in.strftime("%Y-%m-%d")
        
        if date_str in daily_data:
            if ts.get("total_minutes"):
                daily_data[date_str]["minutes"] += ts["total_minutes"]
            
            if not daily_data[date_str]["clock_in"]:
                daily_data[date_str]["clock_in"] = clock_in.strftime("%I:%M %p")
            
            clock_out = ts.get("clock_out_at")
            if clock_out:
                if isinstance(clock_out, str):
                    clock_out = datetime.fromisoformat(clock_out)
                daily_data[date_str]["clock_out"] = clock_out.strftime("%I:%M %p")
    
    # Create daily table
    table_data = [["Day", "Date", "Clock In", "Clock Out", "Hours Worked"]]
    total_minutes = 0
    
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        hours = data["minutes"] / 60
        total_minutes += data["minutes"]
        
        table_data.append([
            data["day"],
            data["date"],
            data["clock_in"] or "-",
            data["clock_out"] or "-",
            f"{hours:.1f}h" if data["minutes"] > 0 else "-"
        ])
    
    # Add total row
    total_hours = total_minutes / 60
    table_data.append(["", "", "", "Total:", f"{total_hours:.1f}h"])
    
    daily_table = Table(table_data, colWidths=[1.2*inch, 1*inch, 1.2*inch, 1.2*inch, 1.2*inch])
    daily_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Body
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        
        # Total row
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F3F4F6')),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        
        # Alternating rows
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F9FAFB')]),
    ]))
    elements.append(daily_table)
    elements.append(Spacer(1, 20))
    
    # Break Summary
    total_break_minutes = sum(b.get("duration_minutes", 0) for b in breaks)
    if total_break_minutes > 0:
        elements.append(Paragraph("Break Summary", section_style))
        
        break_data = [["Total Break Time:", f"{total_break_minutes} minutes ({total_break_minutes/60:.1f} hours)"]]
        break_table = Table(break_data, colWidths=[1.5*inch, 4*inch])
        break_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(break_table)
        elements.append(Spacer(1, 20))
    
    # Summary Statistics
    elements.append(Paragraph("Summary", section_style))
    
    net_minutes = max(0, total_minutes - total_break_minutes)
    net_hours = net_minutes / 60
    goal_hours = 40.0
    
    summary_data = [
        ["Gross Hours Worked:", f"{total_hours:.1f} hours"],
        ["Break Time:", f"{total_break_minutes/60:.1f} hours"],
        ["Net Hours Worked:", f"{net_hours:.1f} hours"],
        ["Weekly Goal:", f"{goal_hours:.0f} hours"],
        ["Progress:", f"{(net_hours/goal_hours)*100:.1f}%"],
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FEF2F2') if net_hours < goal_hours else colors.HexColor('#F0FDF4')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 40))
    
    # Signature Section
    elements.append(Paragraph("Verification", section_style))
    
    sig_data = [
        ["Employee Signature:", "_" * 40, "Date:", "_" * 20],
        ["", "", "", ""],
        ["Supervisor Signature:", "_" * 40, "Date:", "_" * 20],
    ]
    
    sig_table = Table(sig_data, colWidths=[1.5*inch, 2.5*inch, 0.5*inch, 1.5*inch])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(sig_table)
    
    # Footer
    elements.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9CA3AF'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph("Generated by CORtracker - A 360° ERP Solution", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


@api_router.get("/export/timesheet/pdf")
async def export_timesheet_pdf(
    week_offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Export timesheet as PDF for current or previous weeks"""
    # Calculate week range
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday()) - timedelta(weeks=week_offset)
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    # Get timesheets for the week
    timesheets = await db.timesheets.find({
        "user_id": current_user["id"],
        "clock_in_at": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    # Get breaks for the week
    breaks = await db.breaks.find({
        "user_id": current_user["id"],
        "status": "COMPLETED",
        "created_at": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(200)
    
    # Generate PDF
    pdf_bytes = generate_timesheet_pdf(
        user_data=current_user,
        timesheets=timesheets,
        breaks=breaks,
        week_start=week_start,
        week_end=week_end
    )
    
    # Create filename
    filename = f"timesheet_{current_user.get('name', 'employee').replace(' ', '_')}_{week_start.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# ============== WEEKLY PROGRESS ROUTES ==============

class DailyHours(BaseModel):
    date: str
    day_name: str
    minutes_worked: int
    hours_worked: float


class WeeklyProgressResponse(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    week_start: str
    week_end: str
    total_minutes: int
    total_hours: float
    goal_hours: float
    progress_percent: float
    status: str  # ON_TRACK, BEHIND, OVERTIME, COMPLETED
    daily_breakdown: List[DailyHours]
    break_minutes: int


@api_router.get("/progress/weekly", response_model=WeeklyProgressResponse)
async def get_weekly_progress(current_user: dict = Depends(get_current_user)):
    """Get current user's weekly hours progress"""
    # Get the start of the current week (Monday)
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    # Default goal is 40 hours
    goal_hours = 40.0
    
    # Get all timesheets for this week
    timesheets = await db.timesheets.find({
        "user_id": current_user["id"],
        "clock_in_at": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    # Get all breaks for this week
    breaks = await db.breaks.find({
        "user_id": current_user["id"],
        "status": "COMPLETED",
        "created_at": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(200)
    
    # Calculate total break minutes
    total_break_minutes = sum(b.get("duration_minutes", 0) for b in breaks)
    
    # Calculate daily breakdown
    daily_data = {}
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        date_str = day_date.strftime("%Y-%m-%d")
        daily_data[date_str] = {
            "date": date_str,
            "day_name": day_names[i],
            "minutes_worked": 0
        }
    
    # Sum up minutes from timesheets
    for ts in timesheets:
        clock_in = ts.get("clock_in_at")
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in)
        
        date_str = clock_in.strftime("%Y-%m-%d")
        
        if ts.get("total_minutes"):
            if date_str in daily_data:
                daily_data[date_str]["minutes_worked"] += ts["total_minutes"]
        elif ts.get("clock_out_at") is None:
            # Active shift - calculate current duration
            now = datetime.now(timezone.utc)
            duration = int((now - clock_in).total_seconds() / 60)
            if date_str in daily_data:
                daily_data[date_str]["minutes_worked"] += duration
    
    # Convert to list and calculate hours
    daily_breakdown = []
    total_minutes = 0
    
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        minutes = data["minutes_worked"]
        total_minutes += minutes
        daily_breakdown.append(DailyHours(
            date=data["date"],
            day_name=data["day_name"],
            minutes_worked=minutes,
            hours_worked=round(minutes / 60, 1)
        ))
    
    # Subtract breaks from total
    net_minutes = max(0, total_minutes - total_break_minutes)
    total_hours = round(net_minutes / 60, 1)
    
    # Calculate progress
    goal_minutes = goal_hours * 60
    progress_percent = round((net_minutes / goal_minutes) * 100, 1) if goal_minutes > 0 else 0
    
    # Determine status
    if progress_percent >= 100:
        if progress_percent > 100:
            status = "OVERTIME"
        else:
            status = "COMPLETED"
    elif progress_percent >= 70:
        status = "ON_TRACK"
    else:
        # Check if we're behind based on day of week
        days_passed = today.weekday() + 1
        expected_percent = (days_passed / 5) * 100  # Assuming 5 work days
        if progress_percent < expected_percent - 20:
            status = "BEHIND"
        else:
            status = "ON_TRACK"
    
    return WeeklyProgressResponse(
        user_id=current_user["id"],
        user_name=current_user.get("name"),
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=week_end.strftime("%Y-%m-%d"),
        total_minutes=net_minutes,
        total_hours=total_hours,
        goal_hours=goal_hours,
        progress_percent=min(progress_percent, 150),  # Cap at 150%
        status=status,
        daily_breakdown=daily_breakdown,
        break_minutes=total_break_minutes
    )


@api_router.get("/admin/progress/team")
async def get_team_weekly_progress(admin: dict = Depends(require_admin)):
    """Get weekly progress for all employees (admin only)"""
    # Get all active employees
    employees = await db.users.find(
        {"role": "EMPLOYEE", "is_active": True},
        {"_id": 0, "password_hash": 0}
    ).to_list(200)
    
    # Get the start of the current week (Monday)
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    goal_hours = 40.0
    goal_minutes = goal_hours * 60
    
    team_progress = []
    
    for emp in employees:
        user_id = emp["id"]
        
        # Get timesheets for this employee this week
        timesheets = await db.timesheets.find({
            "user_id": user_id,
            "clock_in_at": {
                "$gte": week_start.isoformat(),
                "$lte": week_end.isoformat()
            }
        }, {"_id": 0}).to_list(50)
        
        # Get breaks
        breaks = await db.breaks.find({
            "user_id": user_id,
            "status": "COMPLETED",
            "created_at": {
                "$gte": week_start.isoformat(),
                "$lte": week_end.isoformat()
            }
        }, {"_id": 0}).to_list(100)
        
        total_break_minutes = sum(b.get("duration_minutes", 0) for b in breaks)
        
        # Calculate total minutes
        total_minutes = 0
        for ts in timesheets:
            if ts.get("total_minutes"):
                total_minutes += ts["total_minutes"]
            elif ts.get("clock_out_at") is None:
                # Active shift
                clock_in = ts.get("clock_in_at")
                if isinstance(clock_in, str):
                    clock_in = datetime.fromisoformat(clock_in)
                duration = int((datetime.now(timezone.utc) - clock_in).total_seconds() / 60)
                total_minutes += duration
        
        net_minutes = max(0, total_minutes - total_break_minutes)
        total_hours = round(net_minutes / 60, 1)
        progress_percent = round((net_minutes / goal_minutes) * 100, 1) if goal_minutes > 0 else 0
        
        # Determine status
        if progress_percent >= 100:
            status = "OVERTIME" if progress_percent > 100 else "COMPLETED"
        elif progress_percent >= 70:
            status = "ON_TRACK"
        else:
            days_passed = today.weekday() + 1
            expected_percent = (days_passed / 5) * 100
            status = "BEHIND" if progress_percent < expected_percent - 20 else "ON_TRACK"
        
        team_progress.append({
            "user_id": user_id,
            "user_name": emp.get("name", "Unknown"),
            "user_email": emp.get("email"),
            "total_hours": total_hours,
            "goal_hours": goal_hours,
            "progress_percent": min(progress_percent, 150),
            "status": status
        })
    
    # Sort by progress (lowest first to highlight those behind)
    team_progress.sort(key=lambda x: x["progress_percent"])
    
    return {
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": week_end.strftime("%Y-%m-%d"),
        "team_progress": team_progress,
        "summary": {
            "total_employees": len(team_progress),
            "on_track": len([p for p in team_progress if p["status"] in ["ON_TRACK", "COMPLETED"]]),
            "behind": len([p for p in team_progress if p["status"] == "BEHIND"]),
            "overtime": len([p for p in team_progress if p["status"] == "OVERTIME"])
        }
    }


# ============== BREAK ROUTES ==============

@api_router.post("/breaks/start", response_model=BreakResponse)
async def start_break(
    break_data: BreakCreate = BreakCreate(),
    current_user: dict = Depends(get_current_user)
):
    """Start a break - employee must be clocked in"""
    # Check if user is clocked in
    active_timesheet = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    }, {"_id": 0})
    
    if not active_timesheet:
        raise HTTPException(status_code=400, detail="You must be clocked in to start a break")
    
    # Check if user is already on a break
    active_break = await db.breaks.find_one({
        "user_id": current_user["id"],
        "status": "ACTIVE"
    }, {"_id": 0})
    
    if active_break:
        raise HTTPException(status_code=400, detail="You are already on a break")
    
    # Create new break
    new_break = Break(
        user_id=current_user["id"],
        timesheet_id=active_timesheet.get("id"),
        start_time=datetime.now(timezone.utc),
        break_type=break_data.break_type
    )
    
    break_doc = new_break.model_dump()
    break_doc["start_time"] = break_doc["start_time"].isoformat()
    break_doc["created_at"] = break_doc["created_at"].isoformat()
    
    await db.breaks.insert_one(break_doc)
    
    return BreakResponse(
        id=new_break.id,
        start_time=new_break.start_time,
        end_time=None,
        duration_minutes=None,
        break_type=new_break.break_type,
        status=new_break.status.value
    )


@api_router.post("/breaks/end", response_model=BreakResponse)
async def end_break(current_user: dict = Depends(get_current_user)):
    """End the current break"""
    # Find active break
    active_break = await db.breaks.find_one({
        "user_id": current_user["id"],
        "status": "ACTIVE"
    }, {"_id": 0})
    
    if not active_break:
        raise HTTPException(status_code=400, detail="You are not on a break")
    
    # Calculate duration
    end_time = datetime.now(timezone.utc)
    start_time = active_break["start_time"]
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)
    
    duration_minutes = int((end_time - start_time).total_seconds() / 60)
    
    # Update break
    await db.breaks.update_one(
        {"id": active_break["id"]},
        {
            "$set": {
                "end_time": end_time.isoformat(),
                "duration_minutes": duration_minutes,
                "status": "COMPLETED"
            }
        }
    )
    
    return BreakResponse(
        id=active_break["id"],
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration_minutes,
        break_type=active_break.get("break_type", "GENERAL"),
        status="COMPLETED"
    )


@api_router.get("/breaks/status")
async def get_break_status(current_user: dict = Depends(get_current_user)):
    """Get current break status and check if user is on break"""
    active_break = await db.breaks.find_one({
        "user_id": current_user["id"],
        "status": "ACTIVE"
    }, {"_id": 0})
    
    if active_break:
        start_time = active_break["start_time"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        return {
            "is_on_break": True,
            "break_id": active_break["id"],
            "start_time": start_time,
            "break_type": active_break.get("break_type", "GENERAL")
        }
    
    return {
        "is_on_break": False,
        "break_id": None,
        "start_time": None,
        "break_type": None
    }


@api_router.get("/breaks/today", response_model=DailyBreakSummary)
async def get_today_breaks(current_user: dict = Depends(get_current_user)):
    """Get all breaks for today with summary"""
    # Get today's date range
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Find all breaks for today
    breaks_cursor = db.breaks.find({
        "user_id": current_user["id"],
        "created_at": {
            "$gte": today_start.isoformat(),
            "$lt": today_end.isoformat()
        }
    }, {"_id": 0}).sort("created_at", -1)
    
    breaks = await breaks_cursor.to_list(50)
    
    # Calculate totals
    total_minutes = 0
    is_on_break = False
    current_break_id = None
    current_break_start = None
    
    break_responses = []
    for b in breaks:
        start_time = b["start_time"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        end_time = b.get("end_time")
        if end_time and isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        if b.get("status") == "ACTIVE":
            is_on_break = True
            current_break_id = b["id"]
            current_break_start = start_time
        
        if b.get("duration_minutes"):
            total_minutes += b["duration_minutes"]
        
        break_responses.append(BreakResponse(
            id=b["id"],
            start_time=start_time,
            end_time=end_time,
            duration_minutes=b.get("duration_minutes"),
            break_type=b.get("break_type", "GENERAL"),
            status=b.get("status", "COMPLETED")
        ))
    
    return DailyBreakSummary(
        total_breaks=len(breaks),
        total_break_minutes=total_minutes,
        breaks=break_responses,
        is_on_break=is_on_break,
        current_break_id=current_break_id,
        current_break_start=current_break_start
    )


# ============== LEAVE/PTO ROUTES ==============

async def get_or_create_leave_balance(user_id: str, year: int = None) -> dict:
    """Get or create leave balance for a user for a specific year"""
    if year is None:
        year = datetime.now().year
    
    balance = await db.leave_balances.find_one(
        {"user_id": user_id, "year": year}, 
        {"_id": 0}
    )
    
    if not balance:
        # Create default balance for new year
        new_balance = LeaveBalance(user_id=user_id, year=year)
        balance_doc = new_balance.model_dump()
        balance_doc["created_at"] = balance_doc["created_at"].isoformat()
        balance_doc["updated_at"] = balance_doc["updated_at"].isoformat()
        await db.leave_balances.insert_one(balance_doc)
        balance = balance_doc
    
    return balance


def calculate_business_days(start_date: datetime, end_date: datetime) -> int:
    """Calculate number of business days between two dates (excluding weekends)"""
    days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # Monday = 0, Friday = 4
            days += 1
        current += timedelta(days=1)
    return days


@api_router.get("/leave/balance", response_model=LeaveBalanceResponse)
async def get_my_leave_balance(current_user: dict = Depends(get_current_user)):
    """Get current user's leave balance for the current year"""
    year = datetime.now().year
    balance = await get_or_create_leave_balance(current_user["id"], year)
    
    return LeaveBalanceResponse(
        vacation_total=balance.get("vacation_days", 15),
        vacation_used=balance.get("vacation_used", 0),
        vacation_remaining=balance.get("vacation_days", 15) - balance.get("vacation_used", 0),
        sick_total=balance.get("sick_days", 10),
        sick_used=balance.get("sick_used", 0),
        sick_remaining=balance.get("sick_days", 10) - balance.get("sick_used", 0),
        personal_total=balance.get("personal_days", 5),
        personal_used=balance.get("personal_used", 0),
        personal_remaining=balance.get("personal_days", 5) - balance.get("personal_used", 0),
        year=year
    )


@api_router.post("/leave/request", response_model=LeaveRequest)
async def create_leave_request(
    request_data: LeaveRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a new leave request"""
    # Calculate business days
    total_days = calculate_business_days(request_data.start_date, request_data.end_date)
    
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="Invalid date range")
    
    # Check if user has enough balance
    year = request_data.start_date.year
    balance = await get_or_create_leave_balance(current_user["id"], year)
    
    leave_type = request_data.leave_type
    if leave_type == LeaveType.VACATION:
        remaining = balance.get("vacation_days", 15) - balance.get("vacation_used", 0)
    elif leave_type == LeaveType.SICK:
        remaining = balance.get("sick_days", 10) - balance.get("sick_used", 0)
    elif leave_type == LeaveType.PERSONAL:
        remaining = balance.get("personal_days", 5) - balance.get("personal_used", 0)
    else:  # UNPAID
        remaining = 999  # No limit for unpaid leave
    
    if total_days > remaining and leave_type != LeaveType.UNPAID:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient {leave_type.value.lower()} days. You have {remaining} days remaining."
        )
    
    # Check for overlapping requests
    existing = await db.leave_requests.find_one({
        "user_id": current_user["id"],
        "status": {"$in": ["PENDING", "APPROVED"]},
        "$or": [
            {"start_date": {"$lte": request_data.end_date.isoformat()}, "end_date": {"$gte": request_data.start_date.isoformat()}}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a leave request for overlapping dates")
    
    # Create leave request
    leave_request = LeaveRequest(
        user_id=current_user["id"],
        user_name=current_user.get("name"),
        user_email=current_user.get("email"),
        leave_type=leave_type,
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        total_days=total_days,
        reason=request_data.reason
    )
    
    request_doc = leave_request.model_dump()
    request_doc["start_date"] = request_doc["start_date"].isoformat()
    request_doc["end_date"] = request_doc["end_date"].isoformat()
    request_doc["created_at"] = request_doc["created_at"].isoformat()
    
    await db.leave_requests.insert_one(request_doc)
    
    return leave_request


@api_router.get("/leave/requests", response_model=List[LeaveRequest])
async def get_my_leave_requests(current_user: dict = Depends(get_current_user)):
    """Get current user's leave requests"""
    requests = await db.leave_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Convert date strings back to datetime
    for req in requests:
        for field in ["start_date", "end_date", "created_at", "reviewed_at"]:
            if field in req and isinstance(req[field], str):
                try:
                    req[field] = datetime.fromisoformat(req[field])
                except (ValueError, TypeError):
                    pass
    
    return requests


@api_router.delete("/leave/request/{request_id}")
async def cancel_leave_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a pending leave request"""
    leave_request = await db.leave_requests.find_one(
        {"id": request_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_request.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")
    
    await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "CANCELLED"}}
    )
    
    return {"message": "Leave request cancelled successfully"}


# Admin Leave Management
@api_router.get("/admin/leave/requests", response_model=List[LeaveRequest])
async def get_all_leave_requests(
    status: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Get all leave requests (admin only)"""
    query = {}
    if status:
        query["status"] = status.upper()
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Convert date strings back to datetime
    for req in requests:
        for field in ["start_date", "end_date", "created_at", "reviewed_at"]:
            if field in req and isinstance(req[field], str):
                try:
                    req[field] = datetime.fromisoformat(req[field])
                except (ValueError, TypeError):
                    pass
    
    return requests


@api_router.put("/admin/leave/request/{request_id}")
async def review_leave_request(
    request_id: str,
    update_data: LeaveRequestUpdate,
    admin: dict = Depends(require_admin)
):
    """Approve or reject a leave request (admin only)"""
    leave_request = await db.leave_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_request.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="Can only review pending requests")
    
    # Update the request
    update_fields = {
        "status": update_data.status.value,
        "reviewed_by": admin["id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update_data.admin_notes:
        update_fields["admin_notes"] = update_data.admin_notes
    
    await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": update_fields}
    )
    
    # If approved, update the user's leave balance
    if update_data.status == LeaveStatus.APPROVED:
        user_id = leave_request["user_id"]
        leave_type = leave_request["leave_type"]
        total_days = leave_request["total_days"]
        
        # Parse start_date to get the year
        start_date = leave_request["start_date"]
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date)
        year = start_date.year
        
        # Get or create balance
        balance = await get_or_create_leave_balance(user_id, year)
        
        # Update the used days based on leave type
        if leave_type == "VACATION":
            field = "vacation_used"
        elif leave_type == "SICK":
            field = "sick_used"
        elif leave_type == "PERSONAL":
            field = "personal_used"
        else:
            field = None
        
        if field:
            await db.leave_balances.update_one(
                {"user_id": user_id, "year": year},
                {
                    "$inc": {field: total_days},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
    
    return {"message": f"Leave request {update_data.status.value.lower()}"}


@api_router.get("/admin/leave/pending-count")
async def get_pending_leave_count(admin: dict = Depends(require_admin)):
    """Get count of pending leave requests"""
    count = await db.leave_requests.count_documents({"status": "PENDING"})
    return {"pending_count": count}


# ============== LEGACY ROUTES ==============
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "CORtracker API v1.0.0"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
