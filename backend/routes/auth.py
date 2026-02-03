"""
Authentication Routes
Handles user signup, login, and authentication-related endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import bcrypt

from database import db
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS, DEFAULT_TENANT_SLUG
from models.enums import UserRole, InvitationStatus
from models.security import AuditEventType
from services.audit import log_audit_event
from services.webhook import trigger_webhooks, WebhookEventType
from utils.auth import create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============== REQUEST/RESPONSE MODELS ==============
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[UserRole] = UserRole.EMPLOYEE
    tenant_id: Optional[str] = None
    admin_invite_code: Optional[str] = None
    employee_invite_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    tenant_id: str = DEFAULT_TENANT_SLUG


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


# ============== ROUTES ==============
@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    """Register a new user"""
    import uuid
    
    # Determine tenant_id - default to aurborbloom
    tenant_id = user_data.tenant_id or DEFAULT_TENANT_SLUG
    
    # Check if email already exists within the tenant
    existing_user = await db.users.find_one({
        "email": user_data.email.lower(),
        "tenant_id": tenant_id
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Handle admin signup with invite code
    role = UserRole.EMPLOYEE
    invitation = None
    
    # Check for Super Admin signup code first
    super_admin_code = os.environ.get('SUPER_ADMIN_CODE', 'AURBORBLOOM-SUPER-2025')
    if user_data.admin_invite_code == super_admin_code:
        role = UserRole.SUPER_ADMIN
        tenant_id = DEFAULT_TENANT_SLUG
    elif user_data.role == UserRole.ADMIN or user_data.admin_invite_code:
        # Check tenant-specific admin code if role is ADMIN or admin_invite_code is provided
        if not user_data.admin_invite_code:
            raise HTTPException(status_code=403, detail="Admin invite code is required for admin signup")
        
        tenant = await db.tenants.find_one({"slug": tenant_id}, {"_id": 0})
        valid_code = False
        
        if tenant and tenant.get("admin_signup_code") == user_data.admin_invite_code:
            valid_code = True
        
        # Fallback to default admin code
        default_admin_code = os.environ.get('ADMIN_SIGNUP_CODE', 'ARBORBLOOM-ADMIN-2025')
        if user_data.admin_invite_code == default_admin_code:
            valid_code = True
        
        if not valid_code:
            raise HTTPException(status_code=403, detail="Invalid admin invitation code")
        
        role = UserRole.ADMIN
    
    # Handle employee invitation code
    if user_data.employee_invite_code:
        invitation = await db.invitations.find_one({
            "code": user_data.employee_invite_code,
            "tenant_id": tenant_id,
            "status": InvitationStatus.PENDING.value
        })
        
        if not invitation:
            raise HTTPException(status_code=400, detail="Invalid or expired invitation code")
        
        # Check if invitation expired
        if datetime.now(timezone.utc) > datetime.fromisoformat(invitation["expires_at"]):
            await db.invitations.update_one(
                {"id": invitation["id"]},
                {"$set": {"status": InvitationStatus.EXPIRED.value}}
            )
            raise HTTPException(status_code=400, detail="Invitation has expired")
        
        # Check if email matches invitation
        if invitation.get("email") and invitation["email"].lower() != user_data.email.lower():
            raise HTTPException(status_code=400, detail="Email does not match invitation")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "tenant_id": tenant_id,
        "name": user_data.name,
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "role": role.value,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "department": invitation.get("department") if invitation else None,
    }
    
    await db.users.insert_one(user)
    
    # Update invitation if used
    if invitation:
        await db.invitations.update_one(
            {"id": invitation["id"]},
            {
                "$set": {
                    "status": InvitationStatus.ACCEPTED.value,
                    "accepted_at": datetime.now(timezone.utc).isoformat(),
                    "accepted_by": user_id
                }
            }
        )
    
    # Log security event
    await log_audit_event(
        event_type=AuditEventType.USER_CREATED,
        tenant_id=tenant_id,
        user_id=user_id,
        user_email=user_data.email.lower(),
        details={"role": role.value}
    )
    
    # Trigger webhook
    await trigger_webhooks(
        tenant_id=tenant_id,
        event_type=WebhookEventType.USER_CREATED,
        payload={"user_id": user_id, "email": user_data.email.lower(), "role": role.value}
    )
    
    # Create token
    token = create_token(user_id, user_data.email.lower(), role.value, tenant_id)
    
    # Return response
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(
        access_token=token,
        user=user_response
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    """Authenticate user and return token"""
    tenant_id = credentials.tenant_id
    
    # Get client info for audit
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Find user
    user = await db.users.find_one({
        "email": credentials.email.lower(),
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not user:
        # Log failed login
        await log_audit_event(
            event_type=AuditEventType.LOGIN_FAILED,
            tenant_id=tenant_id,
            user_email=credentials.email.lower(),
            ip_address=client_ip,
            user_agent=user_agent,
            details={"reason": "user_not_found"},
            severity="WARNING"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user.get("password_hash", "")):
        await log_audit_event(
            event_type=AuditEventType.LOGIN_FAILED,
            tenant_id=tenant_id,
            user_id=user.get("id"),
            user_email=credentials.email.lower(),
            ip_address=client_ip,
            user_agent=user_agent,
            details={"reason": "invalid_password"},
            severity="WARNING"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Log successful login
    await log_audit_event(
        event_type=AuditEventType.LOGIN_SUCCESS,
        tenant_id=tenant_id,
        user_id=user.get("id"),
        user_email=credentials.email.lower(),
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    # Create token
    token = create_token(
        user["id"],
        user["email"],
        user.get("role", "EMPLOYEE"),
        tenant_id
    )
    
    # Return response
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(
        access_token=token,
        user=user_response
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user"""
    return {k: v for k, v in current_user.items() if k != "password_hash"}
