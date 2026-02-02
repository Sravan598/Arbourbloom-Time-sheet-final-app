"""
Employee Management Routes
Handles employee CRUD operations, invitations, and admin employee management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import random
import string

from database import db
from config import DEFAULT_TENANT_SLUG
from utils.auth import get_current_user, require_admin, get_tenant_id
from utils.helpers import hash_password
from services.audit import log_audit_event
from models.security import AuditEventType

router = APIRouter(tags=["Employees"])


# ============== REQUEST/RESPONSE MODELS ==============

class InvitationCreate(BaseModel):
    email: EmailStr
    department: Optional[str] = None
    expires_in_days: Optional[int] = 7


class InvitationResponse(BaseModel):
    id: str
    email: str
    code: str
    department: Optional[str] = None
    status: str
    invited_by: str
    invited_by_name: Optional[str] = None
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime] = None


class EmergencyContact(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relation: Optional[str] = None


class NotificationPreferences(BaseModel):
    clock_in_out_email: bool = False
    daily_summary: bool = False
    weekly_reminder: bool = True
    leave_updates: bool = True
    overtime_warnings: bool = True
    announcements: bool = True


class UserResponse(BaseModel):
    id: str
    tenant_id: Optional[str] = DEFAULT_TENANT_SLUG
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    join_date: Optional[str] = None
    work_location: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    time_zone: Optional[str] = "UTC"
    theme_preference: Optional[str] = "light"
    notification_preferences: Optional[NotificationPreferences] = None


class AdminProfileUpdate(BaseModel):
    """Admin can update additional work-related fields"""
    employee_id: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    join_date: Optional[str] = None
    work_location: Optional[str] = None


class PasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=6, description="New password (min 6 characters)")


class CreateEmployeeRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    department: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def generate_invite_code() -> str:
    """Generate a unique 8-character invitation code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))


# ============== ADMIN EMPLOYEE ROUTES ==============

@router.get("/admin/employees", response_model=List[UserResponse])
async def get_all_employees(admin: dict = Depends(require_admin)):
    """Get all employees for the current tenant (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    users = await db.users.find({
        "role": "EMPLOYEE",
        "tenant_id": tenant_id
    }, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
        
        # Include profile_image from profile subdocument if exists
        if user.get("profile") and user["profile"].get("photo_url"):
            user["profile_image"] = user["profile"]["photo_url"]
    
    return users


@router.delete("/admin/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete an employee and all associated data (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Check employee exists and belongs to tenant
    employee = await db.users.find_one({
        "id": employee_id, 
        "role": "EMPLOYEE",
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Delete all associated data
    await db.timesheets.delete_many({"user_id": employee_id})
    await db.documents.delete_many({"user_id": employee_id})
    await db.leave_requests.delete_many({"user_id": employee_id})
    await db.breaks.delete_many({"user_id": employee_id})
    
    # Delete the employee
    await db.users.delete_one({"id": employee_id})
    
    return {"message": f"Employee '{employee.get('name')}' and all associated data deleted successfully"}


@router.post("/admin/employees/{employee_id}/reset-password")
async def reset_employee_password(
    employee_id: str,
    reset_data: PasswordResetRequest,
    admin: dict = Depends(require_admin)
):
    """Reset an employee's password (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Check employee exists and belongs to same tenant
    employee = await db.users.find_one({
        "id": employee_id, 
        "tenant_id": tenant_id,
        "role": "EMPLOYEE"
    }, {"_id": 0, "name": 1, "email": 1})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Hash the new password
    new_password_hash = hash_password(reset_data.new_password)
    
    # Update password
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"password_hash": new_password_hash}}
    )
    
    # Log the action for security audit
    await log_audit_event(
        event_type=AuditEventType.PASSWORD_CHANGE,
        tenant_id=tenant_id,
        user_id=admin.get("id"),
        user_email=admin.get("email"),
        resource_type="user",
        resource_id=employee_id,
        details={"action": "admin_reset", "target_email": employee.get("email")},
        severity="INFO"
    )
    
    return {
        "message": f"Password reset successfully for {employee.get('name')}",
        "employee_email": employee.get("email")
    }


