from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from .enums import LeaveStatus


class LeaveBalance(BaseModel):
    user_id: str
    year: int
    vacation_days: float = 15.0
    vacation_used: float = 0.0
    sick_days: float = 10.0
    sick_used: float = 0.0
    personal_days: float = 3.0
    personal_used: float = 0.0
    unpaid_days: float = 0.0
    carry_over: float = 0.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveBalanceResponse(BaseModel):
    vacation_available: float
    vacation_used: float
    vacation_total: float
    sick_available: float
    sick_used: float
    sick_total: float
    personal_available: float
    personal_used: float
    personal_total: float
    unpaid_used: float


class LeaveRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    leave_type: str
    start_date: str
    end_date: str
    days_requested: float
    reason: str
    status: LeaveStatus = LeaveStatus.PENDING
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    days_requested: float
    reason: str


class LeaveRequestUpdate(BaseModel):
    status: LeaveStatus
    admin_notes: Optional[str] = None


class LeaveType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    color: str = "#3B82F6"
    days_per_year: float = 0
    is_paid: bool = True
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveTypeCreate(BaseModel):
    name: str
    code: str
    color: str = "#3B82F6"
    days_per_year: float = 0
    is_paid: bool = True


class LeaveRequestReview(BaseModel):
    status: str
    admin_notes: Optional[str] = None
