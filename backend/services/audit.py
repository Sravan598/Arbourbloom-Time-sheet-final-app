"""
Security Audit Logging Service
Track security-related events for compliance and monitoring
"""
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import uuid
from database import db

logger = logging.getLogger(__name__)


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
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    severity: str = "INFO"  # INFO, WARNING, CRITICAL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


async def log_audit_event(
    event_type: AuditEventType,
    tenant_id: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    severity: str = "INFO"
):
    """Log an audit event to the database"""
    try:
        audit_log = SecurityAuditLog(
            tenant_id=tenant_id,
            event_type=event_type,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            severity=severity
        )
        
        doc = audit_log.model_dump()
        doc["event_type"] = doc["event_type"].value
        doc["created_at"] = doc["created_at"].isoformat()
        
        # Use separate collection for security audit logs
        await db.security_audit_logs.insert_one(doc)
        
        # Log critical events to server logs as well
        if severity == "CRITICAL":
            logger.warning(f"🚨 CRITICAL AUDIT: {event_type.value} - Tenant: {tenant_id}, User: {user_email}, Details: {details}")
        elif severity == "WARNING":
            logger.info(f"⚠️ AUDIT WARNING: {event_type.value} - Tenant: {tenant_id}, User: {user_email}")
            
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