@router.put("/admin/employees/{employee_id}/work-info")
async def update_employee_work_info(
    employee_id: str,
    update_data: AdminProfileUpdate,
    admin: dict = Depends(require_admin)
):
    """Update employee work information (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Check employee exists and belongs to tenant
    employee = await db.users.find_one({
        "id": employee_id,
        "tenant_id": tenant_id,
        "role": "EMPLOYEE"
    }, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Build update dict with non-None values
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": update_dict}
    )
    
    return {"message": "Employee work info updated successfully"}


@router.post("/admin/create-employee", response_model=UserResponse)
async def create_employee(
    employee_data: CreateEmployeeRequest,
    admin: dict = Depends(require_admin)
):
    """Create a new employee directly (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Check if email already exists in this tenant
    existing = await db.users.find_one({
        "email": employee_data.email.lower(),
        "tenant_id": tenant_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "tenant_id": tenant_id,
        "name": employee_data.name,
        "email": employee_data.email.lower(),
        "password_hash": hash_password(employee_data.password),
        "role": "EMPLOYEE",
        "is_active": True,
        "department": employee_data.department,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Remove password_hash for response
    user.pop("password_hash", None)
    user.pop("_id", None)
    user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return user


# ============== INVITATION ENDPOINTS ==============

@router.post("/admin/invitations", response_model=InvitationResponse)
async def create_invitation(
    invitation_data: InvitationCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new employee invitation (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Check if email already has a pending invitation for this tenant
    existing = await db.invitations.find_one({
        "email": invitation_data.email.lower(),
        "status": "pending",
        "tenant_id": tenant_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this email")
    
    # Check if email is already registered in this tenant
    existing_user = await db.users.find_one({
        "email": invitation_data.email.lower(),
        "tenant_id": tenant_id
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered")
    
    # Generate unique invitation code
    code = generate_invite_code()
    while await db.invitations.find_one({"code": code}):
        code = generate_invite_code()
    
    invitation = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "email": invitation_data.email.lower(),
        "code": code,
        "department": invitation_data.department,
        "status": "pending",
        "invited_by": admin["id"],
        "invited_by_name": admin.get("name"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=invitation_data.expires_in_days)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": None
    }
    
    await db.invitations.insert_one(invitation)
    
    # Remove _id for response
    invitation.pop("_id", None)
    
    # Parse dates for response
    invitation["expires_at"] = datetime.fromisoformat(invitation["expires_at"])
    invitation["created_at"] = datetime.fromisoformat(invitation["created_at"])
    
    return invitation


@router.get("/admin/invitations", response_model=List[InvitationResponse])
async def get_all_invitations(
    status: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Get all invitations for the current tenant (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    
    invitations = await db.invitations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Parse dates and check for expired invitations
    for inv in invitations:
        if isinstance(inv.get("expires_at"), str):
            inv["expires_at"] = datetime.fromisoformat(inv["expires_at"])
        if isinstance(inv.get("created_at"), str):
            inv["created_at"] = datetime.fromisoformat(inv["created_at"])
        if inv.get("accepted_at") and isinstance(inv["accepted_at"], str):
            inv["accepted_at"] = datetime.fromisoformat(inv["accepted_at"])
        
        # Auto-expire pending invitations
        if inv["status"] == "pending" and datetime.now(timezone.utc) > inv["expires_at"]:
            inv["status"] = "expired"
            await db.invitations.update_one(
                {"id": inv["id"]},
                {"$set": {"status": "expired"}}
            )
    
    return invitations


@router.delete("/admin/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    admin: dict = Depends(require_admin)
):
    """Revoke/delete an invitation (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    invitation = await db.invitations.find_one({
        "id": invitation_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation["status"] == "accepted":
        raise HTTPException(status_code=400, detail="Cannot revoke an accepted invitation")
    
    await db.invitations.update_one(
        {"id": invitation_id},
        {"$set": {"status": "revoked"}}
    )
    
    return {"message": "Invitation revoked successfully"}


@router.get("/invitations/validate/{code}")
async def validate_invitation_code(code: str):
    """Validate an invitation code (public endpoint)"""
    invitation = await db.invitations.find_one({
        "code": code.upper(),
        "status": "pending"
    }, {"_id": 0})
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation code")
    
    # Check expiry
    expires_at = invitation.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if datetime.now(timezone.utc) > expires_at:
        await db.invitations.update_one(
            {"id": invitation["id"]},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=404, detail="Invitation code has expired")
    
    return {
        "valid": True,
        "email": invitation["email"],
        "department": invitation.get("department"),
        "tenant_id": invitation.get("tenant_id"),
        "expires_at": expires_at.isoformat()
    }


# ============== ADMIN USER MANAGEMENT ==============

@router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(admin: dict = Depends(require_admin)):
    """Get all users for the current tenant (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    users = await db.users.find({
        "tenant_id": tenant_id
    }, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return users


@router.put("/admin/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """Toggle user active status (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    user = await db.users.find_one({
        "id": user_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Can't deactivate yourself
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    new_status = not user.get("is_active", True)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "message": f"User {'activated' if new_status else 'deactivated'} successfully",
        "is_active": new_status
    }
