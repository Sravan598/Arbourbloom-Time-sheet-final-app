from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class Holiday(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    date: str  # YYYY-MM-DD
    is_recurring: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HolidayCreate(BaseModel):
    name: str
    date: str
    is_recurring: bool = False


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    is_recurring: Optional[bool] = None


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str  # ISO datetime
    end: str  # ISO datetime
    type: str  # holiday, leave, birthday, project_deadline, anniversary
    color: str
    all_day: bool = True
    user_id: Optional[str] = None
    user_name: Optional[str] = None
