from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class NotificationPreferences(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    announcement_alerts: bool = True
    leave_request_alerts: bool = True
    timesheet_alerts: bool = True


class EmergencyContact(BaseModel):
    name: str = ""
    relationship: str = ""
    phone: str = ""
    email: str = ""


class UserBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "EMPLOYEE"
    is_active: bool = True
    department: str = ""
    position: str = ""
    phone: str = ""
    address: str = ""
    emergency_contact: Optional[EmergencyContact] = None
    profile_image: Optional[str] = None
    hire_date: Optional[str] = None
    birthday: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None
    # Work info (set by admin)
    employee_id: Optional[str] = None
    pay_rate: Optional[float] = None
    employment_type: str = "FULL_TIME"
    work_schedule: str = "STANDARD"
    assigned_projects: List[str] = []
    manager_id: Optional[str] = None
    # Calendar integration
    calendar_token: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "EMPLOYEE"
    admin_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    department: str = ""
    position: str = ""
    phone: str = ""
    address: str = ""
    emergency_contact: Optional[EmergencyContact] = None
    profile_image: Optional[str] = None
    hire_date: Optional[str] = None
    birthday: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None
    employee_id: Optional[str] = None
    pay_rate: Optional[float] = None
    employment_type: str = "FULL_TIME"
    work_schedule: str = "STANDARD"
    assigned_projects: List[str] = []
    manager_id: Optional[str] = None
    created_at: Optional[datetime] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    birthday: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None


class AdminProfileUpdate(BaseModel):
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    pay_rate: Optional[float] = None
    employment_type: Optional[str] = None
    work_schedule: Optional[str] = None
    hire_date: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    token: str
    user: UserResponse
