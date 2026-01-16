from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from .enums import TicketCategory, TicketPriority, TicketStatus


class TicketAttachment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Ticket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str  # e.g., TKT-2024-001
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus = TicketStatus.OPEN
    
    # Creator info
    created_by: str
    creator_name: str
    creator_email: str
    creator_image: Optional[str] = None
    
    # Assignment
    assigned_to: List[str] = []  # List of admin IDs
    assigned_names: List[str] = []
    
    # SLA tracking
    sla_due_at: Optional[datetime] = None
    sla_breached: bool = False
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    # File attachments
    attachments: List[dict] = []  # List of TicketAttachment dicts
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    user_role: str  # ADMIN or EMPLOYEE
    content: str
    attachments: List[dict] = []  # List of attachment dicts
    is_internal: bool = False  # True for admin-only notes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketCreate(BaseModel):
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[List[str]] = None
    category: Optional[TicketCategory] = None


class TicketCommentCreate(BaseModel):
    content: str
    is_internal: bool = False


class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    created_by: str
    creator_name: str
    creator_email: str
    creator_image: Optional[str] = None
    assigned_to: List[str]
    assigned_names: List[str]
    sla_due_at: Optional[datetime]
    sla_breached: bool
    first_response_at: Optional[datetime]
    resolved_at: Optional[datetime]
    attachments: List[dict]
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime


class TicketCommentResponse(BaseModel):
    id: str
    ticket_id: str
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    user_role: str
    content: str
    attachments: List[dict]
    is_internal: bool
    created_at: datetime
