from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from .enums import AnnouncementPriority


class Announcement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    author_id: str
    author_name: str
    target_roles: List[str] = ["ADMIN", "EMPLOYEE"]
    target_departments: List[str] = []
    is_pinned: bool = False
    expires_at: Optional[datetime] = None
    read_by: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    target_roles: List[str] = ["ADMIN", "EMPLOYEE"]
    target_departments: List[str] = []
    is_pinned: bool = False
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[AnnouncementPriority] = None
    target_roles: Optional[List[str]] = None
    target_departments: Optional[List[str]] = None
    is_pinned: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    priority: AnnouncementPriority
    author_id: str
    author_name: str
    author_image: Optional[str] = None
    target_roles: List[str]
    target_departments: List[str]
    is_pinned: bool
    expires_at: Optional[datetime] = None
    is_read: bool = False
    read_count: int = 0
    created_at: datetime
    updated_at: datetime
