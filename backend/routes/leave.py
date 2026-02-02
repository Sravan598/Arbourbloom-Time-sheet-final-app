"""
Leave Management Routes
Handles leave requests, leave types, and leave approvals
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from database import db
from config import DEFAULT_TENANT_SLUG
from utils.auth import get_current_user, require_admin, get_tenant_id
from services.notification import create_notification
from models.enums import NotificationType, LeaveStatus

router = APIRouter(tags=["Leave"])


# ============== REQUEST/RESPONSE MODELS ==============

class LeaveTypeCreate(BaseModel):
    name: str
    icon: Optional[str] = "calendar"


class LeaveType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str = "calendar"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    user_image: Optional[str] = None
    leave_type: str
    is_custom_type: bool = False
    start_date: str
    end_date: str
    days: float
    reason: str
    status: LeaveStatus = LeaveStatus.PENDING
    reviewed_by: Optional[str] = None
    reviewer_name: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    is_custom_type: bool = False


class LeaveRequestReview(BaseModel):
    status: str  # APPROVED or DENIED
    review_note: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def calculate_days(start_date: str, end_date: str) -> float:
    """Calculate number of days between two dates (inclusive)"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        return (end - start).days + 1
    except Exception:
        return 1


# ============== LEAVE TYPE ROUTES ==============

