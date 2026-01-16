from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from .enums import CorrectionStatus, BreakStatus


class Timesheet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    total_hours: float = 0.0
    break_minutes: int = 0
    status: str = "IN_PROGRESS"
    notes: str = ""
    overtime_hours: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimesheetUpdate(BaseModel):
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str
    resource: str
    resource_id: str
    details: dict = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    timesheet_id: str
    timesheet_date: str
    original_clock_in: Optional[str] = None
    original_clock_out: Optional[str] = None
    requested_clock_in: Optional[str] = None
    requested_clock_out: Optional[str] = None
    reason: str
    status: CorrectionStatus = CorrectionStatus.PENDING
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRequestCreate(BaseModel):
    timesheet_id: str
    requested_clock_in: Optional[str] = None
    requested_clock_out: Optional[str] = None
    reason: str


class CorrectionRequestUpdate(BaseModel):
    status: CorrectionStatus
    admin_notes: Optional[str] = None


class Break(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timesheet_id: str
    date: str
    start_time: str
    end_time: Optional[str] = None
    duration_minutes: int = 0
    break_type: str = "REGULAR"
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BreakCreate(BaseModel):
    break_type: str = "REGULAR"
    notes: str = ""


class BreakResponse(BaseModel):
    id: str
    user_id: str
    timesheet_id: str
    date: str
    start_time: str
    end_time: Optional[str] = None
    duration_minutes: int = 0
    break_type: str
    notes: str


class DailyBreakSummary(BaseModel):
    date: str
    total_break_minutes: int
    break_count: int
    breaks: List[BreakResponse]
    status: BreakStatus


class WeeklyProgressResponse(BaseModel):
    week_start: str
    week_end: str
    total_hours: float
    daily_hours: dict
    target_hours: float = 40.0
    overtime_hours: float = 0.0
    days_worked: int
    on_track: bool


class ClockInRequest(BaseModel):
    notes: str = ""


class ClockOutRequest(BaseModel):
    notes: str = ""
