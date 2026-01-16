from fastapi import APIRouter, HTTPException
from core.database import db
from core.auth import hash_password, verify_password, create_token
from core.config import settings
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate admin code if role is ADMIN
    if user_data.role == "ADMIN":
        if not user_data.admin_code or user_data.admin_code != settings.ADMIN_SIGNUP_CODE:
            raise HTTPException(status_code=400, detail="Invalid admin code")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "is_active": True,
        "department": "",
        "position": "",
        "phone": "",
        "address": "",
        "emergency_contact": None,
        "profile_image": None,
        "hire_date": None,
        "birthday": None,
        "notification_preferences": {
            "email_notifications": True,
            "push_notifications": True,
            "announcement_alerts": True,
            "leave_request_alerts": True,
            "timesheet_alerts": True
        },
        "employee_id": None,
        "pay_rate": None,
        "employment_type": "FULL_TIME",
        "work_schedule": "STANDARD",
        "assigned_projects": [],
        "manager_id": None,
        "calendar_token": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user_id, user_data.email, user_data.role)
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    return TokenResponse(token=token, user=UserResponse(**user_response))


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    return TokenResponse(token=token, user=UserResponse(**user_response))


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = None):
    from core.auth import get_current_user
    from fastapi import Depends
    # This will be handled by the dependency
    pass