@router.get("/leave/types")
async def get_leave_types(current_user: dict = Depends(get_current_user)):
    """Get all active leave types for the tenant"""
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    types = await db.leave_types.find({"is_active": True, "tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    
    # Fallback to default types if none exist for this tenant
    if not types:
        types = await db.leave_types.find({"is_active": True, "tenant_id": {"$exists": False}}, {"_id": 0}).to_list(100)
    
    return types


@router.post("/admin/leave/types")
async def create_leave_type(
    type_data: LeaveTypeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Create a new leave type"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # CRITICAL: Include tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Check if type already exists for this tenant
    existing = await db.leave_types.find_one({"name": type_data.name, "tenant_id": tenant_id})
    if existing:
        raise HTTPException(status_code=400, detail="Leave type already exists")
    
    leave_type = LeaveType(name=type_data.name, icon=type_data.icon or "calendar")
    doc = leave_type.model_dump()
    doc["tenant_id"] = tenant_id
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leave_types.insert_one(doc)
    
    return {"message": "Leave type created", "id": leave_type.id}


@router.put("/admin/leave/types/{type_id}")
async def update_leave_type(
    type_id: str,
    type_data: LeaveTypeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Update a leave type"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    existing = await db.leave_types.find_one({"id": type_id, "tenant_id": tenant_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    await db.leave_types.update_one(
        {"id": type_id},
        {"$set": {"name": type_data.name, "icon": type_data.icon or "calendar"}}
    )
    
    return {"message": "Leave type updated"}


@router.delete("/admin/leave/types/{type_id}")
async def delete_leave_type(
    type_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Delete (deactivate) a leave type"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    existing = await db.leave_types.find_one({"id": type_id, "tenant_id": tenant_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    # Soft delete - just mark as inactive
    await db.leave_types.update_one(
        {"id": type_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Leave type deleted"}


# ============== EMPLOYEE LEAVE REQUEST ROUTES ==============

@router.get("/leave/requests")
async def get_my_leave_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get current user's leave requests"""
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status.upper()
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Ensure dates are strings
    for req in requests:
        if isinstance(req.get('start_date'), datetime):
            req['start_date'] = req['start_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('end_date'), datetime):
            req['end_date'] = req['end_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('created_at'), datetime):
            req['created_at'] = req['created_at'].isoformat()
        if isinstance(req.get('reviewed_at'), datetime):
            req['reviewed_at'] = req['reviewed_at'].isoformat()
    
    return requests


@router.post("/leave/requests")
async def create_leave_request(
    request_data: LeaveRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a new leave request"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Validate dates
    try:
        start = datetime.strptime(request_data.start_date, "%Y-%m-%d")
        end = datetime.strptime(request_data.end_date, "%Y-%m-%d")
        if end < start:
            raise HTTPException(status_code=400, detail="End date must be after start date")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    days = calculate_days(request_data.start_date, request_data.end_date)
    
    # Check for overlapping requests (within same tenant)
    overlap = await db.leave_requests.find_one({
        "tenant_id": tenant_id,
        "user_id": current_user["id"],
        "status": {"$ne": "DENIED"},
        "$or": [
            {"start_date": {"$lte": request_data.end_date}, "end_date": {"$gte": request_data.start_date}}
        ]
    })
    if overlap:
        raise HTTPException(status_code=400, detail="You already have a leave request for overlapping dates")
    
    # Check if it's a custom type
    is_custom = request_data.is_custom_type
    if not is_custom:
        existing_type = await db.leave_types.find_one({"name": request_data.leave_type, "is_active": True})
        if not existing_type:
            is_custom = True
    
    leave_request = LeaveRequest(
        user_id=current_user["id"],
        user_name=current_user.get("name", "Unknown"),
        user_image=current_user.get("profile_image"),
        leave_type=request_data.leave_type,
        is_custom_type=is_custom,
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        days=days,
        reason=request_data.reason
    )
    
    doc = leave_request.model_dump()
    doc["tenant_id"] = tenant_id  # Add tenant_id
    doc["created_at"] = doc["created_at"].isoformat()
    doc["status"] = doc["status"].value
    await db.leave_requests.insert_one(doc)
    
    # Notify all admins of this tenant
    admins = await db.users.find({"tenant_id": tenant_id, "role": "ADMIN", "is_active": True}, {"_id": 0, "id": 1}).to_list(100)
    for admin in admins:
        await create_notification(
            user_id=admin["id"],
            notif_type=NotificationType.LEAVE_REQUEST,
            title="New Leave Request",
            message=f"📝 {current_user.get('name', 'An employee')} requested {request_data.leave_type} ({days} day{'s' if days > 1 else ''})",
            reference_id=leave_request.id
        )
    
    return {"message": "Leave request submitted", "id": leave_request.id}


@router.delete("/leave/requests/{request_id}")
async def cancel_leave_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a pending leave request"""
    request = await db.leave_requests.find_one({"id": request_id, "user_id": current_user["id"]}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if request.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")
    
    await db.leave_requests.delete_one({"id": request_id})
    
    return {"message": "Leave request cancelled"}


# ============== ADMIN LEAVE REQUEST ROUTES ==============

@router.get("/admin/leave/requests")
async def get_all_leave_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Get all leave requests for the tenant"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status.upper()
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Ensure dates are strings (MongoDB may auto-parse dates)
    for req in requests:
        if isinstance(req.get('start_date'), datetime):
            req['start_date'] = req['start_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('end_date'), datetime):
            req['end_date'] = req['end_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('created_at'), datetime):
            req['created_at'] = req['created_at'].isoformat()
        if isinstance(req.get('reviewed_at'), datetime):
            req['reviewed_at'] = req['reviewed_at'].isoformat()
    
    return requests


@router.put("/admin/leave/requests/{request_id}")
async def review_leave_request(
    request_id: str,
    review: LeaveRequestReview,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Approve or deny a leave request"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    request = await db.leave_requests.find_one({
        "id": request_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if request.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="Request has already been reviewed")
    
    # Update request
    await db.leave_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": review.status,
                "reviewed_by": current_user["id"],
                "reviewer_name": current_user.get("name"),
                "review_note": review.review_note,
                "reviewed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Notify employee
    if review.status == "APPROVED":
        notif_type = NotificationType.LEAVE_APPROVED
        title = "Leave Approved ✅"
        message = f"Your {request['leave_type']} request ({request['start_date']} to {request['end_date']}) has been approved"
        if review.review_note:
            message += f". Note: {review.review_note}"
    else:
        notif_type = NotificationType.LEAVE_DENIED
        title = "Leave Denied ❌"
        message = f"Your {request['leave_type']} request ({request['start_date']} to {request['end_date']}) has been denied"
        if review.review_note:
            message += f". Reason: {review.review_note}"
    
    await create_notification(
        user_id=request["user_id"],
        notif_type=notif_type,
        title=title,
        message=message,
        reference_id=request_id
    )
    
    return {"message": f"Leave request {review.status.lower()}"}
