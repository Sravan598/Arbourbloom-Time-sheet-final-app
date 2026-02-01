"""
Security Models
Security audit logging and related models
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class AuditEventType(str, Enum):
    """Types of audit events for security monitoring"""
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    CROSS_TENANT_ATTEMPT = "CROSS_TENANT_ATTEMPT"
    DATA_ACCESS = "DATA_ACCESS"
    DATA_MODIFY = "DATA_MODIFY"
    DATA_DELETE = "DATA_DELETE"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    ADMIN_ACTION = "ADMIN_ACTION"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    USER_CREATED = "USER_CREATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"


class SecurityAuditLog(BaseModel):
    """Security audit log entry for monitoring"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    event_type: AuditEventType
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource_type: Optional[str] = None  # e.g., "timesheet", "ticket", "user"
    resource_id: Optional[str] = None
    details: Optional[dict] = None  # Additional context
    severity: str = "INFO"  # INFO, WARNING, CRITICAL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditLogResponse(BaseModel):
    """Response model for audit logs"""
    id: str
    tenant_id: str
    event_type: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    severity: str
    created_at: datetime
