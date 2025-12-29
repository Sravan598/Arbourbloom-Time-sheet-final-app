from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum

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
                except:
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
@api_router.post("/employee/clock-in", response_model=Timesheet)
async def clock_in(current_user: dict = Depends(get_current_user)):
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
        clock_in_at=datetime.now(timezone.utc)
    )
    
    doc = serialize_datetime(timesheet.model_dump())
    await db.timesheets.insert_one(doc)
    
    return timesheet


@api_router.post("/employee/clock-out", response_model=Timesheet)
async def clock_out(current_user: dict = Depends(get_current_user)):
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
    
    # Update timesheet
    await db.timesheets.update_one(
        {"id": open_shift["id"]},
        {"$set": {
            "clock_out_at": clock_out_at.isoformat(),
            "total_minutes": total_minutes
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
