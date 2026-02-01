"""
SSL Certificate Models
Custom domain SSL certificate tracking models
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class DomainSSLStatus(str, Enum):
    """SSL certificate status for custom domains"""
    PENDING = "pending"
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    FAILED = "failed"
    EXPIRED = "expired"


class CustomDomainSSL(BaseModel):
    """SSL certificate tracking for custom domains"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    domain: str
    ssl_status: DomainSSLStatus = DomainSSLStatus.PENDING
    certificate_provider: str = "lets_encrypt"  # For future implementation
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_checked_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SSLCertificateResponse(BaseModel):
    """Response model for SSL certificate status"""
    status: str
    domain: str
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_checked_at: Optional[datetime] = None
    error_message: Optional[str] = None
    message: Optional[str] = None
    instructions: Optional[list] = None
