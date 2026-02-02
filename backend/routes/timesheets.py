"""
Timesheet Routes
Handles time tracking, clock in/out, and timesheet management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from config import DEFAULT_TENANT_SLUG
from utils.auth import get_current_user, require_admin, get_tenant_id
from services.utils import serialize_datetime, deserialize_datetime

router = APIRouter(tags=["Timesheets"])


# ============== REQUEST/RESPONSE MODELS ==============

class Timesheet(BaseModel):
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


class ClockInRequest(BaseModel):
    notes: Optional[str] = None


class ClockOutRequest(BaseModel):
    notes: Optional[str] = None


class CorrectionRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    timesheet_id: str
    requested_change: dict
    reason: str
    status: str = "PENDING"
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRequestCreate(BaseModel):
    timesheet_id: str
    requested_change: dict
    reason: str = Field(..., min_length=10)


class CorrectionRequestUpdate(BaseModel):
    status: str  # APPROVED or REJECTED
    admin_notes: Optional[str] = None


# ============== EMPLOYEE TIMESHEET ROUTES ==============

@router.post("/employee/clock-in", response_model=Timesheet)
async def clock_in(
    request: ClockInRequest = ClockInRequest(),
    current_user: dict = Depends(get_current_user)
):
    """Clock in to start a shift"""
    if current_user["role"] != "EMPLOYEE":
        raise HTTPException(status_code=403, detail="Only employees can clock in")
    
    tenant_id = get_tenant_id(current_user)
    
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
    doc["tenant_id"] = tenant_id
    await db.timesheets.insert_one(doc)
    
    return timesheet


@router.post("/employee/clock-out", response_model=Timesheet)
async def clock_out(
    request: ClockOutRequest = ClockOutRequest(),
    current_user: dict = Depends(get_current_user)
):
    """Clock out to end a shift"""
    if current_user["role"] != "EMPLOYEE":
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


@router.get("/employee/current-shift")
async def get_current_shift(current_user: dict = Depends(get_current_user)):
    """Get current active shift if clocked in"""
    if current_user["role"] != "EMPLOYEE":
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    open_shift = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    }, {"_id": 0})
    
    if open_shift:
        open_shift = deserialize_datetime(open_shift, ["clock_in_at", "created_at"])
        return {"clocked_in": True, "shift": open_shift}
    
    return {"clocked_in": False, "shift": None}


@router.get("/employee/timesheets", response_model=List[Timesheet])
async def get_employee_timesheets(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get employee's own timesheets"""
    if current_user["role"] != "EMPLOYEE":
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


@router.get("/employee/today-punches")
async def get_today_punches(current_user: dict = Depends(get_current_user)):
    """Get today's clock in/out records"""
    if current_user["role"] != "EMPLOYEE":
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

