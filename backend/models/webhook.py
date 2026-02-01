"""
Webhook Models
Webhook configuration and delivery tracking models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
from enum import Enum
import uuid


class WebhookEventType(str, Enum):
    """Types of webhook events"""
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DEACTIVATED = "user.deactivated"
    TIMESHEET_CLOCKED_IN = "timesheet.clocked_in"
    TIMESHEET_CLOCKED_OUT = "timesheet.clocked_out"
    TICKET_CREATED = "ticket.created"
    TICKET_UPDATED = "ticket.updated"
    TICKET_RESOLVED = "ticket.resolved"
    LEAVE_REQUESTED = "leave.requested"
    LEAVE_APPROVED = "leave.approved"
    LEAVE_DENIED = "leave.denied"
    ANNOUNCEMENT_CREATED = "announcement.created"


class WebhookConfig(BaseModel):
    """Webhook configuration for a tenant"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    name: str
    url: str
    secret: str = Field(default_factory=lambda: str(uuid.uuid4()))
    events: List[str]  # List of WebhookEventType values
    is_active: bool = True
    headers: Optional[Dict[str, str]] = None  # Custom headers
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_triggered_at: Optional[datetime] = None
    failure_count: int = 0


class WebhookDelivery(BaseModel):
    """Record of a webhook delivery attempt"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_id: str
    tenant_id: str
    event_type: str
    payload: dict
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    success: bool = False
    error_message: Optional[str] = None
    delivered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WebhookCreate(BaseModel):
    """Request model for creating a webhook"""
    name: str
    url: str
    events: List[str]
    headers: Optional[Dict[str, str]] = None


class WebhookUpdate(BaseModel):
    """Request model for updating a webhook"""
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    headers: Optional[Dict[str, str]] = None


class WebhookResponse(BaseModel):
    """Response model for webhooks"""
    id: str
    tenant_id: str
    name: str
    url: str
    events: List[str]
    is_active: bool
    headers: Optional[Dict[str, str]] = None
    created_at: datetime
    last_triggered_at: Optional[datetime] = None
    failure_count: int


class WebhookDeliveryResponse(BaseModel):
    """Response model for webhook deliveries"""
    id: str
    webhook_id: str
    event_type: str
    payload: dict
    response_status: Optional[int] = None
    success: bool
    error_message: Optional[str] = None
    delivered_at: datetime
