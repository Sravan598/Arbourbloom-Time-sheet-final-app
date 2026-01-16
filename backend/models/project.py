from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from .enums import ProjectStatus


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    status: ProjectStatus = ProjectStatus.ACTIVE
    assigned_employees: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    assigned_employees: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    estimated_hours: float = 0.0


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    assigned_employees: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    estimated_hours: Optional[float] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    status: ProjectStatus
    assigned_employees: List[str]
    employee_names: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    estimated_hours: float
    actual_hours: float
    created_by: str
    created_at: datetime


class TimeEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    project_id: str
    date: str
    start_time: str
    end_time: Optional[str] = None
    duration_minutes: int = 0
    description: str = ""
    is_billable: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimeEntryCreate(BaseModel):
    project_id: str
    date: str
    start_time: str
    end_time: Optional[str] = None
    description: str = ""
    is_billable: bool = True


class TimeEntryResponse(BaseModel):
    id: str
    user_id: str
    project_id: str
    project_name: str = ""
    date: str
    start_time: str
    end_time: Optional[str] = None
    duration_minutes: int
    description: str
    is_billable: bool


class ProjectTimeSummary(BaseModel):
    project_id: str
    project_name: str
    total_minutes: int
    total_hours: float
    entry_count: int
    is_active: bool = False