@router.post("/employee/correction-request", response_model=CorrectionRequest)
async def create_correction_request(
    request_data: CorrectionRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a timesheet correction request"""
    if current_user["role"] != "EMPLOYEE":
        raise HTTPException(status_code=403, detail="Only employees can submit correction requests")
    
    tenant_id = get_tenant_id(current_user)
    
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
    doc["tenant_id"] = tenant_id
    await db.correction_requests.insert_one(doc)
    
    return correction


@router.get("/employee/correction-requests", response_model=List[CorrectionRequest])
async def get_employee_correction_requests(current_user: dict = Depends(get_current_user)):
    """Get employee's own correction requests"""
    if current_user["role"] != "EMPLOYEE":
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    requests = await db.correction_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


# ============== ADMIN TIMESHEET ROUTES ==============

@router.get("/admin/timesheets", response_model=List[Timesheet])
async def get_all_timesheets(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Get all timesheets for the tenant (admin only)"""
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = admin.get("tenant_id", DEFAULT_TENANT_SLUG)
    query = {"tenant_id": tenant_id}
    
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


@router.put("/admin/timesheets/{timesheet_id}", response_model=Timesheet)
async def update_timesheet(
    timesheet_id: str,
    update_data: TimesheetUpdate,
    admin: dict = Depends(require_admin)
):
    """Update a timesheet (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Get existing timesheet
    existing = await db.timesheets.find_one({
        "id": timesheet_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
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
    
    # Serialize datetimes for storage
    for key in ["clock_in_at", "clock_out_at"]:
        if key in update_dict and isinstance(update_dict[key], datetime):
            update_dict[key] = update_dict[key].isoformat()
    
    await db.timesheets.update_one(
        {"id": timesheet_id},
        {"$set": update_dict}
    )
    
    # Return updated timesheet
    updated = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    updated = deserialize_datetime(updated, ["clock_in_at", "clock_out_at", "created_at"])
    
    return Timesheet(**updated)


@router.get("/admin/correction-requests", response_model=List[CorrectionRequest])
async def get_all_correction_requests(admin: dict = Depends(require_admin)):
    """Get all correction requests for the tenant (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    requests = await db.correction_requests.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


@router.put("/admin/correction-requests/{request_id}")
async def review_correction_request(
    request_id: str,
    review: CorrectionRequestUpdate,
    admin: dict = Depends(require_admin)
):
    """Approve or reject a correction request (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    request = await db.correction_requests.find_one({
        "id": request_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Correction request not found")
    
    if request.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="Request has already been reviewed")
    
    # Update correction request
    await db.correction_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": review.status,
                "admin_notes": review.admin_notes,
                "reviewed_by": admin["id"],
                "reviewed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # If approved, apply the changes to the timesheet
    if review.status == "APPROVED":
        requested_change = request.get("requested_change", {})
        if requested_change:
            # Recalculate total_minutes if times changed
            timesheet = await db.timesheets.find_one({"id": request["timesheet_id"]}, {"_id": 0})
            if timesheet:
                clock_in = requested_change.get("clock_in_at") or timesheet.get("clock_in_at")
                clock_out = requested_change.get("clock_out_at") or timesheet.get("clock_out_at")
                
                if clock_in and clock_out:
                    if isinstance(clock_in, str):
                        clock_in = datetime.fromisoformat(clock_in)
                    if isinstance(clock_out, str):
                        clock_out = datetime.fromisoformat(clock_out)
                    requested_change["total_minutes"] = int((clock_out - clock_in).total_seconds() / 60)
                
                await db.timesheets.update_one(
                    {"id": request["timesheet_id"]},
                    {"$set": requested_change}
                )
    
    return {"message": f"Correction request {review.status.lower()}"}


# ============== DASHBOARD STATS ==============

@router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(admin: dict = Depends(require_admin)):
    """Get dashboard statistics for admin"""
    tenant_id = get_tenant_id(admin)
    
    # Get current week's start
    today = datetime.now(timezone.utc)
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    
    # Total hours this week (for this tenant)
    week_timesheets = await db.timesheets.find({
        "tenant_id": tenant_id,
        "clock_in_at": {"$gte": week_start},
        "total_minutes": {"$exists": True}
    }, {"_id": 0, "total_minutes": 1}).to_list(10000)
    
    total_minutes = sum(ts.get("total_minutes", 0) for ts in week_timesheets)
    total_hours = round(total_minutes / 60, 1)
    
    # Active employees (clocked in now)
    active_employees = await db.timesheets.count_documents({
        "tenant_id": tenant_id,
        "clock_out_at": None
    })
    
    # Pending leave requests
    pending_leave = await db.leave_requests.count_documents({
        "tenant_id": tenant_id,
        "status": "PENDING"
    })
    
    # Pending correction requests
    pending_corrections = await db.correction_requests.count_documents({
        "tenant_id": tenant_id,
        "status": "PENDING"
    })
    
    # Total pending requests
    total_pending_requests = pending_leave + pending_corrections
    
    # Total employees
    total_employees = await db.users.count_documents({
        "tenant_id": tenant_id,
        "role": "EMPLOYEE",
        "is_active": True
    })
    
    return {
        "total_hours_this_week": total_hours,
        "active_employees": active_employees,
        "pending_leave_requests": pending_leave,
        "pending_correction_requests": pending_corrections,
        "total_pending_requests": total_pending_requests,
        "total_employees": total_employees
    }
