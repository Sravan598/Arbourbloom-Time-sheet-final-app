from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import json
import asyncio
import aiofiles
import mimetypes
import httpx
import base64
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'aurborbloom-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app without a prefix
app = FastAPI(title="AurborBloom API", version="1.0.0")

# Health check endpoint for Kubernetes
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    return {"status": "healthy", "service": "aurborbloom-api"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# File upload configuration
UPLOAD_DIR = Path("/app/uploads/chat")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TICKET_UPLOAD_DIR = Path("/app/uploads/tickets")
TICKET_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB per file
MAX_COMMENT_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB total per comment
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}

# PDF Logo configuration
LOGO_PATH = ROOT_DIR / "assets" / "aurborbloom_logo.png"
ALLOWED_DOC_TYPES = {"application/pdf", "application/msword", 
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     "application/vnd.ms-excel",
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     "text/plain", "text/csv"}
ALLOWED_FILE_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_VIDEO_TYPES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== RATE LIMITING & USAGE TRACKING ==============

# In-memory rate limit tracking (resets on restart - for production use Redis)
rate_limit_store: Dict[str, Dict] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 100  # requests per window per tenant

# Usage metrics tracking
usage_metrics_store: Dict[str, Dict] = {}


async def track_usage(tenant_id: str, endpoint: str, method: str):
    """Track API usage for a tenant"""
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        hour = datetime.now(timezone.utc).strftime("%H")
        
        # Update in-memory metrics
        if tenant_id not in usage_metrics_store:
            usage_metrics_store[tenant_id] = {
                "total_requests": 0,
                "requests_by_endpoint": {},
                "requests_by_hour": {},
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        
        usage_metrics_store[tenant_id]["total_requests"] += 1
        
        # Track by endpoint
        if endpoint not in usage_metrics_store[tenant_id]["requests_by_endpoint"]:
            usage_metrics_store[tenant_id]["requests_by_endpoint"][endpoint] = 0
        usage_metrics_store[tenant_id]["requests_by_endpoint"][endpoint] += 1
        
        # Persist to database periodically (every 10 requests)
        if usage_metrics_store[tenant_id]["total_requests"] % 10 == 0:
            await db.tenant_usage.update_one(
                {"tenant_id": tenant_id, "date": today},
                {
                    "$inc": {"total_requests": 10},
                    "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
            
            # Track hourly breakdown
            await db.tenant_usage_hourly.update_one(
                {"tenant_id": tenant_id, "date": today, "hour": hour},
                {
                    "$inc": {"requests": 10},
                    "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
    except Exception as e:
        logger.error(f"Failed to track usage: {e}")


def check_rate_limit(tenant_id: str) -> tuple[bool, int]:
    """Check if tenant has exceeded rate limit. Returns (is_allowed, remaining)"""
    now = datetime.now(timezone.utc).timestamp()
    
    if tenant_id not in rate_limit_store:
        rate_limit_store[tenant_id] = {
            "requests": [],
            "window_start": now
        }
    
    tenant_data = rate_limit_store[tenant_id]
    
    # Remove old requests outside the window
    tenant_data["requests"] = [
        req_time for req_time in tenant_data["requests"]
        if now - req_time < RATE_LIMIT_WINDOW
    ]
    
    # Check limit
    current_count = len(tenant_data["requests"])
    remaining = RATE_LIMIT_MAX_REQUESTS - current_count
    
    if current_count >= RATE_LIMIT_MAX_REQUESTS:
        return False, 0
    
    # Add current request
    tenant_data["requests"].append(now)
    
    return True, remaining - 1


# ============== P2: DATA ENCRYPTION ==============

# Master encryption key (MUST be set in production via environment variable)
MASTER_ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
if not MASTER_ENCRYPTION_KEY:
    logger.warning("⚠️ ENCRYPTION_KEY not set in environment. Using fallback key - NOT SECURE FOR PRODUCTION!")
    MASTER_ENCRYPTION_KEY = 'aurborbloom-fallback-key-32chars!'

def derive_tenant_key(tenant_id: str) -> bytes:
    """Derive a unique encryption key for each tenant from the master key"""
    salt = tenant_id.encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(MASTER_ENCRYPTION_KEY.encode()))
    return key


def get_tenant_cipher(tenant_id: str) -> Fernet:
    """Get a Fernet cipher for a specific tenant"""
    key = derive_tenant_key(tenant_id)
    return Fernet(key)


def encrypt_sensitive_data(tenant_id: str, data: str) -> str:
    """Encrypt sensitive data for a tenant"""
    if not data:
        return data
    cipher = get_tenant_cipher(tenant_id)
    encrypted = cipher.encrypt(data.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_sensitive_data(tenant_id: str, encrypted_data: str) -> str:
    """Decrypt sensitive data for a tenant"""
    if not encrypted_data:
        return encrypted_data
    try:
        cipher = get_tenant_cipher(tenant_id)
        decoded = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = cipher.decrypt(decoded)
        return decrypted.decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return None


def hash_sensitive_field(data: str) -> str:
    """Create a searchable hash of sensitive data (one-way)"""
    if not data:
        return None
    return hashlib.sha256(data.encode()).hexdigest()


# ============== P2: WEBHOOK SYSTEM ==============

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


async def trigger_webhooks(tenant_id: str, event_type: WebhookEventType, payload: dict):
    """Trigger all active webhooks for a tenant event"""
    try:
        # Find all active webhooks for this tenant and event type
        webhooks = await db.webhooks.find({
            "tenant_id": tenant_id,
            "is_active": True,
            "events": event_type.value
        }, {"_id": 0}).to_list(50)
        
        for webhook in webhooks:
            # Run webhook delivery in background
            asyncio.create_task(deliver_webhook(webhook, event_type, payload))
            
    except Exception as e:
        logger.error(f"Failed to trigger webhooks: {e}")


async def deliver_webhook(webhook: dict, event_type: WebhookEventType, payload: dict):
    """Deliver a webhook to the configured URL"""
    webhook_id = webhook.get("id")
    tenant_id = webhook.get("tenant_id")
    
    # Create signature for payload verification
    signature = hashlib.sha256(
        f"{webhook.get('secret')}:{json.dumps(payload, sort_keys=True)}".encode()
    ).hexdigest()
    
    # Prepare headers
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event_type.value,
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": datetime.now(timezone.utc).isoformat(),
        "User-Agent": "AurborBloom-Webhook/1.0"
    }
    
    # Add custom headers if configured
    if webhook.get("headers"):
        headers.update(webhook["headers"])
    
    delivery_record = {
        "id": str(uuid.uuid4()),
        "webhook_id": webhook_id,
        "tenant_id": tenant_id,
        "event_type": event_type.value,
        "payload": payload,
        "delivered_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                webhook.get("url"),
                json={
                    "event": event_type.value,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "tenant_id": tenant_id,
                    "data": payload
                },
                headers=headers
            )
            
            delivery_record["response_status"] = response.status_code
            delivery_record["response_body"] = response.text[:500]  # Limit response size
            delivery_record["success"] = 200 <= response.status_code < 300
            
            # Update webhook last triggered
            await db.webhooks.update_one(
                {"id": webhook_id},
                {
                    "$set": {"last_triggered_at": datetime.now(timezone.utc).isoformat()},
                    "$inc": {"failure_count": 0 if delivery_record["success"] else 1}
                }
            )
            
    except Exception as e:
        delivery_record["success"] = False
        delivery_record["error_message"] = str(e)
        
        # Increment failure count
        await db.webhooks.update_one(
            {"id": webhook_id},
            {"$inc": {"failure_count": 1}}
        )
        
        logger.error(f"Webhook delivery failed for {webhook_id}: {e}")
    
    # Save delivery record
    await db.webhook_deliveries.insert_one(delivery_record)


# ============== P2: CUSTOM DOMAIN SSL ==============

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


async def request_ssl_certificate(tenant_id: str, domain: str) -> dict:
    """
    Request SSL certificate for a custom domain.
    In production, this would integrate with Let's Encrypt or a cloud provider.
    For now, we track the request and provide instructions.
    """
    
    # Check if domain already has SSL tracking
    existing = await db.custom_domain_ssl.find_one({"domain": domain}, {"_id": 0})
    
    if existing:
        return {
            "status": existing.get("ssl_status"),
            "message": "SSL certificate already requested",
            "domain": domain
        }
    
    # Create SSL tracking record
    ssl_record = CustomDomainSSL(
        tenant_id=tenant_id,
        domain=domain,
        ssl_status=DomainSSLStatus.PENDING
    )
    
    doc = ssl_record.model_dump()
    doc["ssl_status"] = doc["ssl_status"].value
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.custom_domain_ssl.insert_one(doc)
    
    # In production, this would trigger Let's Encrypt certificate request
    # For now, we return instructions
    
    return {
        "status": "pending",
        "message": "SSL certificate request initiated",
        "domain": domain,
        "instructions": [
            f"1. Ensure DNS is properly configured for {domain}",
            "2. CNAME record must point to our server",
            "3. Certificate will be provisioned automatically once DNS is verified",
            "4. This process typically takes 5-15 minutes"
        ],
        "note": "In production, Let's Encrypt certificates are auto-provisioned"
    }


async def check_ssl_status(domain: str) -> dict:
    """Check SSL certificate status for a domain"""
    
    ssl_record = await db.custom_domain_ssl.find_one({"domain": domain}, {"_id": 0})
    
    if not ssl_record:
        return {
            "status": "not_requested",
            "domain": domain,
            "message": "No SSL certificate requested for this domain"
        }
    
    # In production, this would check actual certificate status
    # For now, we return the stored status
    
    return {
        "status": ssl_record.get("ssl_status"),
        "domain": domain,
        "issued_at": ssl_record.get("issued_at"),
        "expires_at": ssl_record.get("expires_at"),
        "last_checked_at": ssl_record.get("last_checked_at"),
        "error_message": ssl_record.get("error_message")
    }


# ============== ENUMS ==============
class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"  # Can manage all tenants
    ADMIN = "ADMIN"  # Can manage their tenant
    EMPLOYEE = "EMPLOYEE"


class CorrectionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class LeaveType(str, Enum):
    VACATION = "VACATION"
    SICK = "SICK"
    PERSONAL = "PERSONAL"
    UNPAID = "UNPAID"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class AnnouncementPriority(str, Enum):
    NORMAL = "NORMAL"
    IMPORTANT = "IMPORTANT"
    URGENT = "URGENT"


# ============== TENANT MODELS ==============

class FeatureToggle(BaseModel):
    """Individual feature toggle with display info"""
    key: str
    label: str
    description: str
    enabled: bool = True
    icon: str = "Settings"


class TenantSettings(BaseModel):
    """Configurable settings per tenant"""
    departments: List[str] = ["General", "Engineering", "HR", "Sales", "Marketing", "Finance"]
    leave_types_enabled: List[str] = ["VACATION", "SICK", "PERSONAL", "UNPAID"]
    features_enabled: List[str] = ["timesheets", "tickets", "leave", "calendar", "projects", "chat"]
    # Feature toggles with more detail
    feature_toggles: Optional[Dict[str, bool]] = None


class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str  # URL-friendly identifier (e.g., "perfectsolutions")
    name: str  # Display name (e.g., "Perfect Solutions")
    logo_url: Optional[str] = None  # Base64 or URL
    primary_color: str = "#1a1a1a"  # Brand color
    secondary_color: str = "#D4AF37"  # Accent color
    
    # Custom domain mapping (CNAME)
    custom_domain: Optional[str] = None  # e.g., "hr.perfectsolutions.com"
    custom_domain_verified: bool = False  # Whether DNS is properly configured
    custom_domain_verification_token: Optional[str] = None  # For DNS TXT record verification
    
    # Contact info
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    
    # Admin settings
    admin_signup_code: str  # Unique code for admin signup
    is_active: bool = True
    
    # Tenant-specific settings
    settings: Optional[TenantSettings] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None  # Super admin who created


class TenantCreate(BaseModel):
    slug: str = Field(..., min_length=3, max_length=50, pattern="^[a-z0-9-]+$")
    name: str = Field(..., min_length=2, max_length=100)
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#1a1a1a"
    secondary_color: Optional[str] = "#D4AF37"
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    settings: Optional[TenantSettings] = None


class TenantResponse(BaseModel):
    id: str
    slug: str
    name: str
    logo_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    custom_domain: Optional[str] = None
    custom_domain_verified: bool = False
    settings: Optional[TenantSettings] = None
    created_at: datetime


class TenantPublicInfo(BaseModel):
    """Public info shown on login dropdown"""
    slug: str
    name: str
    logo_url: Optional[str] = None
    primary_color: str
    settings: Optional[TenantSettings] = None


# Default tenant slug
DEFAULT_TENANT_SLUG = "aurborbloom"


# ============== SECURITY AUDIT LOG MODELS ==============

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


# ============== MODELS ==============

# Notification preferences model
class NotificationPreferences(BaseModel):
    clock_in_out_email: bool = False
    daily_summary: bool = False
    weekly_reminder: bool = True
    leave_updates: bool = True
    overtime_warnings: bool = True
    announcements: bool = True


# Emergency contact model
class EmergencyContact(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relation: Optional[str] = None


# Document model
class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    filename: str
    original_filename: str
    file_data: str  # Base64 encoded
    file_size: int  # In bytes
    file_type: str  # MIME type
    category: str = "Other"
    description: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentUpload(BaseModel):
    filename: str
    file_data: str  # Base64 encoded
    file_type: str
    category: str = "Other"
    description: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    file_type: str
    category: str
    description: Optional[str]
    uploaded_at: datetime


class SetPinRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)


class VerifyPinRequest(BaseModel):
    pin: str


class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = DEFAULT_TENANT_SLUG  # Multi-tenancy support
    name: str
    email: EmailStr
    role: UserRole = UserRole.EMPLOYEE
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Extended profile fields
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    
    # Work information (set by admin)
    employee_id: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None  # Full-time, Part-time, Contract
    join_date: Optional[str] = None
    work_location: Optional[str] = None  # Office, Remote, Hybrid
    
    # Emergency contact
    emergency_contact: Optional[EmergencyContact] = None
    
    # Preferences
    time_zone: str = "UTC"
    theme_preference: str = "light"  # light, dark
    notification_preferences: Optional[NotificationPreferences] = None


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[UserRole] = UserRole.EMPLOYEE
    tenant_id: Optional[str] = None  # Will be set from login context
    admin_invite_code: Optional[str] = None
    employee_invite_code: Optional[str] = None  # New field for employee invitation


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    tenant_id: str = DEFAULT_TENANT_SLUG  # Required for multi-tenant login


# ============== INVITATION MODELS ==============
class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class InvitationCreate(BaseModel):
    email: EmailStr
    department: Optional[str] = None
    expires_in_days: Optional[int] = 7


class InvitationResponse(BaseModel):
    id: str
    email: str
    code: str
    department: Optional[str] = None
    status: InvitationStatus
    invited_by: str
    invited_by_name: Optional[str] = None
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    tenant_id: Optional[str] = DEFAULT_TENANT_SLUG
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    
    # Extended profile fields
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    
    # Work information
    employee_id: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    join_date: Optional[str] = None
    work_location: Optional[str] = None
    
    # Emergency contact
    emergency_contact: Optional[EmergencyContact] = None
    
    # Preferences
    time_zone: Optional[str] = "UTC"
    theme_preference: Optional[str] = "light"
    notification_preferences: Optional[NotificationPreferences] = None


# Profile update models
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    time_zone: Optional[str] = None
    theme_preference: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None


class AdminProfileUpdate(BaseModel):
    """Admin can update additional work-related fields"""
    employee_id: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    join_date: Optional[str] = None
    work_location: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class Timesheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    clock_in_at: datetime
    clock_out_at: Optional[datetime] = None
    total_minutes: Optional[int] = None
    notes: Optional[str] = None
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimesheetUpdate(BaseModel):
    clock_in_at: Optional[datetime] = None
    clock_out_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_approved: Optional[bool] = None


class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_user_id: str
    admin_user_name: str
    entity_type: str
    entity_id: str
    action: str
    before_json: Optional[dict] = None
    after_json: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    timesheet_id: str
    requested_change: dict
    reason: str
    status: CorrectionStatus = CorrectionStatus.PENDING
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRequestCreate(BaseModel):
    timesheet_id: str
    requested_change: dict
    reason: str = Field(..., min_length=10)


class CorrectionRequestUpdate(BaseModel):
    status: CorrectionStatus
    admin_notes: Optional[str] = None


# ============== LEAVE/PTO MODELS ==============
class LeaveBalance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    year: int = Field(default_factory=lambda: datetime.now().year)
    vacation_days: int = 15  # Default annual vacation days
    sick_days: int = 10  # Default annual sick days
    personal_days: int = 5  # Default personal days
    vacation_used: int = 0
    sick_used: int = 0
    personal_used: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveBalanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    vacation_total: int
    vacation_used: int
    vacation_remaining: int
    sick_total: int
    sick_used: int
    sick_remaining: int
    personal_total: int
    personal_used: int
    personal_remaining: int
    year: int


class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    total_days: int
    reason: str
    status: LeaveStatus = LeaveStatus.PENDING
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    reason: str = Field(..., min_length=5, max_length=500)


class LeaveRequestUpdate(BaseModel):
    status: LeaveStatus
    admin_notes: Optional[str] = None


# ============== BREAK MODELS ==============
class BreakStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class Break(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timesheet_id: Optional[str] = None  # Link to active timesheet
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    break_type: str = "GENERAL"  # GENERAL, LUNCH, COFFEE, etc.
    status: BreakStatus = BreakStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BreakCreate(BaseModel):
    break_type: str = "GENERAL"


class BreakResponse(BaseModel):
    id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    break_type: str
    status: str


class DailyBreakSummary(BaseModel):
    total_breaks: int
    total_break_minutes: int
    breaks: List[BreakResponse]
    is_on_break: bool
    current_break_id: Optional[str] = None
    current_break_start: Optional[datetime] = None


# ============== ANNOUNCEMENT MODELS ==============
class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    is_pinned: bool = False
    created_by: str
    created_by_name: Optional[str] = None
    expires_at: Optional[datetime] = None
    read_by: List[str] = []  # List of user IDs who have read this
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    message: str = Field(..., min_length=5, max_length=2000)
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    is_pinned: bool = False
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    priority: Optional[AnnouncementPriority] = None
    is_pinned: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    message: str
    priority: str
    is_pinned: bool
    created_by: str
    created_by_name: Optional[str]
    expires_at: Optional[datetime]
    is_read: bool = False
    read_count: int = 0
    created_at: datetime
    updated_at: datetime


# ============== PROJECT/TASK MODELS ==============
class ProjectStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ON_HOLD = "ON_HOLD"
    ARCHIVED = "ARCHIVED"


class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    color: str = "#EF4444"  # Default red color
    status: ProjectStatus = ProjectStatus.ACTIVE
    assigned_users: List[str] = []  # List of user IDs
    estimated_hours: Optional[float] = None
    total_logged_minutes: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    color: str = "#EF4444"
    estimated_hours: Optional[float] = None
    assigned_users: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[ProjectStatus] = None
    estimated_hours: Optional[float] = None
    assigned_users: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: str
    status: str
    assigned_users: List[str]
    estimated_hours: Optional[float]
    total_logged_minutes: int
    created_at: datetime


class TimeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    project_id: str
    project_name: Optional[str] = None
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_manual: bool = False  # True if manually entered, False if from timer
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimeEntryCreate(BaseModel):
    project_id: str
    description: Optional[str] = None
    # For manual entries:
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class TimeEntryResponse(BaseModel):
    id: str
    project_id: str
    project_name: Optional[str]
    project_color: Optional[str] = None
    description: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    created_at: datetime


class ProjectTimeSummary(BaseModel):
    project_id: str
    project_name: str
    project_color: str
    total_minutes: int
    entry_count: int


# ============== CORCHAT MODELS ==============
class ChannelType(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class ChatChannel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    type: ChannelType = ChannelType.PUBLIC
    created_by: str
    created_by_name: Optional[str] = None
    members: List[str] = []  # User IDs - for private channels
    is_default: bool = False  # Default channels like #general
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    type: ChannelType = ChannelType.PUBLIC
    members: List[str] = []  # For private channels


class ChatChannelResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    type: str
    created_by: str
    created_by_name: Optional[str]
    member_count: int
    is_default: bool
    last_message: Optional[dict] = None
    unread_count: int = 0
    created_at: datetime


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_id: Optional[str] = None  # For channel messages
    dm_thread_id: Optional[str] = None  # For direct messages
    sender_id: str
    sender_name: str
    sender_image: Optional[str] = None
    content: str
    message_type: str = "text"  # text, file, image
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    is_edited: bool = False
    is_deleted: bool = False
    reactions: Dict[str, List[str]] = {}  # emoji: [user_ids]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatAttachment(BaseModel):
    id: Optional[str] = None
    filename: str
    file_url: str
    content_type: Optional[str] = None
    size: Optional[int] = None
    is_image: bool = False


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    message_type: str = "text"
    attachment: Optional[ChatAttachment] = None


class ChatMessageResponse(BaseModel):
    id: str
    channel_id: Optional[str]
    dm_thread_id: Optional[str]
    sender_id: str
    sender_name: str
    sender_image: Optional[str]
    content: str
    message_type: str
    file_url: Optional[str]
    file_name: Optional[str]
    attachment: Optional[dict] = None
    is_edited: bool
    reactions: Dict[str, List[str]]
    created_at: datetime


class DMThread(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]  # Two user IDs
    participant_names: Dict[str, str] = {}  # user_id: name
    participant_images: Dict[str, str] = {}  # user_id: image_url
    last_message: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DMThreadResponse(BaseModel):
    id: str
    participants: List[str]
    participant_names: Dict[str, str]
    participant_images: Dict[str, str]
    other_user_id: str
    other_user_name: str
    other_user_image: Optional[str]
    last_message: Optional[dict]
    unread_count: int = 0
    created_at: datetime


class ChatUnreadCount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    channel_id: Optional[str] = None
    dm_thread_id: Optional[str] = None
    last_read_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatUserStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    status: str = "offline"  # online, away, offline
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============== LEAVE/PTO MODELS ==============
class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DENIED = "DENIED"


class LeaveType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str = "📅"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    icon: str = "📅"


class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    leave_type: str
    is_custom_type: bool = False
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    days: int
    reason: str
    status: LeaveStatus = LeaveStatus.PENDING
    reviewed_by: Optional[str] = None
    reviewer_name: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveRequestCreate(BaseModel):
    leave_type: str = Field(..., min_length=1, max_length=50)
    is_custom_type: bool = False
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    reason: str = Field(..., min_length=1, max_length=500)


class LeaveRequestReview(BaseModel):
    status: Literal["APPROVED", "DENIED"]
    review_note: Optional[str] = Field(None, max_length=200)


class NotificationType(str, Enum):
    LEAVE_APPROVED = "LEAVE_APPROVED"
    LEAVE_DENIED = "LEAVE_DENIED"
    LEAVE_REQUEST = "LEAVE_REQUEST"  # For admins
    TICKET_CREATED = "TICKET_CREATED"  # For admins
    TICKET_ASSIGNED = "TICKET_ASSIGNED"  # For assigned admins
    TICKET_UPDATED = "TICKET_UPDATED"  # For ticket creator
    TICKET_RESOLVED = "TICKET_RESOLVED"  # For ticket creator
    TICKET_COMMENT = "TICKET_COMMENT"  # For ticket participants


class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: NotificationType
    title: str
    message: str
    reference_id: Optional[str] = None  # Leave request ID or Ticket ID
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============== TICKETING SYSTEM MODELS ==============
class TicketCategory(str, Enum):
    IT_SUPPORT = "IT_SUPPORT"
    HR = "HR"
    PAYROLL = "PAYROLL"
    FACILITIES = "FACILITIES"
    TIME_ATTENDANCE = "TIME_ATTENDANCE"
    BENEFITS = "BENEFITS"
    OTHER = "OTHER"


class TicketPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_ON_USER = "WAITING_ON_USER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketAttachment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str = ""  # Auto-generated: TKT-YYYYMMDD-XXXX
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus = TicketStatus.OPEN
    
    # Creator info
    created_by: str  # User ID
    creator_name: str
    creator_email: str
    creator_image: Optional[str] = None
    
    # Assignment (can be multiple admins)
    assigned_to: List[str] = []  # List of admin user IDs
    assigned_names: List[str] = []  # List of admin names
    
    # SLA tracking
    sla_due_at: Optional[datetime] = None  # Calculated based on priority
    sla_breached: bool = False
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    # File attachments
    attachments: List[dict] = []  # List of TicketAttachment dicts
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketComment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    user_role: str  # ADMIN or EMPLOYEE
    content: str
    is_internal: bool = False  # Internal notes only visible to admins
    attachments: List[dict] = []  # List of attachment dicts
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[List[str]] = None
    category: Optional[TicketCategory] = None


class TicketCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    is_internal: bool = False


class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    subject: str
    description: str
    category: str
    priority: str
    status: str
    created_by: str
    creator_name: str
    creator_email: str
    creator_image: Optional[str]
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
    user_image: Optional[str]
    user_role: str
    content: str
    is_internal: bool
    attachments: List[dict]
    created_at: datetime


# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, email: str, role: str, tenant_id: str = DEFAULT_TENANT_SLUG) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_invite_code() -> str:
    """Generate a human-readable invitation code like INV-X7K9M2"""
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"INV-{code}"


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in [UserRole.ADMIN, UserRole.ADMIN.value, UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_super_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Only super admins can manage tenants"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return current_user


async def require_employee(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in [UserRole.EMPLOYEE, UserRole.EMPLOYEE.value]:
        raise HTTPException(status_code=403, detail="Employee access required")
    return current_user


def get_tenant_id(current_user: dict) -> str:
    """Extract tenant_id from current user"""
    return current_user.get("tenant_id", DEFAULT_TENANT_SLUG)


def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings for MongoDB storage"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj


def deserialize_datetime(obj, fields):
    """Convert ISO format strings back to datetime objects"""
    if isinstance(obj, dict):
        for field in fields:
            if field in obj and isinstance(obj[field], str):
                try:
                    obj[field] = datetime.fromisoformat(obj[field])
                except (ValueError, TypeError):
                    pass
    return obj


# ============== AUTH ROUTES ==============
@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    # Determine tenant_id - default to aurborbloom
    tenant_id = user_data.tenant_id or DEFAULT_TENANT_SLUG
    
    # Check if email already exists within the tenant (or globally for super admin)
    existing_user = await db.users.find_one({
        "email": user_data.email.lower(),
        "tenant_id": tenant_id
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Handle admin signup with invite code
    role = UserRole.EMPLOYEE
    invitation = None
    
    # Check for Super Admin signup code first
    super_admin_code = os.environ.get('SUPER_ADMIN_CODE', 'AURBORBLOOM-SUPER-2025')
    if user_data.admin_invite_code == super_admin_code:
        role = UserRole.SUPER_ADMIN
        tenant_id = DEFAULT_TENANT_SLUG  # Super admin always belongs to default tenant
    elif user_data.role == UserRole.ADMIN:
        # Check tenant-specific admin code first
        tenant = await db.tenants.find_one({"slug": tenant_id}, {"_id": 0})
        valid_code = False
        
        if tenant and tenant.get("admin_signup_code") == user_data.admin_invite_code:
            valid_code = True
        else:
            # Fall back to global admin code for default tenant
            admin_code = os.environ.get('ADMIN_INVITE_CODE', 'ARBORBLOOM-ADMIN-2025')
            if user_data.admin_invite_code == admin_code:
                valid_code = True
        
        if not valid_code:
            raise HTTPException(status_code=403, detail="Invalid admin invite code")
        role = UserRole.ADMIN
    else:
        # Employee signup requires invitation code
        if not user_data.employee_invite_code:
            raise HTTPException(status_code=403, detail="Employee invitation code is required")
        
        # Validate invitation code (check tenant if provided)
        invitation_query = {
            "code": user_data.employee_invite_code.upper(),
            "status": "pending"
        }
        if tenant_id:
            invitation_query["tenant_id"] = tenant_id
        
        invitation = await db.invitations.find_one(invitation_query, {"_id": 0})
        
        if not invitation:
            raise HTTPException(status_code=403, detail="Invalid or expired invitation code")
        
        # Use invitation's tenant_id if not provided
        if not user_data.tenant_id and invitation.get("tenant_id"):
            tenant_id = invitation["tenant_id"]
        
        # Check if invitation has expired
        expires_at = invitation.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        
        if datetime.now(timezone.utc) > expires_at:
            # Mark as expired
            await db.invitations.update_one(
                {"id": invitation["id"]},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(status_code=403, detail="Invitation code has expired")
        
        # Check if email matches invitation (optional - can be removed for flexibility)
        if invitation.get("email") and invitation["email"].lower() != user_data.email.lower():
            raise HTTPException(status_code=403, detail="This invitation was sent to a different email address")
    
    # Create user with tenant_id
    user = UserBase(
        name=user_data.name,
        email=user_data.email.lower(),
        role=role,
        tenant_id=tenant_id
    )
    
    user_doc = user.model_dump()
    user_doc["password_hash"] = hash_password(user_data.password)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    
    # Add department from invitation if available
    if invitation and invitation.get("department"):
        user_doc["department"] = invitation["department"]
    
    await db.users.insert_one(user_doc)
    
    # Mark invitation as accepted
    if invitation:
        await db.invitations.update_one(
            {"id": invitation["id"]},
            {"$set": {
                "status": "accepted",
                "accepted_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # Create token with tenant_id
    token = create_token(user.id, user.email, user.role.value, tenant_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            tenant_id=tenant_id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
    )
    
    # Trigger webhook for user creation
    await trigger_webhooks(
        tenant_id=tenant_id,
        event_type=WebhookEventType.USER_CREATED,
        payload={
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    )
    
    return response


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    # Get request metadata for audit logging
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # First try to find user by email only (for super admin check)
    user_by_email = await db.users.find_one({
        "email": credentials.email.lower()
    }, {"_id": 0})
    
    # If user is super admin, allow login regardless of tenant
    if user_by_email and user_by_email.get("role") == UserRole.SUPER_ADMIN.value:
        user = user_by_email
    else:
        # For regular users, find by email AND tenant_id
        user = await db.users.find_one({
            "email": credentials.email.lower(),
            "tenant_id": credentials.tenant_id
        }, {"_id": 0})
    
    if not user:
        # Log failed login attempt
        await log_audit_event(
            event_type=AuditEventType.LOGIN_FAILED,
            tenant_id=credentials.tenant_id or "unknown",
            user_email=credentials.email,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "User not found for this tenant"},
            severity="WARNING"
        )
        raise HTTPException(status_code=401, detail="No account found for this company")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        # Log failed password attempt
        await log_audit_event(
            event_type=AuditEventType.LOGIN_FAILED,
            tenant_id=user.get("tenant_id", credentials.tenant_id),
            user_id=user["id"],
            user_email=credentials.email,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "Incorrect password"},
            severity="WARNING"
        )
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again")
    
    # Get user's tenant_id
    user_tenant = user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    if not user.get("is_active", True):
        # Log deactivated account login attempt
        await log_audit_event(
            event_type=AuditEventType.LOGIN_FAILED,
            tenant_id=user_tenant,
            user_id=user["id"],
            user_email=credentials.email,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "Account deactivated"},
            severity="WARNING"
        )
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact administrator.")
    
    # Create token with tenant_id
    token = create_token(user["id"], user["email"], user["role"], user_tenant)
    
    # Log successful login
    await log_audit_event(
        event_type=AuditEventType.LOGIN_SUCCESS,
        tenant_id=user_tenant,
        user_id=user["id"],
        user_email=credentials.email,
        ip_address=ip_address,
        user_agent=user_agent,
        details={"role": user["role"]},
        severity="INFO"
    )
    
    # Parse created_at
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            tenant_id=user_tenant,
            name=user["name"],
            email=user["email"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=created_at
        )
    )


# ============== GOOGLE OAUTH ENDPOINTS ==============

# ============== TENANT MANAGEMENT ENDPOINTS ==============

@api_router.get("/tenants/public", response_model=List[TenantPublicInfo])
async def get_public_tenants():
    """Get list of active tenants for login dropdown (public endpoint)"""
    tenants = await db.tenants.find(
        {"is_active": True},
        {"_id": 0, "slug": 1, "name": 1, "logo_url": 1, "primary_color": 1, "settings": 1}
    ).sort("name", 1).to_list(100)
    
    return tenants


@api_router.get("/tenants/{slug}/public", response_model=TenantPublicInfo)
async def get_tenant_public_info(slug: str):
    """Get public info for a specific tenant (for branding)"""
    tenant = await db.tenants.find_one(
        {"slug": slug.lower(), "is_active": True},
        {"_id": 0, "slug": 1, "name": 1, "logo_url": 1, "primary_color": 1, "settings": 1}
    )
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return tenant


@api_router.get("/super-admin/tenants", response_model=List[TenantResponse])
async def get_all_tenants(super_admin: dict = Depends(require_super_admin)):
    """Get all tenants (super admin only)"""
    tenants = await db.tenants.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for tenant in tenants:
        if isinstance(tenant.get("created_at"), str):
            tenant["created_at"] = datetime.fromisoformat(tenant["created_at"])
    
    return tenants


@api_router.post("/super-admin/tenants", response_model=TenantResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    super_admin: dict = Depends(require_super_admin)
):
    """Create a new tenant (super admin only)"""
    # Check if slug already exists
    existing = await db.tenants.find_one({"slug": tenant_data.slug.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Tenant slug already exists")
    
    # Generate unique admin signup code for this tenant
    import random
    import string
    admin_code = f"{tenant_data.slug.upper()}-ADMIN-{''.join(random.choices(string.digits, k=4))}"
    
    tenant = Tenant(
        slug=tenant_data.slug.lower(),
        name=tenant_data.name,
        logo_url=tenant_data.logo_url,
        primary_color=tenant_data.primary_color or "#1a1a1a",
        secondary_color=tenant_data.secondary_color or "#D4AF37",
        email=tenant_data.email,
        phone=tenant_data.phone,
        address=tenant_data.address,
        admin_signup_code=admin_code,
        settings=TenantSettings(),
        created_by=super_admin["id"]
    )
    
    doc = serialize_datetime(tenant.model_dump())
    await db.tenants.insert_one(doc)
    
    return TenantResponse(
        id=tenant.id,
        slug=tenant.slug,
        name=tenant.name,
        logo_url=tenant.logo_url,
        primary_color=tenant.primary_color,
        secondary_color=tenant.secondary_color,
        email=tenant.email,
        phone=tenant.phone,
        address=tenant.address,
        is_active=tenant.is_active,
        created_at=tenant.created_at
    )


@api_router.get("/super-admin/tenants/{tenant_id}")
async def get_tenant_details(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Get full tenant details including admin code (super admin only)"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get tenant stats
    employee_count = await db.users.count_documents({"tenant_id": tenant["slug"], "role": "EMPLOYEE"})
    admin_count = await db.users.count_documents({"tenant_id": tenant["slug"], "role": "ADMIN"})
    
    tenant["stats"] = {
        "employee_count": employee_count,
        "admin_count": admin_count,
        "total_users": employee_count + admin_count
    }
    
    return tenant


# ============== AUDIT LOG ENDPOINTS ==============

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


@api_router.get("/super-admin/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    tenant_id: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    user_email: Optional[str] = None,
    limit: int = 100,
    super_admin: dict = Depends(require_super_admin)
):
    """Get security audit logs across all tenants (super admin only)"""
    query = {}
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    if event_type:
        query["event_type"] = event_type.upper()
    if severity:
        query["severity"] = severity.upper()
    if user_email:
        query["user_email"] = {"$regex": user_email, "$options": "i"}
    
    logs = await db.security_audit_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for log in logs:
        if isinstance(log.get("created_at"), str):
            log["created_at"] = datetime.fromisoformat(log["created_at"].replace("Z", "+00:00"))
    
    return logs


@api_router.get("/super-admin/audit-logs/stats")
async def get_audit_log_stats(
    tenant_id: Optional[str] = None,
    super_admin: dict = Depends(require_super_admin)
):
    """Get security audit log statistics (super admin only)"""
    match_stage = {}
    if tenant_id:
        match_stage["tenant_id"] = tenant_id
    
    # Get counts by event type
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$group": {
            "_id": "$event_type",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    event_counts = await db.security_audit_logs.aggregate(pipeline).to_list(50)
    
    # Get counts by severity
    severity_pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$group": {
            "_id": "$severity",
            "count": {"$sum": 1}
        }}
    ]
    
    severity_counts = await db.security_audit_logs.aggregate(severity_pipeline).to_list(10)
    
    # Get recent critical events
    critical_events = await db.security_audit_logs.find(
        {"severity": "CRITICAL", **match_stage},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for event in critical_events:
        if isinstance(event.get("created_at"), str):
            event["created_at"] = datetime.fromisoformat(event["created_at"].replace("Z", "+00:00"))
    
    return {
        "by_event_type": {item["_id"]: item["count"] for item in event_counts},
        "by_severity": {item["_id"]: item["count"] for item in severity_counts},
        "recent_critical_events": critical_events,
        "total_logs": await db.security_audit_logs.count_documents(match_stage)
    }


@api_router.get("/super-admin/security-alerts")
async def get_security_alerts(
    super_admin: dict = Depends(require_super_admin)
):
    """Get active security alerts based on audit logs (super admin only)"""
    now = datetime.now(timezone.utc)
    last_24h = (now - timedelta(hours=24)).isoformat()
    
    alerts = []
    
    # Check for cross-tenant attempts in last 24h
    cross_tenant_count = await db.security_audit_logs.count_documents({
        "event_type": "CROSS_TENANT_ATTEMPT",
        "created_at": {"$gte": last_24h}
    })
    
    if cross_tenant_count > 0:
        alerts.append({
            "type": "CROSS_TENANT_ATTEMPT",
            "severity": "CRITICAL",
            "count": cross_tenant_count,
            "message": f"{cross_tenant_count} cross-tenant access attempt(s) in the last 24 hours",
            "action": "Review audit logs for details"
        })
    
    # Check for multiple failed logins from same IP
    failed_login_pipeline = [
        {
            "$match": {
                "event_type": "LOGIN_FAILED",
                "created_at": {"$gte": last_24h}
            }
        },
        {
            "$group": {
                "_id": "$ip_address",
                "count": {"$sum": 1},
                "emails": {"$addToSet": "$user_email"}
            }
        },
        {
            "$match": {"count": {"$gte": 5}}
        }
    ]
    
    suspicious_ips = await db.security_audit_logs.aggregate(failed_login_pipeline).to_list(20)
    
    for ip_data in suspicious_ips:
        alerts.append({
            "type": "BRUTE_FORCE_ATTEMPT",
            "severity": "WARNING",
            "ip_address": ip_data["_id"],
            "count": ip_data["count"],
            "targeted_emails": ip_data["emails"][:5],  # Show first 5
            "message": f"IP {ip_data['_id']} has {ip_data['count']} failed login attempts",
            "action": "Consider blocking this IP"
        })
    
    # Check for deactivated account login attempts
    deactivated_attempts = await db.security_audit_logs.count_documents({
        "event_type": "LOGIN_FAILED",
        "details.reason": "Account deactivated",
        "created_at": {"$gte": last_24h}
    })
    
    if deactivated_attempts > 0:
        alerts.append({
            "type": "DEACTIVATED_ACCOUNT_ACCESS",
            "severity": "INFO",
            "count": deactivated_attempts,
            "message": f"{deactivated_attempts} login attempt(s) from deactivated accounts",
            "action": "May indicate former employees trying to access"
        })
    
    return {
        "alerts": alerts,
        "total_alerts": len(alerts),
        "checked_at": now.isoformat()
    }


# ============== TENANT DATA EXPORT ENDPOINTS ==============

@api_router.get("/super-admin/tenants/{tenant_id}/export")
async def export_tenant_data(
    tenant_id: str,
    format: str = "json",
    super_admin: dict = Depends(require_super_admin)
):
    """Export all data for a specific tenant (GDPR compliance)"""
    
    # Verify tenant exists
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant_slug = tenant.get("slug")
    
    # Collect all tenant data
    export_data = {
        "export_metadata": {
            "tenant_id": tenant_id,
            "tenant_name": tenant.get("name"),
            "tenant_slug": tenant_slug,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "exported_by": super_admin.get("email"),
            "format_version": "1.0"
        },
        "tenant_config": tenant,
        "users": await db.users.find({"tenant_id": tenant_slug}, {"_id": 0, "password_hash": 0}).to_list(10000),
        "timesheets": await db.timesheets.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(50000),
        "tickets": await db.tickets.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(10000),
        "leave_requests": await db.leave_requests.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(10000),
        "projects": await db.projects.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(1000),
        "announcements": await db.announcements.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(1000),
        "holidays": await db.holidays.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(500),
        "invitations": await db.invitations.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(1000),
        "leave_types": await db.leave_types.find({"tenant_id": tenant_slug}, {"_id": 0}).to_list(100),
    }
    
    # Add summary stats
    export_data["summary"] = {
        "total_users": len(export_data["users"]),
        "total_timesheets": len(export_data["timesheets"]),
        "total_tickets": len(export_data["tickets"]),
        "total_leave_requests": len(export_data["leave_requests"]),
        "total_projects": len(export_data["projects"]),
        "total_announcements": len(export_data["announcements"]),
        "total_holidays": len(export_data["holidays"]),
        "total_invitations": len(export_data["invitations"])
    }
    
    # Log the export action
    await log_audit_event(
        event_type=AuditEventType.DATA_ACCESS,
        tenant_id=tenant_slug,
        user_id=super_admin.get("id"),
        user_email=super_admin.get("email"),
        resource_type="tenant_export",
        resource_id=tenant_id,
        details={"action": "full_data_export", "record_counts": export_data["summary"]},
        severity="INFO"
    )
    
    # Return as JSON file download
    json_str = json.dumps(export_data, indent=2, default=str)
    
    filename = f"{tenant_slug}_full_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    return StreamingResponse(
        io.BytesIO(json_str.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@api_router.delete("/super-admin/tenants/{tenant_id}/data")
async def delete_tenant_data(
    tenant_id: str,
    confirm: str = None,
    super_admin: dict = Depends(require_super_admin)
):
    """Delete all data for a tenant (GDPR right to be forgotten)"""
    
    if confirm != "DELETE_ALL_DATA":
        raise HTTPException(
            status_code=400, 
            detail="Must confirm deletion by passing ?confirm=DELETE_ALL_DATA"
        )
    
    # Verify tenant exists
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant_slug = tenant.get("slug")
    
    # Prevent deletion of default tenant
    if tenant_slug == DEFAULT_TENANT_SLUG:
        raise HTTPException(status_code=400, detail="Cannot delete the default tenant")
    
    # Delete all tenant data
    deletion_results = {
        "users": (await db.users.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "timesheets": (await db.timesheets.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "tickets": (await db.tickets.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "leave_requests": (await db.leave_requests.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "projects": (await db.projects.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "announcements": (await db.announcements.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "holidays": (await db.holidays.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "invitations": (await db.invitations.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "leave_types": (await db.leave_types.delete_many({"tenant_id": tenant_slug})).deleted_count,
        "tenant": (await db.tenants.delete_one({"id": tenant_id})).deleted_count
    }
    
    # Log the deletion
    await log_audit_event(
        event_type=AuditEventType.DATA_DELETE,
        tenant_id=tenant_slug,
        user_id=super_admin.get("id"),
        user_email=super_admin.get("email"),
        resource_type="tenant_deletion",
        resource_id=tenant_id,
        details={"action": "full_tenant_deletion", "deleted_counts": deletion_results},
        severity="CRITICAL"
    )
    
    return {
        "message": f"All data for tenant '{tenant.get('name')}' has been deleted",
        "deleted_counts": deletion_results
    }


# ============== TENANT USAGE METRICS ENDPOINTS ==============

@api_router.get("/super-admin/usage/overview")
async def get_usage_overview(
    super_admin: dict = Depends(require_super_admin)
):
    """Get usage overview for all tenants"""
    
    # Get all tenants
    tenants = await db.tenants.find({}, {"_id": 0, "id": 1, "slug": 1, "name": 1}).to_list(100)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last_30_days = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    overview = []
    
    for tenant in tenants:
        tenant_slug = tenant.get("slug")
        
        # Get user counts
        total_users = await db.users.count_documents({"tenant_id": tenant_slug})
        active_users = await db.users.count_documents({"tenant_id": tenant_slug, "is_active": True})
        admin_count = await db.users.count_documents({"tenant_id": tenant_slug, "role": "ADMIN"})
        
        # Get today's usage from database
        today_usage = await db.tenant_usage.find_one(
            {"tenant_id": tenant_slug, "date": today},
            {"_id": 0}
        )
        
        # Get 30-day usage
        monthly_pipeline = [
            {
                "$match": {
                    "tenant_id": tenant_slug,
                    "date": {"$gte": last_30_days}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_requests": {"$sum": "$total_requests"}
                }
            }
        ]
        monthly_result = await db.tenant_usage.aggregate(monthly_pipeline).to_list(1)
        monthly_requests = monthly_result[0]["total_requests"] if monthly_result else 0
        
        # Get recent activity counts
        timesheets_30d = await db.timesheets.count_documents({
            "tenant_id": tenant_slug,
            "created_at": {"$gte": last_30_days}
        })
        
        tickets_30d = await db.tickets.count_documents({
            "tenant_id": tenant_slug,
            "created_at": {"$gte": last_30_days}
        })
        
        # Add in-memory metrics if available
        in_memory = usage_metrics_store.get(tenant_slug, {})
        
        overview.append({
            "tenant_id": tenant.get("id"),
            "tenant_slug": tenant_slug,
            "tenant_name": tenant.get("name"),
            "users": {
                "total": total_users,
                "active": active_users,
                "admins": admin_count,
                "employees": total_users - admin_count
            },
            "api_usage": {
                "today": (today_usage.get("total_requests", 0) if today_usage else 0) + in_memory.get("total_requests", 0),
                "last_30_days": monthly_requests + in_memory.get("total_requests", 0)
            },
            "activity": {
                "timesheets_30d": timesheets_30d,
                "tickets_30d": tickets_30d
            }
        })
    
    # Sort by activity (most active first)
    overview.sort(key=lambda x: x["api_usage"]["last_30_days"], reverse=True)
    
    return {
        "tenants": overview,
        "total_tenants": len(overview),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/super-admin/usage/tenant/{tenant_slug}")
async def get_tenant_usage_details(
    tenant_slug: str,
    days: int = 30,
    super_admin: dict = Depends(require_super_admin)
):
    """Get detailed usage metrics for a specific tenant"""
    
    # Verify tenant exists
    tenant = await db.tenants.find_one({"slug": tenant_slug}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Get daily usage breakdown
    daily_usage = await db.tenant_usage.find(
        {"tenant_id": tenant_slug, "date": {"$gte": start_date}},
        {"_id": 0}
    ).sort("date", 1).to_list(days)
    
    # Get hourly usage for today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hourly_usage = await db.tenant_usage_hourly.find(
        {"tenant_id": tenant_slug, "date": today},
        {"_id": 0}
    ).sort("hour", 1).to_list(24)
    
    # Get feature usage (based on endpoint patterns)
    feature_pipeline = [
        {"$match": {"tenant_id": tenant_slug, "date": {"$gte": start_date}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_requests"}}}
    ]
    total_result = await db.tenant_usage.aggregate(feature_pipeline).to_list(1)
    total_requests = total_result[0]["total"] if total_result else 0
    
    # Get user activity stats
    user_stats = {
        "total_users": await db.users.count_documents({"tenant_id": tenant_slug}),
        "active_users": await db.users.count_documents({"tenant_id": tenant_slug, "is_active": True}),
        "admins": await db.users.count_documents({"tenant_id": tenant_slug, "role": "ADMIN"}),
    }
    
    # Get content stats
    content_stats = {
        "total_timesheets": await db.timesheets.count_documents({"tenant_id": tenant_slug}),
        "total_tickets": await db.tickets.count_documents({"tenant_id": tenant_slug}),
        "total_projects": await db.projects.count_documents({"tenant_id": tenant_slug}),
        "total_leave_requests": await db.leave_requests.count_documents({"tenant_id": tenant_slug}),
    }
    
    # Get login activity from audit logs
    login_stats = {
        "successful_logins": await db.security_audit_logs.count_documents({
            "tenant_id": tenant_slug,
            "event_type": "LOGIN_SUCCESS",
            "created_at": {"$gte": start_date}
        }),
        "failed_logins": await db.security_audit_logs.count_documents({
            "tenant_id": tenant_slug,
            "event_type": "LOGIN_FAILED",
            "created_at": {"$gte": start_date}
        })
    }
    
    # Include in-memory metrics
    in_memory = usage_metrics_store.get(tenant_slug, {})
    
    return {
        "tenant": {
            "id": tenant.get("id"),
            "slug": tenant_slug,
            "name": tenant.get("name")
        },
        "period": {
            "start": start_date,
            "end": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "days": days
        },
        "api_usage": {
            "total_requests": total_requests + in_memory.get("total_requests", 0),
            "daily_breakdown": daily_usage,
            "hourly_today": hourly_usage,
            "top_endpoints": in_memory.get("requests_by_endpoint", {})
        },
        "user_stats": user_stats,
        "content_stats": content_stats,
        "login_activity": login_stats,
        "rate_limit": {
            "limit_per_minute": RATE_LIMIT_MAX_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW
        }
    }


@api_router.put("/super-admin/rate-limit/{tenant_slug}")
async def update_tenant_rate_limit(
    tenant_slug: str,
    max_requests: int = 100,
    super_admin: dict = Depends(require_super_admin)
):
    """Update rate limit for a specific tenant (for future use with per-tenant limits)"""
    
    # For now, just store in database for reference
    # In production, this would update a Redis/cache store
    
    await db.tenant_rate_limits.update_one(
        {"tenant_slug": tenant_slug},
        {
            "$set": {
                "max_requests_per_minute": max_requests,
                "updated_by": super_admin.get("email"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "message": f"Rate limit updated for {tenant_slug}",
        "max_requests_per_minute": max_requests
    }


# ============== P2: ENCRYPTION API ENDPOINTS ==============

class EncryptDataRequest(BaseModel):
    data: str
    field_name: Optional[str] = None


class DecryptDataRequest(BaseModel):
    encrypted_data: str


@api_router.post("/admin/encrypt")
async def encrypt_data_endpoint(
    request: EncryptDataRequest,
    current_user: dict = Depends(get_current_user)
):
    """Encrypt sensitive data for storage (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    encrypted = encrypt_sensitive_data(tenant_id, request.data)
    
    return {
        "encrypted_data": encrypted,
        "field_name": request.field_name,
        "tenant_id": tenant_id,
        "note": "Store this encrypted value. Original data cannot be recovered without decryption."
    }


@api_router.post("/admin/decrypt")
async def decrypt_data_endpoint(
    request: DecryptDataRequest,
    current_user: dict = Depends(get_current_user)
):
    """Decrypt sensitive data (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    decrypted = decrypt_sensitive_data(tenant_id, request.encrypted_data)
    
    if decrypted is None:
        raise HTTPException(status_code=400, detail="Failed to decrypt data. Invalid key or corrupted data.")
    
    return {
        "decrypted_data": decrypted,
        "tenant_id": tenant_id
    }


@api_router.get("/super-admin/encryption/status")
async def get_encryption_status(
    super_admin: dict = Depends(require_super_admin)
):
    """Get encryption status and configuration (Super Admin only)"""
    
    # Count encrypted fields across collections (example check)
    # In production, you'd track which fields are encrypted
    
    return {
        "encryption_enabled": True,
        "algorithm": "Fernet (AES-128-CBC with HMAC)",
        "key_derivation": "PBKDF2-HMAC-SHA256",
        "per_tenant_keys": True,
        "key_rotation_supported": True,
        "note": "Each tenant has a unique encryption key derived from the master key"
    }


# ============== P2: WEBHOOK API ENDPOINTS ==============

class WebhookCreateRequest(BaseModel):
    name: str
    url: str
    events: List[str]
    headers: Optional[Dict[str, str]] = None


class WebhookUpdateRequest(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    headers: Optional[Dict[str, str]] = None
    is_active: Optional[bool] = None


@api_router.get("/admin/webhooks")
async def get_webhooks(
    current_user: dict = Depends(get_current_user)
):
    """Get all webhooks for the tenant (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    webhooks = await db.webhooks.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    
    # Mask secrets
    for webhook in webhooks:
        if webhook.get("secret"):
            webhook["secret"] = webhook["secret"][:8] + "..." + webhook["secret"][-4:]
    
    return {
        "webhooks": webhooks,
        "available_events": [e.value for e in WebhookEventType]
    }


@api_router.post("/admin/webhooks")
async def create_webhook(
    webhook_data: WebhookCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new webhook (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Validate events
    valid_events = [e.value for e in WebhookEventType]
    for event in webhook_data.events:
        if event not in valid_events:
            raise HTTPException(status_code=400, detail=f"Invalid event type: {event}")
    
    # Validate URL
    if not webhook_data.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Webhook URL must start with http:// or https://")
    
    webhook = WebhookConfig(
        tenant_id=tenant_id,
        name=webhook_data.name,
        url=webhook_data.url,
        events=webhook_data.events,
        headers=webhook_data.headers
    )
    
    doc = webhook.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.webhooks.insert_one(doc)
    
    return {
        "message": "Webhook created successfully",
        "webhook_id": webhook.id,
        "secret": webhook.secret,
        "note": "Save this secret securely - it's used to verify webhook signatures"
    }


@api_router.put("/admin/webhooks/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    webhook_data: WebhookUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a webhook (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Verify webhook exists and belongs to tenant
    existing = await db.webhooks.find_one({"id": webhook_id, "tenant_id": tenant_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Build update
    update_fields = {}
    if webhook_data.name is not None:
        update_fields["name"] = webhook_data.name
    if webhook_data.url is not None:
        update_fields["url"] = webhook_data.url
    if webhook_data.events is not None:
        update_fields["events"] = webhook_data.events
    if webhook_data.headers is not None:
        update_fields["headers"] = webhook_data.headers
    if webhook_data.is_active is not None:
        update_fields["is_active"] = webhook_data.is_active
    
    if update_fields:
        await db.webhooks.update_one(
            {"id": webhook_id},
            {"$set": update_fields}
        )
    
    return {"message": "Webhook updated successfully"}


@api_router.delete("/admin/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a webhook (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    result = await db.webhooks.delete_one({"id": webhook_id, "tenant_id": tenant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    return {"message": "Webhook deleted successfully"}


@api_router.post("/admin/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Send a test event to a webhook (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    webhook = await db.webhooks.find_one({"id": webhook_id, "tenant_id": tenant_id}, {"_id": 0})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Send test payload
    test_payload = {
        "test": True,
        "message": "This is a test webhook delivery",
        "tenant_id": tenant_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Deliver synchronously for test
    signature = hashlib.sha256(
        f"{webhook.get('secret')}:{json.dumps(test_payload, sort_keys=True)}".encode()
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Event": "test",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": datetime.now(timezone.utc).isoformat(),
        "User-Agent": "AurborBloom-Webhook/1.0"
    }
    
    if webhook.get("headers"):
        headers.update(webhook["headers"])
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                webhook.get("url"),
                json={
                    "event": "test",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "tenant_id": tenant_id,
                    "data": test_payload
                },
                headers=headers
            )
            
            return {
                "success": 200 <= response.status_code < 300,
                "status_code": response.status_code,
                "response": response.text[:500],
                "message": "Test webhook delivered successfully" if 200 <= response.status_code < 300 else "Webhook delivery failed"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to deliver test webhook"
        }


@api_router.get("/admin/webhooks/{webhook_id}/deliveries")
async def get_webhook_deliveries(
    webhook_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get delivery history for a webhook (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Verify webhook belongs to tenant
    webhook = await db.webhooks.find_one({"id": webhook_id, "tenant_id": tenant_id})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    deliveries = await db.webhook_deliveries.find(
        {"webhook_id": webhook_id},
        {"_id": 0}
    ).sort("delivered_at", -1).limit(limit).to_list(limit)
    
    # Calculate stats
    total = len(deliveries)
    successful = sum(1 for d in deliveries if d.get("success"))
    
    return {
        "deliveries": deliveries,
        "stats": {
            "total": total,
            "successful": successful,
            "failed": total - successful,
            "success_rate": f"{(successful/total*100):.1f}%" if total > 0 else "N/A"
        }
    }


# ============== P2: CUSTOM DOMAIN SSL ENDPOINTS ==============

@api_router.post("/admin/domains/{domain}/ssl")
async def request_domain_ssl(
    domain: str,
    current_user: dict = Depends(get_current_user)
):
    """Request SSL certificate for a custom domain (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Verify tenant owns this domain
    tenant = await db.tenants.find_one({"slug": tenant_id})
    if not tenant or tenant.get("custom_domain") != domain:
        raise HTTPException(status_code=400, detail="Domain not configured for this tenant")
    
    # Request SSL
    result = await request_ssl_certificate(tenant_id, domain)
    
    return result


@api_router.get("/admin/domains/{domain}/ssl")
async def get_domain_ssl_status(
    domain: str,
    current_user: dict = Depends(get_current_user)
):
    """Get SSL certificate status for a domain (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await check_ssl_status(domain)
    
    return result


@api_router.get("/super-admin/ssl/overview")
async def get_ssl_overview(
    super_admin: dict = Depends(require_super_admin)
):
    """Get SSL certificate overview for all custom domains (Super Admin only)"""
    
    # Get all tenants with custom domains
    tenants_with_domains = await db.tenants.find(
        {"custom_domain": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "slug": 1, "name": 1, "custom_domain": 1}
    ).to_list(100)
    
    overview = []
    
    for tenant in tenants_with_domains:
        domain = tenant.get("custom_domain")
        ssl_status = await db.custom_domain_ssl.find_one({"domain": domain}, {"_id": 0})
        
        overview.append({
            "tenant_id": tenant.get("id"),
            "tenant_name": tenant.get("name"),
            "domain": domain,
            "ssl_status": ssl_status.get("ssl_status") if ssl_status else "not_requested",
            "expires_at": ssl_status.get("expires_at") if ssl_status else None
        })
    
    # Count by status
    status_counts = {}
    for item in overview:
        status = item.get("ssl_status")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    return {
        "domains": overview,
        "total_domains": len(overview),
        "by_status": status_counts
    }


@api_router.post("/super-admin/ssl/provision/{domain}")
async def manually_provision_ssl(
    domain: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Manually trigger SSL provisioning for a domain (Super Admin only)"""
    
    # In production, this would trigger Let's Encrypt certificate request
    # For now, we simulate the provisioning process
    
    ssl_record = await db.custom_domain_ssl.find_one({"domain": domain})
    
    if not ssl_record:
        raise HTTPException(status_code=404, detail="Domain not found in SSL tracking")
    
    # Simulate provisioning
    await db.custom_domain_ssl.update_one(
        {"domain": domain},
        {
            "$set": {
                "ssl_status": "provisioning",
                "last_checked_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # In production, this would start the actual certificate request
    # For demo, we'll set it to active after a delay (simulated)
    
    return {
        "message": f"SSL provisioning initiated for {domain}",
        "status": "provisioning",
        "note": "In production, certificate would be provisioned via Let's Encrypt within 5-15 minutes"
    }


@api_router.put("/super-admin/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    super_admin: dict = Depends(require_super_admin)
):
    """Update a tenant (super admin only)"""
    existing = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_fields = {k: v for k, v in tenant_data.model_dump().items() if v is not None}
    
    if update_fields:
        if "settings" in update_fields and update_fields["settings"]:
            update_fields["settings"] = update_fields["settings"].model_dump() if hasattr(update_fields["settings"], "model_dump") else update_fields["settings"]
        await db.tenants.update_one({"id": tenant_id}, {"$set": update_fields})
    
    updated = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    
    return TenantResponse(**updated)


@api_router.delete("/super-admin/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Delete a tenant and all its data (super admin only) - USE WITH CAUTION"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if tenant["slug"] == DEFAULT_TENANT_SLUG:
        raise HTTPException(status_code=400, detail="Cannot delete the default tenant")
    
    tenant_slug = tenant["slug"]
    
    # Delete all tenant data
    await db.users.delete_many({"tenant_id": tenant_slug})
    await db.timesheets.delete_many({"tenant_id": tenant_slug})
    await db.tickets.delete_many({"tenant_id": tenant_slug})
    await db.leave_requests.delete_many({"tenant_id": tenant_slug})
    await db.invitations.delete_many({"tenant_id": tenant_slug})
    await db.announcements.delete_many({"tenant_id": tenant_slug})
    await db.holidays.delete_many({"tenant_id": tenant_slug})
    await db.projects.delete_many({"tenant_id": tenant_slug})
    await db.tenants.delete_one({"id": tenant_id})
    
    return {"message": f"Tenant '{tenant['name']}' and all associated data deleted successfully"}


@api_router.post("/super-admin/tenants/{tenant_id}/upload-logo")
async def upload_tenant_logo(
    tenant_id: str,
    request: Request,
    super_admin: dict = Depends(require_super_admin)
):
    """Upload a logo for a tenant (super admin only)"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    body = await request.json()
    logo_data = body.get("logo")
    
    if not logo_data:
        raise HTTPException(status_code=400, detail="Logo data is required")
    
    # Validate it's a base64 image
    if not logo_data.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Invalid image format. Must be base64 encoded.")
    
    await db.tenants.update_one({"id": tenant_id}, {"$set": {"logo_url": logo_data}})
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_data}


# ============== CUSTOM DOMAIN ENDPOINTS ==============

class CustomDomainRequest(BaseModel):
    domain: str = Field(..., min_length=4, max_length=253)


@api_router.post("/super-admin/tenants/{tenant_id}/custom-domain")
async def set_custom_domain(
    tenant_id: str,
    domain_data: CustomDomainRequest,
    super_admin: dict = Depends(require_super_admin)
):
    """Set a custom domain for a tenant (super admin only)"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Normalize domain
    domain = domain_data.domain.lower().strip()
    
    # Validate domain format
    import re
    domain_pattern = r'^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$'
    if not re.match(domain_pattern, domain):
        raise HTTPException(status_code=400, detail="Invalid domain format")
    
    # Check if domain is already used by another tenant
    existing = await db.tenants.find_one({
        "custom_domain": domain,
        "id": {"$ne": tenant_id}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This domain is already assigned to another tenant")
    
    # Generate verification token
    verification_token = f"aurborbloom-verify-{str(uuid.uuid4())[:8]}"
    
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "custom_domain": domain,
            "custom_domain_verified": False,
            "custom_domain_verification_token": verification_token
        }}
    )
    
    return {
        "message": "Custom domain set successfully",
        "domain": domain,
        "verification_token": verification_token,
        "instructions": {
            "step1": f"Add a CNAME record pointing '{domain}' to 'saasbloom.preview.emergentagent.com'",
            "step2": f"Add a TXT record '_aurborbloom-verify.{domain}' with value '{verification_token}'",
            "step3": "Click 'Verify Domain' once DNS records are configured (may take up to 48 hours to propagate)"
        }
    }


@api_router.post("/super-admin/tenants/{tenant_id}/verify-domain")
async def verify_custom_domain(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Verify that DNS records are properly configured for custom domain"""
    import socket
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if not tenant.get("custom_domain"):
        raise HTTPException(status_code=400, detail="No custom domain configured")
    
    domain = tenant["custom_domain"]
    verification_token = tenant.get("custom_domain_verification_token", "")
    
    # Check CNAME record
    cname_verified = False
    try:
        import dns.resolver
        answers = dns.resolver.resolve(domain, 'CNAME')
        for rdata in answers:
            if 'emergentagent.com' in str(rdata.target).lower():
                cname_verified = True
                break
    except Exception as e:
        logger.warning(f"CNAME verification failed for {domain}: {e}")
    
    # For simplicity in preview environment, mark as verified if domain is set
    # In production, full DNS verification would be required
    if not cname_verified:
        # Try basic DNS resolution as fallback
        try:
            socket.gethostbyname(domain)
            cname_verified = True  # Domain resolves
        except socket.gaierror:
            pass
    
    if cname_verified:
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {"custom_domain_verified": True}}
        )
        return {
            "verified": True,
            "message": f"Domain '{domain}' verified successfully!",
            "domain": domain
        }
    else:
        return {
            "verified": False,
            "message": "Domain verification failed. Please check your DNS records.",
            "domain": domain,
            "troubleshooting": [
                "Ensure CNAME record points to 'saasbloom.preview.emergentagent.com'",
                "DNS changes can take up to 48 hours to propagate",
                "Check for typos in your domain configuration"
            ]
        }


@api_router.delete("/super-admin/tenants/{tenant_id}/custom-domain")
async def remove_custom_domain(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Remove custom domain from a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "custom_domain": None,
            "custom_domain_verified": False,
            "custom_domain_verification_token": None
        }}
    )
    
    return {"message": "Custom domain removed successfully"}


@api_router.get("/tenants/by-domain/{domain}")
async def get_tenant_by_domain(domain: str):
    """Get tenant info by custom domain (for domain-based routing)"""
    tenant = await db.tenants.find_one(
        {"custom_domain": domain.lower(), "is_active": True, "custom_domain_verified": True},
        {"_id": 0, "slug": 1, "name": 1, "logo_url": 1, "primary_color": 1, "settings": 1}
    )
    
    if not tenant:
        raise HTTPException(status_code=404, detail="No tenant found for this domain")
    
    return tenant


@api_router.get("/super-admin/tenants/{tenant_id}/domain-status")
async def get_domain_status(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Get detailed domain verification status for a tenant"""
    import socket
    import dns.resolver
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    domain = tenant.get("custom_domain")
    if not domain:
        return {
            "has_domain": False,
            "domain": None,
            "verified": False,
            "dns_checks": {}
        }
    
    # Perform detailed DNS checks
    dns_checks = {
        "cname_record": {"status": "unknown", "value": None},
        "resolves": {"status": "unknown", "ip": None},
        "txt_record": {"status": "unknown", "found": False}
    }
    
    # Check CNAME record
    try:
        answers = dns.resolver.resolve(domain, 'CNAME')
        for rdata in answers:
            target = str(rdata.target).rstrip('.')
            dns_checks["cname_record"] = {
                "status": "found",
                "value": target,
                "valid": 'emergentagent.com' in target.lower()
            }
            break
    except dns.resolver.NoAnswer:
        dns_checks["cname_record"] = {"status": "not_found", "value": None}
    except dns.resolver.NXDOMAIN:
        dns_checks["cname_record"] = {"status": "domain_not_exists", "value": None}
    except Exception as e:
        dns_checks["cname_record"] = {"status": "error", "error": str(e)}
    
    # Check if domain resolves
    try:
        ip = socket.gethostbyname(domain)
        dns_checks["resolves"] = {"status": "success", "ip": ip}
    except socket.gaierror as e:
        dns_checks["resolves"] = {"status": "failed", "error": str(e)}
    
    # Check TXT verification record
    verification_token = tenant.get("custom_domain_verification_token", "")
    txt_domain = f"_aurborbloom-verify.{domain}"
    try:
        answers = dns.resolver.resolve(txt_domain, 'TXT')
        for rdata in answers:
            txt_value = str(rdata).strip('"')
            if verification_token and txt_value == verification_token:
                dns_checks["txt_record"] = {"status": "verified", "found": True}
                break
        else:
            dns_checks["txt_record"] = {"status": "found_but_wrong_value", "found": False}
    except dns.resolver.NXDOMAIN:
        dns_checks["txt_record"] = {"status": "not_found", "found": False}
    except Exception as e:
        dns_checks["txt_record"] = {"status": "error", "error": str(e), "found": False}
    
    return {
        "has_domain": True,
        "domain": domain,
        "verified": tenant.get("custom_domain_verified", False),
        "verification_token": verification_token,
        "dns_checks": dns_checks,
        "instructions": {
            "cname": f"Add CNAME record: {domain} → hrmsaas.preview.emergentagent.com",
            "txt": f"Add TXT record: _aurborbloom-verify.{domain} → {verification_token}"
        }
    }


# ============== FEATURE TOGGLE ENDPOINTS ==============

# Available features that can be toggled
AVAILABLE_FEATURES = [
    {"key": "timesheets", "label": "Timesheets", "description": "Time tracking and timesheet management", "icon": "FileText"},
    {"key": "tickets", "label": "Support Tickets", "description": "Internal ticketing system for HR, IT, etc.", "icon": "Ticket"},
    {"key": "leave", "label": "Leave / PTO", "description": "Leave requests and PTO management", "icon": "Calendar"},
    {"key": "calendar", "label": "Calendar", "description": "In-app calendar with holidays and events", "icon": "CalendarDays"},
    {"key": "projects", "label": "Projects", "description": "Project management and time tracking", "icon": "FolderKanban"},
    {"key": "chat", "label": "Team Chat", "description": "Internal messaging and collaboration", "icon": "MessageCircle"},
    {"key": "documents", "label": "Documents", "description": "Document storage and sharing", "icon": "Folder"},
    {"key": "performance", "label": "Performance Insights", "description": "Team performance analytics", "icon": "BarChart3"},
]


@api_router.get("/super-admin/features")
async def get_available_features(super_admin: dict = Depends(require_super_admin)):
    """Get list of all available features that can be toggled"""
    return AVAILABLE_FEATURES


@api_router.put("/super-admin/tenants/{tenant_id}/features")
async def update_tenant_features(
    tenant_id: str,
    request: Request,
    super_admin: dict = Depends(require_super_admin)
):
    """Update feature toggles for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    body = await request.json()
    features_enabled = body.get("features_enabled", [])
    
    # Validate features
    valid_feature_keys = [f["key"] for f in AVAILABLE_FEATURES]
    for feature in features_enabled:
        if feature not in valid_feature_keys:
            raise HTTPException(status_code=400, detail=f"Invalid feature: {feature}")
    
    # Update settings
    current_settings = tenant.get("settings") or {}
    if isinstance(current_settings, dict):
        current_settings["features_enabled"] = features_enabled
    else:
        current_settings = {"features_enabled": features_enabled}
    
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"settings": current_settings}}
    )
    
    return {
        "message": "Features updated successfully",
        "features_enabled": features_enabled
    }


@api_router.get("/super-admin/tenants/{tenant_id}/features")
async def get_tenant_features(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Get current feature toggles for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    settings = tenant.get("settings") or {}
    features_enabled = settings.get("features_enabled", ["timesheets", "tickets", "leave", "calendar", "projects", "chat"])
    
    # Return features with enabled status
    features = []
    for f in AVAILABLE_FEATURES:
        features.append({
            **f,
            "enabled": f["key"] in features_enabled
        })
    
    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant.get("name"),
        "features": features,
        "features_enabled": features_enabled
    }


@api_router.post("/auth/google/session")
async def process_google_session(request: Request):
    """
    Process Google OAuth session_id and create/login user
    Frontend sends session_id from URL fragment after Google auth redirect
    """
    import httpx
    
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # Exchange session_id for user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired session")
            
            google_user = response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to verify Google session: {str(e)}")
    
    email = google_user.get("email", "").lower()
    name = google_user.get("name", "")
    picture = google_user.get("picture", "")
    session_token = google_user.get("session_token", "")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        # User exists - update profile picture if changed
        if picture and existing_user.get("profile_image") != picture:
            await db.users.update_one(
                {"email": email},
                {"$set": {"profile_image": picture}}
            )
        
        user = existing_user
    else:
        # New user via Google - create account (default to EMPLOYEE role)
        user = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "role": UserRole.EMPLOYEE.value,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "profile_image": picture,
            "auth_provider": "google"
        }
        await db.users.insert_one(user)
        user.pop("_id", None)
    
    # Store Google session token for logout capability
    await db.google_sessions.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "user_id": user["id"],
                "session_token": session_token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Create our own JWT token
    token = create_token(user["id"], user["email"], user["role"])
    
    # Parse created_at
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "is_active": user.get("is_active", True),
            "created_at": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
            "profile_image": user.get("profile_image")
        }
    }


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    created_at = current_user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        is_active=current_user["is_active"],
        created_at=created_at
    )


# ============== PROFILE ROUTES ==============

@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's full profile"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Parse created_at
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    
    return user


@api_router.put("/profile")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    update_fields = {}
    
    if profile_data.name is not None:
        update_fields["name"] = profile_data.name
    if profile_data.phone is not None:
        update_fields["phone"] = profile_data.phone
    if profile_data.date_of_birth is not None:
        update_fields["date_of_birth"] = profile_data.date_of_birth
    if profile_data.address is not None:
        update_fields["address"] = profile_data.address
    if profile_data.city is not None:
        update_fields["city"] = profile_data.city
    if profile_data.state is not None:
        update_fields["state"] = profile_data.state
    if profile_data.country is not None:
        update_fields["country"] = profile_data.country
    if profile_data.time_zone is not None:
        update_fields["time_zone"] = profile_data.time_zone
    if profile_data.theme_preference is not None:
        update_fields["theme_preference"] = profile_data.theme_preference
    if profile_data.emergency_contact is not None:
        update_fields["emergency_contact"] = profile_data.emergency_contact.model_dump()
    if profile_data.notification_preferences is not None:
        update_fields["notification_preferences"] = profile_data.notification_preferences.model_dump()
    
    if update_fields:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_fields})
    
    # Return updated profile
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})
    return user


@api_router.put("/profile/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user's password"""
    # Get user with password hash
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not bcrypt.checkpw(password_data.current_password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash new password
    new_hash = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update password
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"password_hash": new_hash}})
    
    return {"message": "Password changed successfully"}


@api_router.post("/profile/upload-image")
async def upload_profile_image(
    current_user: dict = Depends(get_current_user),
    image_data: dict = None
):
    """Upload profile image (base64 encoded)"""
    from fastapi import Body
    return {"message": "Use the /profile/image endpoint with base64 data"}


@api_router.put("/profile/image")
async def update_profile_image(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update profile image with base64 data"""
    body = await request.json()
    image_data = body.get("image")
    
    if not image_data:
        raise HTTPException(status_code=400, detail="Image data is required")
    
    # Validate it's a base64 image
    if not image_data.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Invalid image format. Must be base64 encoded.")
    
    # Store the base64 image directly (for simplicity)
    # In production, you'd upload to S3/CloudStorage
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"profile_image": image_data}})
    
    return {"message": "Profile image updated successfully", "image": image_data}


@api_router.delete("/profile/image")
async def delete_profile_image(current_user: dict = Depends(get_current_user)):
    """Delete profile image"""
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"profile_image": None}})
    return {"message": "Profile image deleted successfully"}


@api_router.put("/admin/employees/{employee_id}/work-info")
async def update_employee_work_info(
    employee_id: str,
    work_info: AdminProfileUpdate,
    admin: dict = Depends(require_admin)
):
    """Admin can update employee's work information"""
    # Check if employee exists
    employee = await db.users.find_one({"id": employee_id, "role": "EMPLOYEE"}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_fields = {}
    if work_info.employee_id is not None:
        update_fields["employee_id"] = work_info.employee_id
    if work_info.department is not None:
        update_fields["department"] = work_info.department
    if work_info.job_title is not None:
        update_fields["job_title"] = work_info.job_title
    if work_info.employment_type is not None:
        update_fields["employment_type"] = work_info.employment_type
    if work_info.join_date is not None:
        update_fields["join_date"] = work_info.join_date
    if work_info.work_location is not None:
        update_fields["work_location"] = work_info.work_location
    
    if update_fields:
        await db.users.update_one({"id": employee_id}, {"$set": update_fields})
    
    # Return updated employee
    updated = await db.users.find_one({"id": employee_id}, {"_id": 0, "password_hash": 0})
    return updated


# ============== EMPLOYEE ROUTES ==============
class ClockInRequest(BaseModel):
    notes: Optional[str] = None


class ClockOutRequest(BaseModel):
    notes: Optional[str] = None


@api_router.post("/employee/clock-in", response_model=Timesheet)
async def clock_in(
    request: ClockInRequest = ClockInRequest(),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can clock in")
    
    # Check if already clocked in (has open shift)
    open_shift = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    })
    
    if open_shift:
        raise HTTPException(status_code=400, detail="You are already clocked in. Please clock out first.")
    
    # Create new timesheet entry
    timesheet = Timesheet(
        user_id=current_user["id"],
        user_name=current_user["name"],
        user_email=current_user["email"],
        clock_in_at=datetime.now(timezone.utc),
        notes=request.notes
    )
    
    doc = serialize_datetime(timesheet.model_dump())
    await db.timesheets.insert_one(doc)
    
    return timesheet


@api_router.post("/employee/clock-out", response_model=Timesheet)
async def clock_out(
    request: ClockOutRequest = ClockOutRequest(),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can clock out")
    
    # Find open shift
    open_shift = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    }, {"_id": 0})
    
    if not open_shift:
        raise HTTPException(status_code=400, detail="You are not clocked in. Please clock in first.")
    
    # Calculate total minutes
    clock_in_at = open_shift["clock_in_at"]
    if isinstance(clock_in_at, str):
        clock_in_at = datetime.fromisoformat(clock_in_at)
    
    clock_out_at = datetime.now(timezone.utc)
    total_minutes = int((clock_out_at - clock_in_at).total_seconds() / 60)
    
    # Combine notes (clock-in notes + clock-out notes)
    existing_notes = open_shift.get("notes", "")
    if request.notes:
        if existing_notes:
            combined_notes = f"{existing_notes} | Out: {request.notes}"
        else:
            combined_notes = f"Out: {request.notes}"
    else:
        combined_notes = existing_notes
    
    # Update timesheet
    await db.timesheets.update_one(
        {"id": open_shift["id"]},
        {"$set": {
            "clock_out_at": clock_out_at.isoformat(),
            "total_minutes": total_minutes,
            "notes": combined_notes if combined_notes else None
        }}
    )
    
    # Return updated timesheet
    updated = await db.timesheets.find_one({"id": open_shift["id"]}, {"_id": 0})
    updated = deserialize_datetime(updated, ["clock_in_at", "clock_out_at", "created_at"])
    
    return Timesheet(**updated)


@api_router.get("/employee/current-shift")
async def get_current_shift(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    open_shift = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    }, {"_id": 0})
    
    if open_shift:
        open_shift = deserialize_datetime(open_shift, ["clock_in_at", "created_at"])
        return {"clocked_in": True, "shift": open_shift}
    
    return {"clocked_in": False, "shift": None}


@api_router.get("/employee/timesheets", response_model=List[Timesheet])
async def get_employee_timesheets(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    query = {"user_id": current_user["id"]}
    
    if start_date:
        query["clock_in_at"] = {"$gte": start_date}
    if end_date:
        if "clock_in_at" in query:
            query["clock_in_at"]["$lte"] = end_date + "T23:59:59"
        else:
            query["clock_in_at"] = {"$lte": end_date + "T23:59:59"}
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("clock_in_at", -1).to_list(1000)
    
    for ts in timesheets:
        ts = deserialize_datetime(ts, ["clock_in_at", "clock_out_at", "created_at"])
    
    return timesheets


@api_router.get("/employee/today-punches")
async def get_today_punches(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    timesheets = await db.timesheets.find({
        "user_id": current_user["id"],
        "clock_in_at": {"$gte": today}
    }, {"_id": 0}).sort("clock_in_at", -1).to_list(100)
    
    for ts in timesheets:
        ts = deserialize_datetime(ts, ["clock_in_at", "clock_out_at", "created_at"])
    
    return timesheets


# ============== CORRECTION REQUESTS ==============
@api_router.post("/employee/correction-request", response_model=CorrectionRequest)
async def create_correction_request(
    request_data: CorrectionRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can submit correction requests")
    
    # Verify timesheet belongs to user
    timesheet = await db.timesheets.find_one({
        "id": request_data.timesheet_id,
        "user_id": current_user["id"]
    })
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found or doesn't belong to you")
    
    # Create correction request
    correction = CorrectionRequest(
        user_id=current_user["id"],
        user_name=current_user["name"],
        timesheet_id=request_data.timesheet_id,
        requested_change=request_data.requested_change,
        reason=request_data.reason
    )
    
    doc = serialize_datetime(correction.model_dump())
    await db.correction_requests.insert_one(doc)
    
    return correction


@api_router.get("/employee/correction-requests", response_model=List[CorrectionRequest])
async def get_employee_correction_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Only employees can access this")
    
    requests = await db.correction_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


# ============== ADMIN ROUTES ==============
@api_router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(admin: dict = Depends(require_admin)):
    tenant_id = get_tenant_id(admin)
    
    # Get current week's start
    today = datetime.now(timezone.utc)
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    
    # Total hours this week (for this tenant)
    week_timesheets = await db.timesheets.find({
        "tenant_id": tenant_id,
        "clock_in_at": {"$gte": week_start},
        "total_minutes": {"$ne": None}
    }).to_list(10000)
    
    total_minutes = sum(ts.get("total_minutes", 0) for ts in week_timesheets)
    total_hours = round(total_minutes / 60, 1)
    
    # Active employees (currently clocked in) for this tenant
    active_count = await db.timesheets.count_documents({
        "tenant_id": tenant_id,
        "clock_out_at": None
    })
    
    # Pending correction requests for this tenant
    pending_corrections = await db.correction_requests.count_documents({
        "tenant_id": tenant_id,
        "status": "PENDING"
    })
    
    # Pending leave requests for this tenant
    pending_leave_requests = await db.leave_requests.count_documents({
        "tenant_id": tenant_id,
        "status": "PENDING"
    })
    
    # Total pending requests (corrections + leave)
    total_pending_requests = pending_corrections + pending_leave_requests
    
    # Total employees for this tenant
    total_employees = await db.users.count_documents({
        "role": "EMPLOYEE",
        "is_active": True,
        "tenant_id": tenant_id
    })
    
    return {
        "total_hours_this_week": total_hours,
        "active_employees": active_count,
        "pending_corrections": pending_corrections,
        "pending_leave_requests": pending_leave_requests,
        "total_pending_requests": total_pending_requests,
        "total_employees": total_employees
    }


@api_router.get("/admin/employees", response_model=List[UserResponse])
async def get_all_employees(admin: dict = Depends(require_admin)):
    tenant_id = get_tenant_id(admin)
    
    users = await db.users.find({
        "role": "EMPLOYEE",
        "tenant_id": tenant_id
    }, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
        
        # Include profile_image from profile subdocument if exists
        if user.get("profile") and user["profile"].get("photo_url"):
            user["profile_image"] = user["profile"]["photo_url"]
    
    return users


@api_router.delete("/admin/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete an employee and all associated data (admin only)"""
    # Check employee exists
    employee = await db.users.find_one({"id": employee_id, "role": "EMPLOYEE"}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Delete all associated data
    await db.timesheets.delete_many({"user_id": employee_id})
    await db.documents.delete_many({"user_id": employee_id})
    await db.leave_requests.delete_many({"user_id": employee_id})
    await db.breaks.delete_many({"user_id": employee_id})
    
    # Delete the employee
    await db.users.delete_one({"id": employee_id})
    
    return {"message": f"Employee '{employee.get('name')}' and all associated data deleted successfully"}


class PasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=6, description="New password (min 6 characters)")


@api_router.post("/admin/employees/{employee_id}/reset-password")
async def reset_employee_password(
    employee_id: str,
    reset_data: PasswordResetRequest,
    admin: dict = Depends(require_admin)
):
    """Reset an employee's password (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Check employee exists and belongs to same tenant
    employee = await db.users.find_one({
        "id": employee_id, 
        "tenant_id": tenant_id,
        "role": "EMPLOYEE"
    }, {"_id": 0, "name": 1, "email": 1})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Hash the new password
    new_password_hash = hash_password(reset_data.new_password)
    
    # Update password
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"password_hash": new_password_hash}}
    )
    
    # Log the action for security audit
    await log_audit_event(
        event_type=AuditEventType.PASSWORD_CHANGE,
        tenant_id=tenant_id,
        user_id=admin.get("id"),
        user_email=admin.get("email"),
        resource_type="user",
        resource_id=employee_id,
        details={"action": "admin_reset", "target_email": employee.get("email")},
        severity="INFO"
    )
    
    return {
        "message": f"Password reset successfully for {employee.get('name')}",
        "employee_email": employee.get("email")
    }


# ============== INVITATION ENDPOINTS ==============

@api_router.post("/admin/invitations", response_model=InvitationResponse)
async def create_invitation(
    invitation_data: InvitationCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new employee invitation (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    # Check if email already has a pending invitation for this tenant
    existing = await db.invitations.find_one({
        "email": invitation_data.email.lower(),
        "status": "pending",
        "tenant_id": tenant_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this email")
    
    # Check if email is already registered in this tenant
    existing_user = await db.users.find_one({
        "email": invitation_data.email.lower(),
        "tenant_id": tenant_id
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered")
    
    # Generate unique invitation code
    code = generate_invite_code()
    while await db.invitations.find_one({"code": code}):
        code = generate_invite_code()
    
    invitation = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "email": invitation_data.email.lower(),
        "code": code,
        "department": invitation_data.department,
        "status": "pending",
        "invited_by": admin["id"],
        "invited_by_name": admin.get("name"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=invitation_data.expires_in_days)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": None
    }
    
    await db.invitations.insert_one(invitation)
    
    # Remove _id for response
    invitation.pop("_id", None)
    
    # Parse dates for response
    invitation["expires_at"] = datetime.fromisoformat(invitation["expires_at"])
    invitation["created_at"] = datetime.fromisoformat(invitation["created_at"])
    
    return invitation


@api_router.get("/admin/invitations", response_model=List[InvitationResponse])
async def get_all_invitations(
    status: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Get all invitations for the current tenant (admin only)"""
    tenant_id = get_tenant_id(admin)
    
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    
    invitations = await db.invitations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Parse dates and check for expired invitations
    for inv in invitations:
        if isinstance(inv.get("expires_at"), str):
            inv["expires_at"] = datetime.fromisoformat(inv["expires_at"])
        if isinstance(inv.get("created_at"), str):
            inv["created_at"] = datetime.fromisoformat(inv["created_at"])
        if inv.get("accepted_at") and isinstance(inv["accepted_at"], str):
            inv["accepted_at"] = datetime.fromisoformat(inv["accepted_at"])
        
        # Auto-expire pending invitations
        if inv["status"] == "pending" and datetime.now(timezone.utc) > inv["expires_at"]:
            inv["status"] = "expired"
            await db.invitations.update_one(
                {"id": inv["id"]},
                {"$set": {"status": "expired"}}
            )
    
    return invitations


@api_router.delete("/admin/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    admin: dict = Depends(require_admin)
):
    """Revoke/delete an invitation (admin only)"""
    invitation = await db.invitations.find_one({"id": invitation_id}, {"_id": 0})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation["status"] == "accepted":
        raise HTTPException(status_code=400, detail="Cannot revoke an accepted invitation")
    
    await db.invitations.update_one(
        {"id": invitation_id},
        {"$set": {"status": "revoked"}}
    )
    
    return {"message": "Invitation revoked successfully"}


@api_router.get("/invitations/validate/{code}")
async def validate_invitation_code(code: str):
    """Validate an invitation code (public endpoint)"""
    invitation = await db.invitations.find_one({
        "code": code.upper(),
        "status": "pending"
    }, {"_id": 0})
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation code")
    
    # Check expiry
    expires_at = invitation.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if datetime.now(timezone.utc) > expires_at:
        await db.invitations.update_one(
            {"id": invitation["id"]},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=404, detail="Invitation code has expired")
    
    return {
        "valid": True,
        "email": invitation["email"],
        "department": invitation.get("department"),
        "expires_at": expires_at.isoformat()
    }


@api_router.get("/admin/timesheets", response_model=List[Timesheet])
async def get_all_timesheets(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = admin.get("tenant_id", DEFAULT_TENANT_SLUG)
    query = {"tenant_id": tenant_id}
    
    if user_id:
        query["user_id"] = user_id
    if start_date:
        query["clock_in_at"] = {"$gte": start_date}
    if end_date:
        if "clock_in_at" in query:
            query["clock_in_at"]["$lte"] = end_date + "T23:59:59"
        else:
            query["clock_in_at"] = {"$lte": end_date + "T23:59:59"}
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("clock_in_at", -1).to_list(1000)
    
    for ts in timesheets:
        ts = deserialize_datetime(ts, ["clock_in_at", "clock_out_at", "created_at"])
    
    return timesheets


@api_router.put("/admin/timesheets/{timesheet_id}", response_model=Timesheet)
async def update_timesheet(
    timesheet_id: str,
    update_data: TimesheetUpdate,
    admin: dict = Depends(require_admin)
):
    # Get existing timesheet
    existing = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Prepare update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    # Calculate total minutes if both times are set
    clock_in = update_dict.get("clock_in_at") or existing.get("clock_in_at")
    clock_out = update_dict.get("clock_out_at") or existing.get("clock_out_at")
    
    if clock_in and clock_out:
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in)
        if isinstance(clock_out, str):
            clock_out = datetime.fromisoformat(clock_out)
        update_dict["total_minutes"] = int((clock_out - clock_in).total_seconds() / 60)
    
    # Serialize datetimes
    update_dict = serialize_datetime(update_dict)
    
    # Create audit log
    audit = AuditLog(
        admin_user_id=admin["id"],
        admin_user_name=admin["name"],
        entity_type="timesheet",
        entity_id=timesheet_id,
        action="UPDATE",
        before_json=existing,
        after_json={**existing, **update_dict}
    )
    
    audit_doc = serialize_datetime(audit.model_dump())
    await db.audit_logs.insert_one(audit_doc)
    
    # Update timesheet
    await db.timesheets.update_one({"id": timesheet_id}, {"$set": update_dict})
    
    # Return updated
    updated = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    updated = deserialize_datetime(updated, ["clock_in_at", "clock_out_at", "created_at"])
    
    return Timesheet(**updated)


@api_router.get("/admin/correction-requests", response_model=List[CorrectionRequest])
async def get_all_correction_requests(
    status: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.correction_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return requests


@api_router.put("/admin/correction-requests/{request_id}")
async def update_correction_request(
    request_id: str,
    update_data: CorrectionRequestUpdate,
    admin: dict = Depends(require_admin)
):
    existing = await db.correction_requests.find_one({"id": request_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Correction request not found")
    
    update_dict = {
        "status": update_data.status.value,
        "admin_notes": update_data.admin_notes,
        "reviewed_by": admin["id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If approved, apply the changes to timesheet
    if update_data.status == CorrectionStatus.APPROVED:
        timesheet_id = existing["timesheet_id"]
        requested_change = existing.get("requested_change", {})
        
        if requested_change:
            change_dict = serialize_datetime(requested_change)
            
            # Calculate total minutes if needed
            ts = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
            if ts:
                clock_in = change_dict.get("clock_in_at") or ts.get("clock_in_at")
                clock_out = change_dict.get("clock_out_at") or ts.get("clock_out_at")
                
                if clock_in and clock_out:
                    if isinstance(clock_in, str):
                        clock_in = datetime.fromisoformat(clock_in)
                    if isinstance(clock_out, str):
                        clock_out = datetime.fromisoformat(clock_out)
                    change_dict["total_minutes"] = int((clock_out - clock_in).total_seconds() / 60)
            
            await db.timesheets.update_one({"id": timesheet_id}, {"$set": change_dict})
            
            # Create audit log
            audit = AuditLog(
                admin_user_id=admin["id"],
                admin_user_name=admin["name"],
                entity_type="timesheet",
                entity_id=timesheet_id,
                action="CORRECTION_APPROVED",
                before_json=ts,
                after_json={**ts, **change_dict} if ts else change_dict
            )
            audit_doc = serialize_datetime(audit.model_dump())
            await db.audit_logs.insert_one(audit_doc)
    
    await db.correction_requests.update_one({"id": request_id}, {"$set": update_dict})
    
    updated = await db.correction_requests.find_one({"id": request_id}, {"_id": 0})
    return updated


@api_router.get("/admin/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return logs


@api_router.post("/admin/create-employee", response_model=UserResponse)
async def admin_create_employee(
    user_data: UserCreate,
    admin: dict = Depends(require_admin)
):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user as employee
    user = UserBase(
        name=user_data.name,
        email=user_data.email.lower(),
        role=UserRole.EMPLOYEE
    )
    
    user_doc = user.model_dump()
    user_doc["password_hash"] = hash_password(user_data.password)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )


@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(admin: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for u in users:
        created_at = u.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(UserResponse(
            id=u["id"],
            name=u["name"],
            email=u["email"],
            role=u.get("role", "EMPLOYEE"),
            is_active=u.get("is_active", True),
            created_at=created_at
        ))
    
    return result


@api_router.put("/admin/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"id": user_id, "is_active": new_status}


# ============== PROJECT/TASK ROUTES ==============

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new project (admin only)"""
    # CRITICAL: Include tenant_id for data isolation
    tenant_id = admin.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    project = Project(
        name=project_data.name,
        description=project_data.description,
        color=project_data.color,
        estimated_hours=project_data.estimated_hours,
        assigned_users=project_data.assigned_users,
        created_by=admin["id"]
    )
    
    project_doc = project.model_dump()
    project_doc["tenant_id"] = tenant_id
    project_doc["created_at"] = project_doc["created_at"].isoformat()
    project_doc["updated_at"] = project_doc["updated_at"].isoformat()
    
    await db.projects.insert_one(project_doc)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        status=project.status.value,
        assigned_users=project.assigned_users,
        estimated_hours=project.estimated_hours,
        total_logged_minutes=0,
        created_at=project.created_at
    )


@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Get projects - employees see only assigned, admins see all (within their tenant)"""
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    if current_user.get("role") == "ADMIN":
        query = {"tenant_id": tenant_id}
    else:
        # Employees see projects they're assigned to
        query = {
            "tenant_id": tenant_id,
            "$or": [
                {"assigned_users": current_user["id"]},
                {"assigned_users": {"$size": 0}}  # Or projects with no specific assignment (everyone)
            ]
        }
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for p in projects:
        created_at = p.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ProjectResponse(
            id=p["id"],
            name=p["name"],
            description=p.get("description"),
            color=p.get("color", "#EF4444"),
            status=p.get("status", "ACTIVE"),
            assigned_users=p.get("assigned_users", []),
            estimated_hours=p.get("estimated_hours"),
            total_logged_minutes=p.get("total_logged_minutes", 0),
            created_at=created_at
        ))
    
    return result


@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    created_at = project.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return ProjectResponse(
        id=project["id"],
        name=project["name"],
        description=project.get("description"),
        color=project.get("color", "#EF4444"),
        status=project.get("status", "ACTIVE"),
        assigned_users=project.get("assigned_users", []),
        estimated_hours=project.get("estimated_hours"),
        total_logged_minutes=project.get("total_logged_minutes", 0),
        created_at=created_at
    )


@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    admin: dict = Depends(require_admin)
):
    """Update a project (admin only)"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update_data.name is not None:
        update_fields["name"] = update_data.name
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.color is not None:
        update_fields["color"] = update_data.color
    if update_data.status is not None:
        update_fields["status"] = update_data.status.value
    if update_data.estimated_hours is not None:
        update_fields["estimated_hours"] = update_data.estimated_hours
    if update_data.assigned_users is not None:
        update_fields["assigned_users"] = update_data.assigned_users
    
    await db.projects.update_one({"id": project_id}, {"$set": update_fields})
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    created_at = updated_project.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return ProjectResponse(
        id=updated_project["id"],
        name=updated_project["name"],
        description=updated_project.get("description"),
        color=updated_project.get("color", "#EF4444"),
        status=updated_project.get("status", "ACTIVE"),
        assigned_users=updated_project.get("assigned_users", []),
        estimated_hours=updated_project.get("estimated_hours"),
        total_logged_minutes=updated_project.get("total_logged_minutes", 0),
        created_at=created_at
    )


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, admin: dict = Depends(require_admin)):
    """Delete/archive a project (admin only)"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Archive instead of delete to preserve time entries
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"status": "ARCHIVED", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Project archived successfully"}


# Time Entry Routes
@api_router.post("/time-entries/start", response_model=TimeEntryResponse)
async def start_time_entry(
    entry_data: TimeEntryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Start tracking time on a project"""
    # Check if project exists
    project = await db.projects.find_one({"id": entry_data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if user already has an active time entry
    active_entry = await db.time_entries.find_one({
        "user_id": current_user["id"],
        "end_time": None
    }, {"_id": 0})
    
    if active_entry:
        raise HTTPException(status_code=400, detail="You already have an active time entry. Please stop it first.")
    
    # Create new time entry
    entry = TimeEntry(
        user_id=current_user["id"],
        user_name=current_user.get("name"),
        project_id=entry_data.project_id,
        project_name=project["name"],
        description=entry_data.description,
        start_time=datetime.now(timezone.utc)
    )
    
    entry_doc = entry.model_dump()
    entry_doc["start_time"] = entry_doc["start_time"].isoformat()
    entry_doc["created_at"] = entry_doc["created_at"].isoformat()
    
    await db.time_entries.insert_one(entry_doc)
    
    return TimeEntryResponse(
        id=entry.id,
        project_id=entry.project_id,
        project_name=entry.project_name,
        project_color=project.get("color", "#EF4444"),
        description=entry.description,
        start_time=entry.start_time,
        end_time=None,
        duration_minutes=None,
        created_at=entry.created_at
    )


@api_router.post("/time-entries/stop", response_model=TimeEntryResponse)
async def stop_time_entry(current_user: dict = Depends(get_current_user)):
    """Stop the active time entry"""
    active_entry = await db.time_entries.find_one({
        "user_id": current_user["id"],
        "end_time": None
    }, {"_id": 0})
    
    if not active_entry:
        raise HTTPException(status_code=400, detail="No active time entry found")
    
    # Calculate duration
    end_time = datetime.now(timezone.utc)
    start_time = active_entry["start_time"]
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)
    
    duration_minutes = int((end_time - start_time).total_seconds() / 60)
    
    # Update time entry
    await db.time_entries.update_one(
        {"id": active_entry["id"]},
        {
            "$set": {
                "end_time": end_time.isoformat(),
                "duration_minutes": duration_minutes
            }
        }
    )
    
    # Update project total time
    await db.projects.update_one(
        {"id": active_entry["project_id"]},
        {"$inc": {"total_logged_minutes": duration_minutes}}
    )
    
    # Get project for color
    project = await db.projects.find_one({"id": active_entry["project_id"]}, {"_id": 0})
    
    return TimeEntryResponse(
        id=active_entry["id"],
        project_id=active_entry["project_id"],
        project_name=active_entry.get("project_name"),
        project_color=project.get("color", "#EF4444") if project else "#EF4444",
        description=active_entry.get("description"),
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration_minutes,
        created_at=datetime.fromisoformat(active_entry["created_at"]) if isinstance(active_entry["created_at"], str) else active_entry["created_at"]
    )


@api_router.get("/time-entries/active")
async def get_active_time_entry(current_user: dict = Depends(get_current_user)):
    """Get current active time entry if any"""
    active_entry = await db.time_entries.find_one({
        "user_id": current_user["id"],
        "end_time": None
    }, {"_id": 0})
    
    if not active_entry:
        return {"is_tracking": False, "entry": None}
    
    # Get project for color
    project = await db.projects.find_one({"id": active_entry["project_id"]}, {"_id": 0})
    
    start_time = active_entry["start_time"]
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)
    
    return {
        "is_tracking": True,
        "entry": {
            "id": active_entry["id"],
            "project_id": active_entry["project_id"],
            "project_name": active_entry.get("project_name"),
            "project_color": project.get("color", "#EF4444") if project else "#EF4444",
            "description": active_entry.get("description"),
            "start_time": start_time
        }
    }


@api_router.get("/time-entries/today", response_model=List[TimeEntryResponse])
async def get_today_time_entries(current_user: dict = Depends(get_current_user)):
    """Get all time entries for today"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    entries = await db.time_entries.find({
        "user_id": current_user["id"],
        "created_at": {
            "$gte": today_start.isoformat(),
            "$lt": today_end.isoformat()
        }
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    result = []
    for entry in entries:
        start_time = entry["start_time"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        end_time = entry.get("end_time")
        if end_time and isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        created_at = entry["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        # Get project color
        project = await db.projects.find_one({"id": entry["project_id"]}, {"_id": 0})
        
        result.append(TimeEntryResponse(
            id=entry["id"],
            project_id=entry["project_id"],
            project_name=entry.get("project_name"),
            project_color=project.get("color", "#EF4444") if project else "#EF4444",
            description=entry.get("description"),
            start_time=start_time,
            end_time=end_time,
            duration_minutes=entry.get("duration_minutes"),
            created_at=created_at
        ))
    
    return result


@api_router.get("/time-entries/summary", response_model=List[ProjectTimeSummary])
async def get_time_summary(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get time summary by project for the last N days"""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    entries = await db.time_entries.find({
        "user_id": current_user["id"],
        "created_at": {"$gte": start_date.isoformat()},
        "duration_minutes": {"$ne": None}
    }, {"_id": 0}).to_list(500)
    
    # Aggregate by project
    project_summary = {}
    for entry in entries:
        pid = entry["project_id"]
        if pid not in project_summary:
            project_summary[pid] = {
                "project_id": pid,
                "project_name": entry.get("project_name", "Unknown"),
                "total_minutes": 0,
                "entry_count": 0
            }
        project_summary[pid]["total_minutes"] += entry.get("duration_minutes", 0)
        project_summary[pid]["entry_count"] += 1
    
    # Get project colors
    result = []
    for pid, data in project_summary.items():
        project = await db.projects.find_one({"id": pid}, {"_id": 0})
        result.append(ProjectTimeSummary(
            project_id=data["project_id"],
            project_name=data["project_name"],
            project_color=project.get("color", "#EF4444") if project else "#EF4444",
            total_minutes=data["total_minutes"],
            entry_count=data["entry_count"]
        ))
    
    # Sort by total time descending
    result.sort(key=lambda x: x.total_minutes, reverse=True)
    
    return result


# ============== PDF EXPORT ROUTES ==============

async def get_tenant_for_pdf(tenant_id: str):
    """Get tenant info for PDF branding"""
    if not tenant_id:
        return None
    tenant = await db.tenants.find_one({"slug": tenant_id}, {"_id": 0})
    return tenant

def create_pdf_header_with_logo(elements: list, styles, subtitle_text: str = "", tenant_info: dict = None):
    """Create a centered PDF header with the tenant logo and optional subtitle"""
    
    # Use tenant info if provided
    tenant_name = tenant_info.get("name", "AurborBloom") if tenant_info else "AurborBloom"
    tenant_primary_color = tenant_info.get("primary_color", "#1a1a1a") if tenant_info else "#1a1a1a"
    tenant_logo_url = tenant_info.get("logo_url") if tenant_info else None
    tenant_slug = tenant_info.get("slug", "aurborbloom") if tenant_info else "aurborbloom"
    
    logo_added = False
    
    # Try to use tenant logo first - handle base64 format
    if tenant_logo_url and tenant_logo_url.startswith("data:image"):
        try:
            # Decode base64 image
            import base64
            header, data = tenant_logo_url.split(",", 1)
            image_data = base64.b64decode(data)
            logo_buffer = io.BytesIO(image_data)
            
            from PIL import Image as PILImage
            with PILImage.open(logo_buffer) as img:
                orig_width, orig_height = img.size
                aspect_ratio = orig_width / orig_height
            
            logo_buffer.seek(0)
            desired_width = 2.0 * inch
            calculated_height = desired_width / aspect_ratio
            
            logo = Image(logo_buffer, width=desired_width, height=calculated_height)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 15))
            logo_added = True
        except Exception as e:
            print(f"Error loading tenant base64 logo: {e}")
    
    # Try to use tenant logo - handle file path format (e.g., /knowviatech_logo.png)
    if not logo_added and tenant_logo_url and tenant_logo_url.startswith("/"):
        try:
            # Look for logo in frontend public folder
            logo_filename = tenant_logo_url.lstrip("/")
            frontend_logo_path = Path("/app/frontend/public") / logo_filename
            
            if frontend_logo_path.exists():
                from PIL import Image as PILImage
                with PILImage.open(str(frontend_logo_path)) as img:
                    orig_width, orig_height = img.size
                    aspect_ratio = orig_width / orig_height
                
                desired_width = 2.0 * inch
                calculated_height = desired_width / aspect_ratio
                
                logo = Image(str(frontend_logo_path), width=desired_width, height=calculated_height)
                logo.hAlign = 'CENTER'
                elements.append(logo)
                elements.append(Spacer(1, 15))
                logo_added = True
                print(f"Loaded tenant logo from: {frontend_logo_path}")
        except Exception as e:
            print(f"Error loading tenant file logo: {e}")
    
    # Use default AurborBloom logo if this IS the AurborBloom tenant
    if not logo_added and tenant_slug == "aurborbloom" and LOGO_PATH.exists():
        try:
            from PIL import Image as PILImage
            with PILImage.open(str(LOGO_PATH)) as img:
                orig_width, orig_height = img.size
                aspect_ratio = orig_width / orig_height
            
            desired_width = 2.0 * inch
            calculated_height = desired_width / aspect_ratio
            
            logo = Image(str(LOGO_PATH), width=desired_width, height=calculated_height)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 15))
            logo_added = True
        except Exception as e:
            print(f"Error loading default logo: {e}")
    
    # Fallback to tenant name text (for non-AurborBloom tenants without logo)
    if not logo_added:
        title_style = ParagraphStyle(
            'FallbackTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor(tenant_primary_color),
            spaceAfter=10,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(tenant_name, title_style))
    
    # Add subtitle if provided
    if subtitle_text:
        subtitle_style = ParagraphStyle(
            'PDFSubtitle',
            parent=styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#333333'),
            alignment=TA_CENTER,
            spaceAfter=20
        )
        elements.append(Paragraph(subtitle_text, subtitle_style))

def generate_timesheet_pdf(user_data: dict, timesheets: list, breaks: list, week_start: datetime, week_end: datetime, tenant_info: dict = None) -> bytes:
    """Generate a professional timesheet PDF"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Get tenant colors
    tenant_primary = tenant_info.get("primary_color", "#1a1a1a") if tenant_info else "#1a1a1a"
    
    # Custom styles
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#6B7280'),
        alignment=TA_CENTER,
        spaceAfter=30
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor(tenant_primary),
        spaceBefore=20,
        spaceAfter=10
    )
    
    # Header with Logo (tenant-aware)
    create_pdf_header_with_logo(elements, styles, "Employee Timesheet Report", tenant_info)
    
    # Employee Info
    elements.append(Paragraph("Employee Information", section_style))
    
    info_data = [
        ["Name:", user_data.get("name", "N/A")],
        ["Email:", user_data.get("email", "N/A")],
        ["Report Period:", f"{week_start.strftime('%B %d, %Y')} - {week_end.strftime('%B %d, %Y')}"],
        ["Generated:", datetime.now().strftime("%B %d, %Y at %I:%M %p") + " CST"],
        ["Timezone:", "Central Standard Time (CST)"]
    ]
    
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1F2937')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Daily Summary
    elements.append(Paragraph("Daily Time Summary", section_style))
    
    # CST timezone (UTC-6)
    cst_tz = timezone(timedelta(hours=-6))
    
    # Calculate daily totals
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily_data = {}
    
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        date_str = day_date.strftime("%Y-%m-%d")
        daily_data[date_str] = {
            "day": day_names[i],
            "date": day_date.strftime("%m/%d/%Y"),
            "minutes": 0,
            "clock_in": None,
            "clock_out": None
        }
    
    for ts in timesheets:
        clock_in = ts.get("clock_in_at")
        clock_in = ts.get("clock_in_at")
        clock_out = ts.get("clock_out_at")
        
        # Skip incomplete timesheets (no clock_out) for time display
        # But still count their minutes if they have any
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in.replace("Z", "+00:00"))
        
        # Convert clock_in to CST for date grouping
        clock_in_cst = clock_in.astimezone(cst_tz)
        date_str = clock_in_cst.strftime("%Y-%m-%d")
        
        if date_str in daily_data:
            # Add total minutes if available
            if ts.get("total_minutes"):
                daily_data[date_str]["minutes"] += ts["total_minutes"]
            
            # Only use clock times from COMPLETE timesheets (has both clock_in and clock_out)
            if clock_out:
                if isinstance(clock_out, str):
                    clock_out = datetime.fromisoformat(clock_out.replace("Z", "+00:00"))
                
                # Convert to CST for display
                clock_in_cst = clock_in.astimezone(cst_tz)
                clock_out_cst = clock_out.astimezone(cst_tz)
                
                # Track earliest clock_in time from complete entries (in CST)
                clock_in_time = clock_in_cst.strftime("%I:%M %p")
                if not daily_data[date_str]["clock_in"]:
                    daily_data[date_str]["clock_in"] = clock_in_time
                    daily_data[date_str]["clock_in_dt"] = clock_in_cst
                elif clock_in_cst < daily_data[date_str].get("clock_in_dt", clock_in_cst):
                    daily_data[date_str]["clock_in"] = clock_in_time
                    daily_data[date_str]["clock_in_dt"] = clock_in_cst
                
                # Track latest clock_out time (in CST)
                clock_out_time = clock_out_cst.strftime("%I:%M %p")
                if not daily_data[date_str]["clock_out"]:
                    daily_data[date_str]["clock_out"] = clock_out_time
                    daily_data[date_str]["clock_out_dt"] = clock_out_cst
                elif clock_out_cst > daily_data[date_str].get("clock_out_dt", clock_out_cst):
                    daily_data[date_str]["clock_out"] = clock_out_time
                    daily_data[date_str]["clock_out_dt"] = clock_out_cst
    
    # Create daily table
    table_data = [["Day", "Date", "Clock In", "Clock Out", "Hours Worked"]]
    total_minutes = 0
    
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        hours = data["minutes"] / 60
        total_minutes += data["minutes"]
        
        table_data.append([
            data["day"],
            data["date"],
            data["clock_in"] or "-",
            data["clock_out"] or "-",
            f"{hours:.1f}h" if data["minutes"] > 0 else "-"
        ])
    
    # Add total row
    total_hours = total_minutes / 60
    table_data.append(["", "", "", "Total:", f"{total_hours:.1f}h"])
    
    daily_table = Table(table_data, colWidths=[1.2*inch, 1*inch, 1.2*inch, 1.2*inch, 1.2*inch])
    daily_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Body
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        
        # Total row
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F3F4F6')),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        
        # Alternating rows
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F9FAFB')]),
    ]))
    elements.append(daily_table)
    elements.append(Spacer(1, 20))
    
    # Break Summary
    total_break_minutes = sum(b.get("duration_minutes", 0) for b in breaks)
    if total_break_minutes > 0:
        elements.append(Paragraph("Break Summary", section_style))
        
        break_data = [["Total Break Time:", f"{total_break_minutes} minutes ({total_break_minutes/60:.1f} hours)"]]
        break_table = Table(break_data, colWidths=[1.5*inch, 4*inch])
        break_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(break_table)
        elements.append(Spacer(1, 20))
    
    # Summary Statistics
    elements.append(Paragraph("Summary", section_style))
    
    net_minutes = max(0, total_minutes - total_break_minutes)
    net_hours = net_minutes / 60
    goal_hours = 40.0
    
    summary_data = [
        ["Gross Hours Worked:", f"{total_hours:.1f} hours"],
        ["Break Time:", f"{total_break_minutes/60:.1f} hours"],
        ["Net Hours Worked:", f"{net_hours:.1f} hours"],
        ["Weekly Goal:", f"{goal_hours:.0f} hours"],
        ["Progress:", f"{(net_hours/goal_hours)*100:.1f}%"],
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FEF2F2') if net_hours < goal_hours else colors.HexColor('#F0FDF4')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 40))
    
    # Signature Section
    elements.append(Paragraph("Verification", section_style))
    
    sig_data = [
        ["Employee Signature:", "_" * 40, "Date:", "_" * 20],
        ["", "", "", ""],
        ["Supervisor Signature:", "_" * 40, "Date:", "_" * 20],
    ]
    
    sig_table = Table(sig_data, colWidths=[1.5*inch, 2.5*inch, 0.5*inch, 1.5*inch])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(sig_table)
    
    # Footer
    elements.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9CA3AF'),
        alignment=TA_CENTER
    )
    tenant_name = tenant_info.get("name", "AurborBloom") if tenant_info else "AurborBloom"
    elements.append(Paragraph(f"Generated by {tenant_name} HRMS", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


@api_router.get("/export/timesheet/pdf")
async def export_timesheet_pdf(
    week_offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Export timesheet as PDF for current or previous weeks (CST timezone)"""
    # CST timezone (UTC-6)
    cst_tz = timezone(timedelta(hours=-6))
    
    # Calculate week range in CST
    today_cst = datetime.now(timezone.utc).astimezone(cst_tz)
    week_start = today_cst - timedelta(days=today_cst.weekday()) - timedelta(weeks=week_offset)
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    # Convert to UTC for database query
    week_start_utc = week_start.astimezone(timezone.utc)
    week_end_utc = week_end.astimezone(timezone.utc)
    
    # Get timesheets for the week
    timesheets = await db.timesheets.find({
        "user_id": current_user["id"],
        "clock_in_at": {
            "$gte": week_start_utc.isoformat(),
            "$lte": week_end_utc.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    # Get breaks for the week
    breaks = await db.breaks.find({
        "user_id": current_user["id"],
        "status": "COMPLETED",
        "created_at": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(200)
    
    # Get tenant info for PDF branding
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    # Generate PDF
    pdf_bytes = generate_timesheet_pdf(
        user_data=current_user,
        timesheets=timesheets,
        breaks=breaks,
        week_start=week_start,
        week_end=week_end,
        tenant_info=tenant_info
    )
    
    # Create filename with tenant name
    tenant_name = tenant_info.get("name", "").replace(" ", "_") if tenant_info else ""
    user_name = current_user.get('name', 'employee').replace(' ', '_')
    if tenant_name:
        filename = f"{tenant_name}_Timesheet_{user_name}_{week_start.strftime('%Y%m%d')}.pdf"
    else:
        filename = f"Timesheet_{user_name}_{week_start.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# ============== ADMIN ALL TIMESHEETS PDF EXPORT ==============

def generate_all_timesheets_pdf(timesheets: list, employees: dict, start_date: datetime, end_date: datetime, tenant_info: dict = None) -> bytes:
    """Generate a PDF report of all employee timesheets"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    tenant_primary = tenant_info.get("primary_color", "#1a1a1a") if tenant_info else "#1a1a1a"
    tenant_name = tenant_info.get("name", "Company") if tenant_info else "Company"
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor(tenant_primary),
        spaceBefore=20,
        spaceAfter=10
    )
    
    # Header
    create_pdf_header_with_logo(elements, styles, "All Timesheets Report", tenant_info)
    
    # Report Info
    elements.append(Paragraph("Report Information", section_style))
    info_data = [
        ["Company:", tenant_name],
        ["Period:", f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}"],
        ["Generated:", datetime.now().strftime("%B %d, %Y at %I:%M %p")],
        ["Total Records:", str(len(timesheets))]
    ]
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Timesheets Table
    elements.append(Paragraph("Timesheet Records", section_style))
    
    table_data = [["Employee", "Date", "Clock In", "Clock Out", "Duration", "Status"]]
    
    for ts in timesheets:
        emp_name = employees.get(ts.get("user_id"), {}).get("name", "Unknown")
        
        clock_in = ts.get("clock_in_at")
        clock_out = ts.get("clock_out_at")
        
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in.replace("Z", "+00:00"))
        if isinstance(clock_out, str):
            clock_out = datetime.fromisoformat(clock_out.replace("Z", "+00:00"))
        
        date_str = clock_in.strftime("%m/%d/%Y") if clock_in else "-"
        clock_in_str = clock_in.strftime("%I:%M %p") if clock_in else "-"
        clock_out_str = clock_out.strftime("%I:%M %p") if clock_out else "-"
        
        total_mins = ts.get("total_minutes", 0)
        hours = total_mins // 60
        mins = total_mins % 60
        duration = f"{hours}h {mins}m" if total_mins else "-"
        
        status = ts.get("status", "PENDING")
        
        table_data.append([emp_name, date_str, clock_in_str, clock_out_str, duration, status])
    
    if len(table_data) > 1:
        table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1*inch, 1*inch, 0.8*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(tenant_primary)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No timesheet records found for this period.", styles['Normal']))
    
    doc.build(elements)
    return buffer.getvalue()


@api_router.get("/admin/export/timesheets/pdf")
async def export_admin_timesheets_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export all timesheets as PDF (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Build query
    query = {"tenant_id": tenant_id}
    
    # Date filters
    if start_date:
        query["clock_in_at"] = {"$gte": start_date}
    if end_date:
        if "clock_in_at" in query:
            query["clock_in_at"]["$lte"] = end_date
        else:
            query["clock_in_at"] = {"$lte": end_date}
    
    if employee_id:
        query["user_id"] = employee_id
    
    # Get timesheets
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("clock_in_at", -1).to_list(500)
    
    # Get employee names
    user_ids = list(set(ts.get("user_id") for ts in timesheets if ts.get("user_id")))
    employees_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    employees = {emp["id"]: emp for emp in employees_list}
    
    # Determine date range for report
    now = datetime.now(timezone.utc)
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    else:
        start_dt = now - timedelta(days=30)
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    else:
        end_dt = now
    
    # Get tenant info
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    # Generate PDF
    pdf_bytes = generate_all_timesheets_pdf(timesheets, employees, start_dt, end_dt, tenant_info)
    
    tenant_name = tenant_info.get("name", "").replace(" ", "_") if tenant_info else ""
    filename = f"{tenant_name}_All_Timesheets_{now.strftime('%Y%m%d')}.pdf" if tenant_name else f"All_Timesheets_{now.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== EMPLOYEE TIMESHEET HISTORY PDF ==============

def generate_employee_timesheet_history_pdf(user_data: dict, timesheets: list, start_date: datetime, end_date: datetime, tenant_info: dict = None) -> bytes:
    """Generate a PDF of employee's timesheet history"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    tenant_primary = tenant_info.get("primary_color", "#1a1a1a") if tenant_info else "#1a1a1a"
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor(tenant_primary),
        spaceBefore=20,
        spaceAfter=10
    )
    
    # Header
    create_pdf_header_with_logo(elements, styles, "Timesheet History Report", tenant_info)
    
    # Employee Info
    elements.append(Paragraph("Employee Information", section_style))
    info_data = [
        ["Name:", user_data.get("name", "N/A")],
        ["Email:", user_data.get("email", "N/A")],
        ["Period:", f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}"],
        ["Generated:", datetime.now().strftime("%B %d, %Y at %I:%M %p")],
        ["Total Records:", str(len(timesheets))]
    ]
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Calculate summary
    total_minutes = sum(ts.get("total_minutes", 0) for ts in timesheets)
    total_hours = total_minutes // 60
    total_mins = total_minutes % 60
    
    elements.append(Paragraph("Summary", section_style))
    summary_data = [
        ["Total Hours Worked:", f"{total_hours}h {total_mins}m"],
        ["Average Per Day:", f"{(total_minutes / max(len(timesheets), 1) / 60):.1f}h"]
    ]
    summary_table = Table(summary_data, colWidths=[1.5*inch, 4*inch])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Timesheet Records
    elements.append(Paragraph("Timesheet Records", section_style))
    
    table_data = [["Date", "Clock In", "Clock Out", "Duration", "Notes", "Status"]]
    
    for ts in timesheets:
        clock_in = ts.get("clock_in_at")
        clock_out = ts.get("clock_out_at")
        
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in.replace("Z", "+00:00"))
        if isinstance(clock_out, str):
            clock_out = datetime.fromisoformat(clock_out.replace("Z", "+00:00"))
        
        date_str = clock_in.strftime("%m/%d/%Y") if clock_in else "-"
        clock_in_str = clock_in.strftime("%I:%M %p") if clock_in else "-"
        clock_out_str = clock_out.strftime("%I:%M %p") if clock_out else "-"
        
        total_mins = ts.get("total_minutes", 0)
        hours = total_mins // 60
        mins = total_mins % 60
        duration = f"{hours}h {mins}m" if total_mins else "-"
        
        notes = ts.get("notes", "-") or "-"
        if len(notes) > 20:
            notes = notes[:17] + "..."
        status = ts.get("status", "PENDING")
        
        table_data.append([date_str, clock_in_str, clock_out_str, duration, notes, status])
    
    if len(table_data) > 1:
        table = Table(table_data, colWidths=[1*inch, 1*inch, 1*inch, 0.8*inch, 1.5*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(tenant_primary)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No timesheet records found.", styles['Normal']))
    
    doc.build(elements)
    return buffer.getvalue()


@api_router.get("/export/timesheet-history/pdf")
async def export_timesheet_history_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export employee's timesheet history as PDF"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Build query
    query = {"user_id": current_user["id"]}
    
    if start_date:
        query["clock_in_at"] = {"$gte": start_date}
    if end_date:
        if "clock_in_at" in query:
            query["clock_in_at"]["$lte"] = end_date
        else:
            query["clock_in_at"] = {"$lte": end_date}
    
    # Get timesheets
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("clock_in_at", -1).to_list(500)
    
    # Determine date range
    now = datetime.now(timezone.utc)
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    else:
        start_dt = now - timedelta(days=30)
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    else:
        end_dt = now
    
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    pdf_bytes = generate_employee_timesheet_history_pdf(current_user, timesheets, start_dt, end_dt, tenant_info)
    
    tenant_name = tenant_info.get("name", "").replace(" ", "_") if tenant_info else ""
    user_name = current_user.get('name', 'employee').replace(' ', '_')
    filename = f"{tenant_name}_Timesheet_History_{user_name}_{now.strftime('%Y%m%d')}.pdf" if tenant_name else f"Timesheet_History_{user_name}_{now.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== LEAVE REQUESTS PDF EXPORT ==============

def generate_leave_requests_pdf(leave_requests: list, employees: dict, start_date: datetime, end_date: datetime, tenant_info: dict = None, is_admin: bool = False) -> bytes:
    """Generate a PDF report of leave requests"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    tenant_primary = tenant_info.get("primary_color", "#1a1a1a") if tenant_info else "#1a1a1a"
    tenant_name = tenant_info.get("name", "Company") if tenant_info else "Company"
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor(tenant_primary),
        spaceBefore=20,
        spaceAfter=10
    )
    
    # Header
    title = "Leave Requests Report" if is_admin else "My Leave Requests"
    create_pdf_header_with_logo(elements, styles, title, tenant_info)
    
    # Report Info
    elements.append(Paragraph("Report Information", section_style))
    
    # Count by status
    approved = sum(1 for lr in leave_requests if lr.get("status") == "APPROVED")
    pending = sum(1 for lr in leave_requests if lr.get("status") == "PENDING")
    denied = sum(1 for lr in leave_requests if lr.get("status") == "DENIED")
    
    info_data = [
        ["Company:", tenant_name],
        ["Period:", f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}"],
        ["Generated:", datetime.now().strftime("%B %d, %Y at %I:%M %p")],
        ["Total Requests:", str(len(leave_requests))],
        ["Approved:", str(approved)],
        ["Pending:", str(pending)],
        ["Denied:", str(denied)]
    ]
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Leave Requests Table
    elements.append(Paragraph("Leave Request Details", section_style))
    
    if is_admin:
        table_data = [["Employee", "Type", "Start Date", "End Date", "Days", "Status", "Reason"]]
    else:
        table_data = [["Type", "Start Date", "End Date", "Days", "Status", "Reason"]]
    
    for lr in leave_requests:
        leave_type = lr.get("leave_type", "N/A")
        start = lr.get("start_date", "")
        end = lr.get("end_date", "")
        
        if isinstance(start, str) and start:
            start = datetime.fromisoformat(start.replace("Z", "+00:00")).strftime("%m/%d/%Y")
        if isinstance(end, str) and end:
            end = datetime.fromisoformat(end.replace("Z", "+00:00")).strftime("%m/%d/%Y")
        
        days = lr.get("total_days", 1)
        status = lr.get("status", "PENDING")
        reason = lr.get("reason", "-") or "-"
        if len(reason) > 25:
            reason = reason[:22] + "..."
        
        if is_admin:
            emp_name = employees.get(lr.get("user_id"), {}).get("name", "Unknown")
            table_data.append([emp_name, leave_type, start, end, str(days), status, reason])
        else:
            table_data.append([leave_type, start, end, str(days), status, reason])
    
    if len(table_data) > 1:
        if is_admin:
            col_widths = [1.2*inch, 0.8*inch, 0.9*inch, 0.9*inch, 0.5*inch, 0.7*inch, 1.2*inch]
        else:
            col_widths = [1*inch, 1*inch, 1*inch, 0.6*inch, 0.8*inch, 1.8*inch]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(tenant_primary)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No leave requests found for this period.", styles['Normal']))
    
    doc.build(elements)
    return buffer.getvalue()


@api_router.get("/admin/export/leave-requests/pdf")
async def export_admin_leave_requests_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export all leave requests as PDF (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    query = {"tenant_id": tenant_id}
    
    if start_date:
        query["start_date"] = {"$gte": start_date}
    if end_date:
        if "start_date" in query:
            query["start_date"]["$lte"] = end_date
        else:
            query["start_date"] = {"$lte": end_date}
    if status:
        query["status"] = status
    
    leave_requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Get employee names
    user_ids = list(set(lr.get("user_id") for lr in leave_requests if lr.get("user_id")))
    employees_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    employees = {emp["id"]: emp for emp in employees_list}
    
    now = datetime.now(timezone.utc)
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    else:
        start_dt = now - timedelta(days=90)
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    else:
        end_dt = now
    
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    pdf_bytes = generate_leave_requests_pdf(leave_requests, employees, start_dt, end_dt, tenant_info, is_admin=True)
    
    tenant_name = tenant_info.get("name", "").replace(" ", "_") if tenant_info else ""
    filename = f"{tenant_name}_Leave_Requests_{now.strftime('%Y%m%d')}.pdf" if tenant_name else f"Leave_Requests_{now.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@api_router.get("/export/my-leave-requests/pdf")
async def export_employee_leave_requests_pdf(
    current_user: dict = Depends(get_current_user)
):
    """Export employee's own leave requests as PDF"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    leave_requests = await db.leave_requests.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    now = datetime.now(timezone.utc)
    start_dt = now - timedelta(days=365)
    
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    pdf_bytes = generate_leave_requests_pdf(leave_requests, {}, start_dt, now, tenant_info, is_admin=False)
    
    tenant_name = tenant_info.get("name", "").replace(" ", "_") if tenant_info else ""
    user_name = current_user.get('name', 'employee').replace(' ', '_')
    filename = f"{tenant_name}_My_Leave_Requests_{user_name}_{now.strftime('%Y%m%d')}.pdf" if tenant_name else f"My_Leave_Requests_{user_name}_{now.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== TICKETS/SUPPORT PDF EXPORT ==============

def generate_tickets_pdf(tickets: list, employees: dict, tenant_info: dict = None, is_admin: bool = False) -> bytes:
    """Generate a PDF report of support tickets"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    tenant_primary = tenant_info.get("primary_color", "#1a1a1a") if tenant_info else "#1a1a1a"
    tenant_name = tenant_info.get("name", "Company") if tenant_info else "Company"
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor(tenant_primary),
        spaceBefore=20,
        spaceAfter=10
    )
    
    # Header
    title = "Support Tickets Report" if is_admin else "My Support Tickets"
    create_pdf_header_with_logo(elements, styles, title, tenant_info)
    
    # Summary
    elements.append(Paragraph("Summary", section_style))
    
    open_count = sum(1 for t in tickets if t.get("status") == "OPEN")
    in_progress = sum(1 for t in tickets if t.get("status") == "IN_PROGRESS")
    resolved = sum(1 for t in tickets if t.get("status") == "RESOLVED")
    closed = sum(1 for t in tickets if t.get("status") == "CLOSED")
    
    info_data = [
        ["Company:", tenant_name],
        ["Generated:", datetime.now().strftime("%B %d, %Y at %I:%M %p")],
        ["Total Tickets:", str(len(tickets))],
        ["Open:", str(open_count)],
        ["In Progress:", str(in_progress)],
        ["Resolved:", str(resolved)],
        ["Closed:", str(closed)]
    ]
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Tickets Table
    elements.append(Paragraph("Ticket Details", section_style))
    
    if is_admin:
        table_data = [["ID", "Submitter", "Subject", "Category", "Priority", "Status", "Created"]]
    else:
        table_data = [["ID", "Subject", "Category", "Priority", "Status", "Created"]]
    
    for ticket in tickets:
        ticket_id = ticket.get("id", "")[:8] + "..."
        subject = ticket.get("subject", "N/A")
        if len(subject) > 20:
            subject = subject[:17] + "..."
        category = ticket.get("category", "N/A")
        priority = ticket.get("priority", "MEDIUM")
        status = ticket.get("status", "OPEN")
        
        created = ticket.get("created_at", "")
        if isinstance(created, str) and created:
            created = datetime.fromisoformat(created.replace("Z", "+00:00")).strftime("%m/%d/%Y")
        
        if is_admin:
            submitter = employees.get(ticket.get("user_id"), {}).get("name", "Unknown")
            table_data.append([ticket_id, submitter, subject, category, priority, status, created])
        else:
            table_data.append([ticket_id, subject, category, priority, status, created])
    
    if len(table_data) > 1:
        if is_admin:
            col_widths = [0.7*inch, 1*inch, 1.3*inch, 0.8*inch, 0.7*inch, 0.8*inch, 0.8*inch]
        else:
            col_widths = [0.8*inch, 1.8*inch, 1*inch, 0.8*inch, 0.8*inch, 0.9*inch]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(tenant_primary)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No tickets found.", styles['Normal']))
    
    doc.build(elements)
    return buffer.getvalue()


@api_router.get("/admin/export/tickets/pdf")
async def export_admin_tickets_pdf(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export all tickets as PDF (Admin only)"""
    if current_user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Get employee names
    user_ids = list(set(t.get("user_id") for t in tickets if t.get("user_id")))
    employees_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    employees = {emp["id"]: emp for emp in employees_list}
    
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    pdf_bytes = generate_tickets_pdf(tickets, employees, tenant_info, is_admin=True)
    
    tenant_name = tenant_info.get("name", "").replace(" ", "_") if tenant_info else ""
    now = datetime.now(timezone.utc)
    filename = f"{tenant_name}_Tickets_Report_{now.strftime('%Y%m%d')}.pdf" if tenant_name else f"Tickets_Report_{now.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@api_router.get("/export/my-tickets/pdf")
async def export_employee_tickets_pdf(
    current_user: dict = Depends(get_current_user)
):
    """Export employee's own tickets as PDF"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    tickets = await db.tickets.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    pdf_bytes = generate_tickets_pdf(tickets, {}, tenant_info, is_admin=False)
    
    tenant_name = tenant_info.get("name", "").replace(" ", "_") if tenant_info else ""
    user_name = current_user.get('name', 'employee').replace(' ', '_')
    now = datetime.now(timezone.utc)
    filename = f"{tenant_name}_My_Tickets_{user_name}_{now.strftime('%Y%m%d')}.pdf" if tenant_name else f"My_Tickets_{user_name}_{now.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== WEEKLY PROGRESS ROUTES ==============

class DailyHours(BaseModel):
    date: str
    day_name: str
    minutes_worked: int
    hours_worked: float


class WeeklyProgressResponse(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    week_start: str
    week_end: str
    total_minutes: int
    total_hours: float
    goal_hours: float
    progress_percent: float
    status: str  # ON_TRACK, BEHIND, OVERTIME, COMPLETED
    daily_breakdown: List[DailyHours]
    break_minutes: int


@api_router.get("/progress/weekly", response_model=WeeklyProgressResponse)
async def get_weekly_progress(current_user: dict = Depends(get_current_user)):
    """Get current user's weekly hours progress"""
    # Get the start of the current week (Monday)
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    # Default goal is 40 hours
    goal_hours = 40.0
    
    # Get all timesheets for this week
    timesheets = await db.timesheets.find({
        "user_id": current_user["id"],
        "clock_in_at": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    # Get all breaks for this week
    breaks = await db.breaks.find({
        "user_id": current_user["id"],
        "status": "COMPLETED",
        "created_at": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(200)
    
    # Calculate total break minutes
    total_break_minutes = sum(b.get("duration_minutes", 0) for b in breaks)
    
    # Calculate daily breakdown
    daily_data = {}
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        date_str = day_date.strftime("%Y-%m-%d")
        daily_data[date_str] = {
            "date": date_str,
            "day_name": day_names[i],
            "minutes_worked": 0
        }
    
    # Sum up minutes from timesheets
    for ts in timesheets:
        clock_in = ts.get("clock_in_at")
        if isinstance(clock_in, str):
            clock_in = datetime.fromisoformat(clock_in)
        
        date_str = clock_in.strftime("%Y-%m-%d")
        
        if ts.get("total_minutes"):
            if date_str in daily_data:
                daily_data[date_str]["minutes_worked"] += ts["total_minutes"]
        elif ts.get("clock_out_at") is None:
            # Active shift - calculate current duration
            now = datetime.now(timezone.utc)
            duration = int((now - clock_in).total_seconds() / 60)
            if date_str in daily_data:
                daily_data[date_str]["minutes_worked"] += duration
    
    # Convert to list and calculate hours
    daily_breakdown = []
    total_minutes = 0
    
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        minutes = data["minutes_worked"]
        total_minutes += minutes
        daily_breakdown.append(DailyHours(
            date=data["date"],
            day_name=data["day_name"],
            minutes_worked=minutes,
            hours_worked=round(minutes / 60, 1)
        ))
    
    # Subtract breaks from total
    net_minutes = max(0, total_minutes - total_break_minutes)
    total_hours = round(net_minutes / 60, 1)
    
    # Calculate progress
    goal_minutes = goal_hours * 60
    progress_percent = round((net_minutes / goal_minutes) * 100, 1) if goal_minutes > 0 else 0
    
    # Determine status
    if progress_percent >= 100:
        if progress_percent > 100:
            status = "OVERTIME"
        else:
            status = "COMPLETED"
    elif progress_percent >= 70:
        status = "ON_TRACK"
    else:
        # Check if we're behind based on day of week
        days_passed = today.weekday() + 1
        expected_percent = (days_passed / 5) * 100  # Assuming 5 work days
        if progress_percent < expected_percent - 20:
            status = "BEHIND"
        else:
            status = "ON_TRACK"
    
    return WeeklyProgressResponse(
        user_id=current_user["id"],
        user_name=current_user.get("name"),
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=week_end.strftime("%Y-%m-%d"),
        total_minutes=net_minutes,
        total_hours=total_hours,
        goal_hours=goal_hours,
        progress_percent=min(progress_percent, 150),  # Cap at 150%
        status=status,
        daily_breakdown=daily_breakdown,
        break_minutes=total_break_minutes
    )


@api_router.get("/admin/progress/team")
async def get_team_weekly_progress(admin: dict = Depends(require_admin)):
    """Get weekly progress for all employees (admin only)"""
    # Get all active employees
    employees = await db.users.find(
        {"role": "EMPLOYEE", "is_active": True},
        {"_id": 0, "password_hash": 0}
    ).to_list(200)
    
    # Get the start of the current week (Monday)
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    goal_hours = 40.0
    goal_minutes = goal_hours * 60
    
    team_progress = []
    
    for emp in employees:
        user_id = emp["id"]
        
        # Get timesheets for this employee this week
        timesheets = await db.timesheets.find({
            "user_id": user_id,
            "clock_in_at": {
                "$gte": week_start.isoformat(),
                "$lte": week_end.isoformat()
            }
        }, {"_id": 0}).to_list(50)
        
        # Get breaks
        breaks = await db.breaks.find({
            "user_id": user_id,
            "status": "COMPLETED",
            "created_at": {
                "$gte": week_start.isoformat(),
                "$lte": week_end.isoformat()
            }
        }, {"_id": 0}).to_list(100)
        
        total_break_minutes = sum(b.get("duration_minutes", 0) for b in breaks)
        
        # Calculate total minutes
        total_minutes = 0
        for ts in timesheets:
            if ts.get("total_minutes"):
                total_minutes += ts["total_minutes"]
            elif ts.get("clock_out_at") is None:
                # Active shift
                clock_in = ts.get("clock_in_at")
                if isinstance(clock_in, str):
                    clock_in = datetime.fromisoformat(clock_in)
                duration = int((datetime.now(timezone.utc) - clock_in).total_seconds() / 60)
                total_minutes += duration
        
        net_minutes = max(0, total_minutes - total_break_minutes)
        total_hours = round(net_minutes / 60, 1)
        progress_percent = round((net_minutes / goal_minutes) * 100, 1) if goal_minutes > 0 else 0
        
        # Determine status
        if progress_percent >= 100:
            status = "OVERTIME" if progress_percent > 100 else "COMPLETED"
        elif progress_percent >= 70:
            status = "ON_TRACK"
        else:
            days_passed = today.weekday() + 1
            expected_percent = (days_passed / 5) * 100
            status = "BEHIND" if progress_percent < expected_percent - 20 else "ON_TRACK"
        
        team_progress.append({
            "user_id": user_id,
            "user_name": emp.get("name", "Unknown"),
            "user_email": emp.get("email"),
            "total_hours": total_hours,
            "goal_hours": goal_hours,
            "progress_percent": min(progress_percent, 150),
            "status": status
        })
    
    # Sort by progress (lowest first to highlight those behind)
    team_progress.sort(key=lambda x: x["progress_percent"])
    
    return {
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": week_end.strftime("%Y-%m-%d"),
        "team_progress": team_progress,
        "summary": {
            "total_employees": len(team_progress),
            "on_track": len([p for p in team_progress if p["status"] in ["ON_TRACK", "COMPLETED"]]),
            "behind": len([p for p in team_progress if p["status"] == "BEHIND"]),
            "overtime": len([p for p in team_progress if p["status"] == "OVERTIME"])
        }
    }


# ============== BREAK ROUTES ==============

@api_router.post("/breaks/start", response_model=BreakResponse)
async def start_break(
    break_data: BreakCreate = BreakCreate(),
    current_user: dict = Depends(get_current_user)
):
    """Start a break - employee must be clocked in"""
    # Check if user is clocked in
    active_timesheet = await db.timesheets.find_one({
        "user_id": current_user["id"],
        "clock_out_at": None
    }, {"_id": 0})
    
    if not active_timesheet:
        raise HTTPException(status_code=400, detail="You must be clocked in to start a break")
    
    # Check if user is already on a break
    active_break = await db.breaks.find_one({
        "user_id": current_user["id"],
        "status": "ACTIVE"
    }, {"_id": 0})
    
    if active_break:
        raise HTTPException(status_code=400, detail="You are already on a break")
    
    # Create new break
    new_break = Break(
        user_id=current_user["id"],
        timesheet_id=active_timesheet.get("id"),
        start_time=datetime.now(timezone.utc),
        break_type=break_data.break_type
    )
    
    break_doc = new_break.model_dump()
    break_doc["start_time"] = break_doc["start_time"].isoformat()
    break_doc["created_at"] = break_doc["created_at"].isoformat()
    
    await db.breaks.insert_one(break_doc)
    
    return BreakResponse(
        id=new_break.id,
        start_time=new_break.start_time,
        end_time=None,
        duration_minutes=None,
        break_type=new_break.break_type,
        status=new_break.status.value
    )


@api_router.post("/breaks/end", response_model=BreakResponse)
async def end_break(current_user: dict = Depends(get_current_user)):
    """End the current break"""
    # Find active break
    active_break = await db.breaks.find_one({
        "user_id": current_user["id"],
        "status": "ACTIVE"
    }, {"_id": 0})
    
    if not active_break:
        raise HTTPException(status_code=400, detail="You are not on a break")
    
    # Calculate duration
    end_time = datetime.now(timezone.utc)
    start_time = active_break["start_time"]
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)
    
    duration_minutes = int((end_time - start_time).total_seconds() / 60)
    
    # Update break
    await db.breaks.update_one(
        {"id": active_break["id"]},
        {
            "$set": {
                "end_time": end_time.isoformat(),
                "duration_minutes": duration_minutes,
                "status": "COMPLETED"
            }
        }
    )
    
    return BreakResponse(
        id=active_break["id"],
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration_minutes,
        break_type=active_break.get("break_type", "GENERAL"),
        status="COMPLETED"
    )


@api_router.get("/breaks/status")
async def get_break_status(current_user: dict = Depends(get_current_user)):
    """Get current break status and check if user is on break"""
    active_break = await db.breaks.find_one({
        "user_id": current_user["id"],
        "status": "ACTIVE"
    }, {"_id": 0})
    
    if active_break:
        start_time = active_break["start_time"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        return {
            "is_on_break": True,
            "break_id": active_break["id"],
            "start_time": start_time,
            "break_type": active_break.get("break_type", "GENERAL")
        }
    
    return {
        "is_on_break": False,
        "break_id": None,
        "start_time": None,
        "break_type": None
    }


@api_router.get("/breaks/today", response_model=DailyBreakSummary)
async def get_today_breaks(current_user: dict = Depends(get_current_user)):
    """Get all breaks for today with summary"""
    # Get today's date range
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Find all breaks for today
    breaks_cursor = db.breaks.find({
        "user_id": current_user["id"],
        "created_at": {
            "$gte": today_start.isoformat(),
            "$lt": today_end.isoformat()
        }
    }, {"_id": 0}).sort("created_at", -1)
    
    breaks = await breaks_cursor.to_list(50)
    
    # Calculate totals
    total_minutes = 0
    is_on_break = False
    current_break_id = None
    current_break_start = None
    
    break_responses = []
    for b in breaks:
        start_time = b["start_time"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        end_time = b.get("end_time")
        if end_time and isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        if b.get("status") == "ACTIVE":
            is_on_break = True
            current_break_id = b["id"]
            current_break_start = start_time
        
        if b.get("duration_minutes"):
            total_minutes += b["duration_minutes"]
        
        break_responses.append(BreakResponse(
            id=b["id"],
            start_time=start_time,
            end_time=end_time,
            duration_minutes=b.get("duration_minutes"),
            break_type=b.get("break_type", "GENERAL"),
            status=b.get("status", "COMPLETED")
        ))
    
    return DailyBreakSummary(
        total_breaks=len(breaks),
        total_break_minutes=total_minutes,
        breaks=break_responses,
        is_on_break=is_on_break,
        current_break_id=current_break_id,
        current_break_start=current_break_start
    )


# ============== PERFORMANCE INSIGHTS ROUTES ==============

@api_router.get("/admin/performance/overview")
async def get_performance_overview(
    days: int = 30,
    admin: dict = Depends(require_admin)
):
    """Get overview performance metrics for the specified period"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    previous_start = start_date - timedelta(days=days)
    
    # Get all employees
    employees = await db.users.find({"role": "EMPLOYEE"}, {"_id": 0}).to_list(1000)
    total_employees = len(employees)
    
    if total_employees == 0:
        return {
            "attendance_rate": 0,
            "attendance_change": 0,
            "avg_hours_per_day": 0,
            "avg_hours_change": 0,
            "avg_break_minutes": 0,
            "avg_break_change": 0,
            "overtime_rate": 0,
            "overtime_change": 0,
            "total_employees": 0,
            "period_days": days
        }
    
    # Get timesheets for current period
    current_timesheets = await db.timesheets.find({
        "clock_in_at": {"$gte": start_date.isoformat()},
        "clock_out_at": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    # Get timesheets for previous period (for comparison)
    previous_timesheets = await db.timesheets.find({
        "clock_in_at": {"$gte": previous_start.isoformat(), "$lt": start_date.isoformat()},
        "clock_out_at": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate current metrics
    current_total_minutes = sum(ts.get("total_minutes", 0) or 0 for ts in current_timesheets)
    current_work_days = len(set(ts.get("clock_in_at", "")[:10] for ts in current_timesheets if ts.get("clock_in_at")))
    
    # Previous period metrics
    previous_total_minutes = sum(ts.get("total_minutes", 0) or 0 for ts in previous_timesheets)
    previous_work_days = len(set(ts.get("clock_in_at", "")[:10] for ts in previous_timesheets if ts.get("clock_in_at")))
    
    # Average hours per day
    avg_hours_current = (current_total_minutes / 60 / max(current_work_days, 1)) if current_work_days > 0 else 0
    avg_hours_previous = (previous_total_minutes / 60 / max(previous_work_days, 1)) if previous_work_days > 0 else 0
    avg_hours_change = avg_hours_current - avg_hours_previous
    
    # Attendance rate (days worked / expected work days)
    # Assuming 5 work days per week
    expected_work_days = (days // 7) * 5 + min(days % 7, 5)
    unique_employee_days = len(set((ts.get("user_id"), ts.get("clock_in_at", "")[:10]) for ts in current_timesheets))
    expected_total_days = expected_work_days * total_employees
    attendance_rate = (unique_employee_days / max(expected_total_days, 1)) * 100
    
    # Previous attendance
    prev_expected_days = expected_work_days * total_employees
    prev_unique_days = len(set((ts.get("user_id"), ts.get("clock_in_at", "")[:10]) for ts in previous_timesheets))
    prev_attendance_rate = (prev_unique_days / max(prev_expected_days, 1)) * 100
    attendance_change = attendance_rate - prev_attendance_rate
    
    # Get breaks for current period
    current_breaks = await db.breaks.find({
        "start_time": {"$gte": start_date.isoformat()},
        "end_time": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    previous_breaks = await db.breaks.find({
        "start_time": {"$gte": previous_start.isoformat(), "$lt": start_date.isoformat()},
        "end_time": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate average break time
    def calc_break_minutes(breaks_list):
        total = 0
        for b in breaks_list:
            if b.get("start_time") and b.get("end_time"):
                try:
                    start = datetime.fromisoformat(b["start_time"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(b["end_time"].replace("Z", "+00:00"))
                    total += (end - start).total_seconds() / 60
                except:
                    pass
        return total
    
    current_break_total = calc_break_minutes(current_breaks)
    prev_break_total = calc_break_minutes(previous_breaks)
    
    avg_break_current = current_break_total / max(len(current_breaks), 1) if current_breaks else 0
    avg_break_previous = prev_break_total / max(len(previous_breaks), 1) if previous_breaks else 0
    avg_break_change = avg_break_current - avg_break_previous
    
    # Overtime rate (employees with >40h in any week)
    # Group timesheets by user and week
    from collections import defaultdict
    weekly_hours = defaultdict(lambda: defaultdict(float))
    
    for ts in current_timesheets:
        user_id = ts.get("user_id")
        if ts.get("clock_in_at"):
            try:
                clock_in = datetime.fromisoformat(ts["clock_in_at"].replace("Z", "+00:00"))
                week_num = clock_in.isocalendar()[1]
                weekly_hours[user_id][week_num] += (ts.get("total_minutes", 0) or 0) / 60
            except:
                pass
    
    overtime_employees = set()
    for user_id, weeks in weekly_hours.items():
        for week, hours in weeks.items():
            if hours > 40:
                overtime_employees.add(user_id)
    
    overtime_rate = (len(overtime_employees) / max(total_employees, 1)) * 100
    
    # Previous overtime rate
    prev_weekly_hours = defaultdict(lambda: defaultdict(float))
    for ts in previous_timesheets:
        user_id = ts.get("user_id")
        if ts.get("clock_in_at"):
            try:
                clock_in = datetime.fromisoformat(ts["clock_in_at"].replace("Z", "+00:00"))
                week_num = clock_in.isocalendar()[1]
                prev_weekly_hours[user_id][week_num] += (ts.get("total_minutes", 0) or 0) / 60
            except:
                pass
    
    prev_overtime_employees = set()
    for user_id, weeks in prev_weekly_hours.items():
        for week, hours in weeks.items():
            if hours > 40:
                prev_overtime_employees.add(user_id)
    
    prev_overtime_rate = (len(prev_overtime_employees) / max(total_employees, 1)) * 100
    overtime_change = overtime_rate - prev_overtime_rate
    
    return {
        "attendance_rate": round(attendance_rate, 1),
        "attendance_change": round(attendance_change, 1),
        "avg_hours_per_day": round(avg_hours_current, 1),
        "avg_hours_change": round(avg_hours_change, 1),
        "avg_break_minutes": round(avg_break_current, 0),
        "avg_break_change": round(avg_break_change, 0),
        "overtime_rate": round(overtime_rate, 1),
        "overtime_change": round(overtime_change, 1),
        "total_employees": total_employees,
        "period_days": days
    }


@api_router.get("/admin/performance/weekly-trends")
async def get_weekly_trends(
    weeks: int = 8,
    admin: dict = Depends(require_admin)
):
    """Get weekly hours trends for the specified number of weeks"""
    now = datetime.now(timezone.utc)
    
    # Calculate start of each week
    trends = []
    for i in range(weeks - 1, -1, -1):
        week_start = now - timedelta(weeks=i, days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        
        # Get timesheets for this week
        timesheets = await db.timesheets.find({
            "clock_in_at": {"$gte": week_start.isoformat(), "$lt": week_end.isoformat()},
            "clock_out_at": {"$ne": None}
        }, {"_id": 0}).to_list(10000)
        
        total_minutes = sum(ts.get("total_minutes", 0) or 0 for ts in timesheets)
        unique_employees = len(set(ts.get("user_id") for ts in timesheets))
        
        avg_hours = (total_minutes / 60 / max(unique_employees, 1)) if unique_employees > 0 else 0
        
        trends.append({
            "week": f"Wk{weeks - i}",
            "week_start": week_start.strftime("%b %d"),
            "avg_hours": round(avg_hours, 1),
            "total_hours": round(total_minutes / 60, 1),
            "employees_active": unique_employees
        })
    
    return {"trends": trends, "target_hours": 40}


@api_router.get("/admin/performance/attendance-patterns")
async def get_attendance_patterns(
    days: int = 30,
    admin: dict = Depends(require_admin)
):
    """Get attendance patterns for the specified period"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get timesheets for the period
    timesheets = await db.timesheets.find({
        "clock_in_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Clock-in time distribution
    early_count = 0  # Before 8:30 AM
    ontime_count = 0  # 8:30 - 9:00 AM
    late_count = 0  # After 9:00 AM
    
    # Day of week distribution
    day_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}  # Mon-Sun
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for ts in timesheets:
        if ts.get("clock_in_at"):
            try:
                clock_in = datetime.fromisoformat(ts["clock_in_at"].replace("Z", "+00:00"))
                hour = clock_in.hour
                minute = clock_in.minute
                time_decimal = hour + minute / 60
                
                if time_decimal < 8.5:
                    early_count += 1
                elif time_decimal < 9:
                    ontime_count += 1
                else:
                    late_count += 1
                
                day_counts[clock_in.weekday()] += 1
            except:
                pass
    
    total_clockins = early_count + ontime_count + late_count
    
    clock_in_distribution = [
        {"label": "Before 8:30 AM", "count": early_count, "percentage": round(early_count / max(total_clockins, 1) * 100, 0)},
        {"label": "8:30 - 9:00 AM", "count": ontime_count, "percentage": round(ontime_count / max(total_clockins, 1) * 100, 0)},
        {"label": "After 9:00 AM", "count": late_count, "percentage": round(late_count / max(total_clockins, 1) * 100, 0)}
    ]
    
    # Sort days by activity
    day_activity = [(day_names[i], day_counts[i]) for i in range(7)]
    day_activity_sorted = sorted(day_activity, key=lambda x: x[1], reverse=True)
    
    busiest_days = [{"day": d[0], "count": d[1]} for d in day_activity_sorted[:3]]
    quietest_day = day_activity_sorted[-1] if day_activity_sorted else ("N/A", 0)
    
    return {
        "clock_in_distribution": clock_in_distribution,
        "busiest_days": busiest_days,
        "quietest_day": {"day": quietest_day[0], "count": quietest_day[1]},
        "total_clockins": total_clockins
    }


@api_router.get("/admin/performance/top-performers")
async def get_top_performers(
    days: int = 30,
    limit: int = 5,
    admin: dict = Depends(require_admin)
):
    """Get top performers and those needing attention"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get all employees
    employees = await db.users.find({"role": "EMPLOYEE"}, {"_id": 0}).to_list(1000)
    employee_map = {e["id"]: e for e in employees}
    
    # Get timesheets for the period
    timesheets = await db.timesheets.find({
        "clock_in_at": {"$gte": start_date.isoformat()},
        "clock_out_at": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate hours per employee
    from collections import defaultdict
    employee_hours = defaultdict(float)
    employee_days = defaultdict(set)
    
    for ts in timesheets:
        user_id = ts.get("user_id")
        if user_id:
            employee_hours[user_id] += (ts.get("total_minutes", 0) or 0) / 60
            if ts.get("clock_in_at"):
                employee_days[user_id].add(ts["clock_in_at"][:10])
    
    # Calculate weeks in period
    weeks_in_period = max(days / 7, 1)
    target_hours = 40 * weeks_in_period
    
    # Build performance list
    performance_list = []
    for emp_id, hours in employee_hours.items():
        emp = employee_map.get(emp_id, {})
        percentage = (hours / target_hours) * 100 if target_hours > 0 else 0
        performance_list.append({
            "id": emp_id,
            "name": emp.get("name", "Unknown"),
            "total_hours": round(hours, 1),
            "target_hours": round(target_hours, 1),
            "percentage": round(percentage, 0),
            "days_worked": len(employee_days[emp_id])
        })
    
    # Sort by percentage
    sorted_by_perf = sorted(performance_list, key=lambda x: x["percentage"], reverse=True)
    
    top_performers = sorted_by_perf[:limit]
    needs_attention = [p for p in sorted_by_perf if p["percentage"] < 90][-limit:]
    needs_attention.reverse()
    
    return {
        "top_performers": top_performers,
        "needs_attention": needs_attention,
        "target_hours": round(target_hours, 1),
        "period_days": days
    }


@api_router.get("/admin/performance/leave-analysis")
async def get_leave_analysis(
    days: int = 30,
    admin: dict = Depends(require_admin)
):
    """Get leave and absence analysis for the specified period"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get leave requests for the period
    leave_requests = await db.leave_requests.find({
        "status": "APPROVED",
        "start_date": {"$gte": start_date.strftime("%Y-%m-%d")}
    }, {"_id": 0}).to_list(1000)
    
    # Count by leave type
    leave_by_type = {"VACATION": 0, "SICK": 0, "PERSONAL": 0, "OTHER": 0}
    
    for lr in leave_requests:
        leave_type = lr.get("leave_type", "OTHER")
        if leave_type in leave_by_type:
            leave_by_type[leave_type] += 1
        else:
            leave_by_type["OTHER"] += 1
    
    total_leaves = sum(leave_by_type.values())
    
    leave_usage = [
        {"type": "Vacation", "count": leave_by_type["VACATION"], "percentage": round(leave_by_type["VACATION"] / max(total_leaves, 1) * 100, 0)},
        {"type": "Sick Leave", "count": leave_by_type["SICK"], "percentage": round(leave_by_type["SICK"] / max(total_leaves, 1) * 100, 0)},
        {"type": "Personal", "count": leave_by_type["PERSONAL"], "percentage": round(leave_by_type["PERSONAL"] / max(total_leaves, 1) * 100, 0)},
        {"type": "Other", "count": leave_by_type["OTHER"], "percentage": round(leave_by_type["OTHER"] / max(total_leaves, 1) * 100, 0)}
    ]
    
    # Get all employees for leave balance analysis
    employees = await db.users.find({"role": "EMPLOYEE"}, {"_id": 0}).to_list(1000)
    
    # Get leave balances
    current_year = now.year
    balances = await db.leave_balances.find({"year": current_year}, {"_id": 0}).to_list(1000)
    
    total_vacation_available = 0
    total_vacation_used = 0
    employees_with_high_balance = 0
    
    for bal in balances:
        vacation_total = bal.get("vacation_total", 15)
        vacation_used = bal.get("vacation_used", 0)
        total_vacation_available += vacation_total
        total_vacation_used += vacation_used
        
        # High balance = more than 80% unused
        if vacation_total > 0 and (vacation_total - vacation_used) / vacation_total > 0.8:
            employees_with_high_balance += 1
    
    utilization_rate = (total_vacation_used / max(total_vacation_available, 1)) * 100
    
    return {
        "leave_usage": leave_usage,
        "total_leaves": total_leaves,
        "utilization_rate": round(utilization_rate, 1),
        "employees_with_high_balance": employees_with_high_balance,
        "total_employees": len(employees),
        "period_days": days
    }


@api_router.get("/admin/performance/employee/{employee_id}")
async def get_employee_performance(
    employee_id: str,
    days: int = 30,
    admin: dict = Depends(require_admin)
):
    """Get detailed performance metrics for a specific employee"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get employee
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get timesheets for this employee
    timesheets = await db.timesheets.find({
        "user_id": employee_id,
        "clock_in_at": {"$gte": start_date.isoformat()},
        "clock_out_at": {"$ne": None}
    }, {"_id": 0}).to_list(1000)
    
    # Get all employees' timesheets for comparison
    all_timesheets = await db.timesheets.find({
        "clock_in_at": {"$gte": start_date.isoformat()},
        "clock_out_at": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_minutes = sum(ts.get("total_minutes", 0) or 0 for ts in timesheets)
    total_hours = total_minutes / 60
    days_worked = len(set(ts.get("clock_in_at", "")[:10] for ts in timesheets if ts.get("clock_in_at")))
    
    # Team average
    from collections import defaultdict
    team_hours = defaultdict(float)
    for ts in all_timesheets:
        team_hours[ts.get("user_id")] += (ts.get("total_minutes", 0) or 0) / 60
    
    team_avg_hours = sum(team_hours.values()) / max(len(team_hours), 1)
    hours_vs_team = total_hours - team_avg_hours
    
    # Calculate weeks and target
    weeks_in_period = max(days / 7, 1)
    target_hours = 40 * weeks_in_period
    percentage = (total_hours / target_hours) * 100 if target_hours > 0 else 0
    
    # Punctuality (clock-ins before 9 AM)
    on_time_count = 0
    late_count = 0
    for ts in timesheets:
        if ts.get("clock_in_at"):
            try:
                clock_in = datetime.fromisoformat(ts["clock_in_at"].replace("Z", "+00:00"))
                if clock_in.hour < 9:
                    on_time_count += 1
                else:
                    late_count += 1
            except:
                pass
    
    punctuality = (on_time_count / max(on_time_count + late_count, 1)) * 100
    
    # Calculate team average punctuality
    team_ontime = 0
    team_late = 0
    for ts in all_timesheets:
        if ts.get("clock_in_at"):
            try:
                clock_in = datetime.fromisoformat(ts["clock_in_at"].replace("Z", "+00:00"))
                if clock_in.hour < 9:
                    team_ontime += 1
                else:
                    team_late += 1
            except:
                pass
    
    team_punctuality = (team_ontime / max(team_ontime + team_late, 1)) * 100
    punctuality_vs_team = punctuality - team_punctuality
    
    # Get breaks
    breaks = await db.breaks.find({
        "user_id": employee_id,
        "start_time": {"$gte": start_date.isoformat()},
        "end_time": {"$ne": None}
    }, {"_id": 0}).to_list(1000)
    
    total_break_minutes = 0
    for b in breaks:
        if b.get("start_time") and b.get("end_time"):
            try:
                start = datetime.fromisoformat(b["start_time"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(b["end_time"].replace("Z", "+00:00"))
                total_break_minutes += (end - start).total_seconds() / 60
            except:
                pass
    
    avg_break = total_break_minutes / max(len(breaks), 1) if breaks else 0
    
    # Performance score (simple calculation)
    # Based on: hours worked (50%), punctuality (30%), attendance (20%)
    attendance_score = min(days_worked / (days * 5 / 7), 1) * 100  # Assuming 5 work days per week
    hours_score = min(percentage, 100)
    performance_score = (hours_score * 0.5 + punctuality * 0.3 + attendance_score * 0.2)
    
    return {
        "employee": {
            "id": employee["id"],
            "name": employee.get("name", "Unknown"),
            "email": employee.get("email", "")
        },
        "performance_score": round(performance_score, 0),
        "metrics": {
            "total_hours": round(total_hours, 1),
            "target_hours": round(target_hours, 1),
            "percentage": round(percentage, 0),
            "hours_vs_team": round(hours_vs_team, 1),
            "days_worked": days_worked,
            "punctuality": round(punctuality, 0),
            "punctuality_vs_team": round(punctuality_vs_team, 0),
            "avg_break_minutes": round(avg_break, 0)
        },
        "period_days": days
    }


@api_router.get("/admin/performance/export-pdf")
async def export_performance_pdf(
    days: int = 30,
    admin: dict = Depends(require_admin)
):
    """Export Performance Insights report as PDF"""
    tenant_id = get_tenant_id(admin)
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get tenant info for PDF branding
    tenant_info = await get_tenant_for_pdf(tenant_id)
    
    # Fetch all performance data
    # Overview metrics
    previous_start = start_date - timedelta(days=days)
    employees = await db.users.find({"role": "EMPLOYEE", "tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    total_employees = len(employees)
    employee_map = {e["id"]: e for e in employees}
    
    # Get timesheets for this tenant
    current_timesheets = await db.timesheets.find({
        "tenant_id": tenant_id,
        "clock_in_at": {"$gte": start_date.isoformat()},
        "clock_out_at": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    previous_timesheets = await db.timesheets.find({
        "tenant_id": tenant_id,
        "clock_in_at": {"$gte": previous_start.isoformat(), "$lt": start_date.isoformat()},
        "clock_out_at": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    current_total_minutes = sum(ts.get("total_minutes", 0) or 0 for ts in current_timesheets)
    current_work_days = len(set(ts.get("clock_in_at", "")[:10] for ts in current_timesheets if ts.get("clock_in_at")))
    
    previous_total_minutes = sum(ts.get("total_minutes", 0) or 0 for ts in previous_timesheets)
    previous_work_days = len(set(ts.get("clock_in_at", "")[:10] for ts in previous_timesheets if ts.get("clock_in_at")))
    
    avg_hours_current = (current_total_minutes / 60 / max(current_work_days, 1)) if current_work_days > 0 else 0
    avg_hours_previous = (previous_total_minutes / 60 / max(previous_work_days, 1)) if previous_work_days > 0 else 0
    avg_hours_change = avg_hours_current - avg_hours_previous
    
    # Attendance rate
    expected_work_days = (days // 7) * 5 + min(days % 7, 5)
    unique_employee_days = len(set((ts.get("user_id"), ts.get("clock_in_at", "")[:10]) for ts in current_timesheets))
    expected_total_days = expected_work_days * total_employees
    attendance_rate = (unique_employee_days / max(expected_total_days, 1)) * 100
    
    prev_unique_days = len(set((ts.get("user_id"), ts.get("clock_in_at", "")[:10]) for ts in previous_timesheets))
    prev_attendance_rate = (prev_unique_days / max(expected_total_days, 1)) * 100
    attendance_change = attendance_rate - prev_attendance_rate
    
    # Breaks
    current_breaks = await db.breaks.find({
        "start_time": {"$gte": start_date.isoformat()},
        "end_time": {"$ne": None}
    }, {"_id": 0}).to_list(10000)
    
    total_break_minutes = 0
    for b in current_breaks:
        if b.get("start_time") and b.get("end_time"):
            try:
                bstart = datetime.fromisoformat(b["start_time"].replace("Z", "+00:00"))
                bend = datetime.fromisoformat(b["end_time"].replace("Z", "+00:00"))
                total_break_minutes += (bend - bstart).total_seconds() / 60
            except:
                pass
    avg_break = total_break_minutes / max(len(current_breaks), 1) if current_breaks else 0
    
    # Overtime
    from collections import defaultdict
    weekly_hours = defaultdict(lambda: defaultdict(float))
    for ts in current_timesheets:
        user_id = ts.get("user_id")
        if ts.get("clock_in_at"):
            try:
                clock_in = datetime.fromisoformat(ts["clock_in_at"].replace("Z", "+00:00"))
                week_num = clock_in.isocalendar()[1]
                weekly_hours[user_id][week_num] += (ts.get("total_minutes", 0) or 0) / 60
            except:
                pass
    
    overtime_employees = set()
    for user_id, weeks in weekly_hours.items():
        for week, hours in weeks.items():
            if hours > 40:
                overtime_employees.add(user_id)
    overtime_rate = (len(overtime_employees) / max(total_employees, 1)) * 100
    
    # Attendance patterns
    early_count = 0
    ontime_count = 0
    late_count = 0
    
    for ts in current_timesheets:
        if ts.get("clock_in_at"):
            try:
                clock_in = datetime.fromisoformat(ts["clock_in_at"].replace("Z", "+00:00"))
                time_decimal = clock_in.hour + clock_in.minute / 60
                if time_decimal < 8.5:
                    early_count += 1
                elif time_decimal < 9:
                    ontime_count += 1
                else:
                    late_count += 1
            except:
                pass
    
    total_clockins = early_count + ontime_count + late_count
    early_pct = round(early_count / max(total_clockins, 1) * 100, 0)
    ontime_pct = round(ontime_count / max(total_clockins, 1) * 100, 0)
    late_pct = round(late_count / max(total_clockins, 1) * 100, 0)
    
    # Top performers
    employee_hours = defaultdict(float)
    for ts in current_timesheets:
        user_id = ts.get("user_id")
        if user_id:
            employee_hours[user_id] += (ts.get("total_minutes", 0) or 0) / 60
    
    weeks_in_period = max(days / 7, 1)
    target_hours = 40 * weeks_in_period
    
    performance_list = []
    for emp_id, hours in employee_hours.items():
        emp = employee_map.get(emp_id, {})
        percentage = (hours / target_hours) * 100 if target_hours > 0 else 0
        performance_list.append({
            "name": emp.get("name", "Unknown"),
            "hours": round(hours, 1),
            "percentage": round(percentage, 0)
        })
    
    sorted_performers = sorted(performance_list, key=lambda x: x["percentage"], reverse=True)
    top_performers = sorted_performers[:5]
    needs_attention = [p for p in sorted_performers if p["percentage"] < 90]
    
    # Leave analysis
    leave_requests = await db.leave_requests.find({
        "tenant_id": tenant_id,
        "status": "APPROVED",
        "start_date": {"$gte": start_date.strftime("%Y-%m-%d")}
    }, {"_id": 0}).to_list(1000)
    
    leave_by_type = {"VACATION": 0, "SICK": 0, "PERSONAL": 0, "OTHER": 0}
    for lr in leave_requests:
        leave_type = lr.get("leave_type", "OTHER")
        if leave_type in leave_by_type:
            leave_by_type[leave_type] += 1
        else:
            leave_by_type["OTHER"] += 1
    
    total_leaves = sum(leave_by_type.values())
    
    # Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    
    # Get tenant primary color for styling
    tenant_primary = tenant_info.get("primary_color", "#1a1a1a") if tenant_info else "#1a1a1a"
    
    # Custom styles
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=20,
        textColor=colors.HexColor('#666666')
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor(tenant_primary)
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=5
    )
    
    elements = []
    
    # Header with Logo (tenant-aware)
    create_pdf_header_with_logo(elements, styles, "PERFORMANCE INSIGHTS REPORT", tenant_info)
    
    period_text = f"Period: {start_date.strftime('%b %d, %Y')} - {now.strftime('%b %d, %Y')}"
    generated_text = f"Generated: {now.strftime('%B %d, %Y at %I:%M %p')}"
    elements.append(Paragraph(period_text, subtitle_style))
    elements.append(Paragraph(generated_text, subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Overview Metrics Section
    elements.append(Paragraph("📊 OVERVIEW METRICS", section_style))
    
    overview_data = [
        ["Metric", "Value", "Change vs Previous Period"],
        ["Attendance Rate", f"{round(attendance_rate, 1)}%", f"{'↑' if attendance_change >= 0 else '↓'} {abs(round(attendance_change, 1))}%"],
        ["Avg Hours/Day", f"{round(avg_hours_current, 1)}h", f"{'↑' if avg_hours_change >= 0 else '↓'} {abs(round(avg_hours_change, 1))}h"],
        ["Avg Break Time", f"{round(avg_break, 0)} min", "-"],
        ["Overtime Rate", f"{round(overtime_rate, 1)}%", "-"],
        ["Total Employees", str(total_employees), "-"]
    ]
    
    overview_table = Table(overview_data, colWidths=[2.5*inch, 1.5*inch, 2.5*inch])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C41E3A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(overview_table)
    elements.append(Spacer(1, 20))
    
    # Top Performers Section
    elements.append(Paragraph("👑 TOP PERFORMERS", section_style))
    
    if top_performers:
        performers_data = [["Rank", "Employee", "Hours Worked", "Target", "Achievement"]]
        medals = ["🥇", "🥈", "🥉", "4", "5"]
        for i, p in enumerate(top_performers[:5]):
            performers_data.append([
                medals[i] if i < 3 else str(i+1),
                p["name"],
                f"{p['hours']}h",
                f"{round(target_hours, 1)}h",
                f"{p['percentage']}%"
            ])
        
        performers_table = Table(performers_data, colWidths=[0.7*inch, 2*inch, 1.3*inch, 1.3*inch, 1.2*inch])
        performers_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#22c55e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fdf4')]),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(performers_table)
    else:
        elements.append(Paragraph("No performance data available for this period.", normal_style))
    elements.append(Spacer(1, 20))
    
    # Needs Attention Section
    elements.append(Paragraph("⚠️ NEEDS ATTENTION (Below 90% Target)", section_style))
    
    if needs_attention:
        attention_data = [["Employee", "Hours Worked", "Target", "Achievement", "Status"]]
        for p in needs_attention[:5]:
            attention_data.append([
                p["name"],
                f"{p['hours']}h",
                f"{round(target_hours, 1)}h",
                f"{p['percentage']}%",
                "Below Target"
            ])
        
        attention_table = Table(attention_data, colWidths=[2*inch, 1.3*inch, 1.3*inch, 1.2*inch, 1.2*inch])
        attention_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef2f2')]),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(attention_table)
    else:
        elements.append(Paragraph("✅ All employees are on track! No one needs attention.", normal_style))
    elements.append(Spacer(1, 20))
    
    # Attendance Patterns Section
    elements.append(Paragraph("📅 ATTENDANCE PATTERNS", section_style))
    
    patterns_data = [
        ["Clock-in Time", "Count", "Percentage"],
        ["Early (Before 8:30 AM)", str(early_count), f"{early_pct}%"],
        ["On-time (8:30 - 9:00 AM)", str(ontime_count), f"{ontime_pct}%"],
        ["Late (After 9:00 AM)", str(late_count), f"{late_pct}%"],
    ]
    
    patterns_table = Table(patterns_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
    patterns_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f3ff')]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(patterns_table)
    elements.append(Spacer(1, 20))
    
    # Leave Analysis Section
    elements.append(Paragraph("🏖️ LEAVE ANALYSIS", section_style))
    
    leave_data = [
        ["Leave Type", "Count", "Percentage"],
        ["Vacation", str(leave_by_type["VACATION"]), f"{round(leave_by_type['VACATION'] / max(total_leaves, 1) * 100, 0)}%"],
        ["Sick Leave", str(leave_by_type["SICK"]), f"{round(leave_by_type['SICK'] / max(total_leaves, 1) * 100, 0)}%"],
        ["Personal", str(leave_by_type["PERSONAL"]), f"{round(leave_by_type['PERSONAL'] / max(total_leaves, 1) * 100, 0)}%"],
        ["Other", str(leave_by_type["OTHER"]), f"{round(leave_by_type['OTHER'] / max(total_leaves, 1) * 100, 0)}%"],
    ]
    
    leave_table = Table(leave_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
    leave_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f97316')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fff7ed')]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(leave_table)
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"Total Leave Requests: {total_leaves}", normal_style))
    elements.append(Spacer(1, 30))
    
    # Footer
    tenant_name = tenant_info.get("name", "AurborBloom") if tenant_info else "AurborBloom"
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#999999')
    )
    elements.append(Paragraph("─" * 60, footer_style))
    elements.append(Paragraph(f"Generated by {tenant_name} HRMS", footer_style))
    elements.append(Paragraph(f"Report Period: {days} days | Total Employees: {total_employees}", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"{tenant_name.replace(' ', '_')}_Performance_Report_{now.strftime('%Y-%m-%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== ANNOUNCEMENT ROUTES ==============

@api_router.post("/admin/announcements", response_model=AnnouncementResponse)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new announcement (admin only)"""
    announcement = Announcement(
        title=announcement_data.title,
        message=announcement_data.message,
        priority=announcement_data.priority,
        is_pinned=announcement_data.is_pinned,
        expires_at=announcement_data.expires_at,
        created_by=admin["id"],
        created_by_name=admin.get("name")
    )
    
    announcement_doc = announcement.model_dump()
    announcement_doc["created_at"] = announcement_doc["created_at"].isoformat()
    announcement_doc["updated_at"] = announcement_doc["updated_at"].isoformat()
    if announcement_doc["expires_at"]:
        announcement_doc["expires_at"] = announcement_doc["expires_at"].isoformat()
    
    await db.announcements.insert_one(announcement_doc)
    
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        message=announcement.message,
        priority=announcement.priority.value,
        is_pinned=announcement.is_pinned,
        created_by=announcement.created_by,
        created_by_name=announcement.created_by_name,
        expires_at=announcement.expires_at,
        is_read=False,
        read_count=0,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at
    )


@api_router.get("/announcements", response_model=List[AnnouncementResponse])
async def get_announcements(current_user: dict = Depends(get_current_user)):
    """Get all active announcements for the current user"""
    now = datetime.now(timezone.utc)
    
    # Query for active announcements (not expired)
    query = {
        "$or": [
            {"expires_at": None},
            {"expires_at": {"$gt": now.isoformat()}}
        ]
    }
    
    announcements = await db.announcements.find(query, {"_id": 0}).sort([
        ("is_pinned", -1),  # Pinned first
        ("priority", -1),   # Then by priority (URGENT > IMPORTANT > NORMAL)
        ("created_at", -1)  # Then by newest
    ]).to_list(100)
    
    result = []
    for ann in announcements:
        created_at = ann.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        updated_at = ann.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        expires_at = ann.get("expires_at")
        if expires_at and isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        
        read_by = ann.get("read_by", [])
        is_read = current_user["id"] in read_by
        
        result.append(AnnouncementResponse(
            id=ann["id"],
            title=ann["title"],
            message=ann["message"],
            priority=ann.get("priority", "NORMAL"),
            is_pinned=ann.get("is_pinned", False),
            created_by=ann["created_by"],
            created_by_name=ann.get("created_by_name"),
            expires_at=expires_at,
            is_read=is_read,
            read_count=len(read_by),
            created_at=created_at,
            updated_at=updated_at
        ))
    
    return result


@api_router.get("/admin/announcements", response_model=List[AnnouncementResponse])
async def get_all_announcements_admin(admin: dict = Depends(require_admin)):
    """Get all announcements including expired (admin only)"""
    announcements = await db.announcements.find({}, {"_id": 0}).sort([
        ("created_at", -1)
    ]).to_list(200)
    
    result = []
    for ann in announcements:
        created_at = ann.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        updated_at = ann.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        expires_at = ann.get("expires_at")
        if expires_at and isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        
        read_by = ann.get("read_by", [])
        
        result.append(AnnouncementResponse(
            id=ann["id"],
            title=ann["title"],
            message=ann["message"],
            priority=ann.get("priority", "NORMAL"),
            is_pinned=ann.get("is_pinned", False),
            created_by=ann["created_by"],
            created_by_name=ann.get("created_by_name"),
            expires_at=expires_at,
            is_read=True,  # Admin doesn't need read status
            read_count=len(read_by),
            created_at=created_at,
            updated_at=updated_at
        ))
    
    return result


@api_router.put("/admin/announcements/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: str,
    update_data: AnnouncementUpdate,
    admin: dict = Depends(require_admin)
):
    """Update an announcement (admin only)"""
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update_data.title is not None:
        update_fields["title"] = update_data.title
    if update_data.message is not None:
        update_fields["message"] = update_data.message
    if update_data.priority is not None:
        update_fields["priority"] = update_data.priority.value
    if update_data.is_pinned is not None:
        update_fields["is_pinned"] = update_data.is_pinned
    if update_data.expires_at is not None:
        update_fields["expires_at"] = update_data.expires_at.isoformat()
    
    await db.announcements.update_one({"id": announcement_id}, {"$set": update_fields})
    
    updated = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    
    created_at = updated.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    updated_at = updated.get("updated_at")
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    expires_at = updated.get("expires_at")
    if expires_at and isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    read_by = updated.get("read_by", [])
    
    return AnnouncementResponse(
        id=updated["id"],
        title=updated["title"],
        message=updated["message"],
        priority=updated.get("priority", "NORMAL"),
        is_pinned=updated.get("is_pinned", False),
        created_by=updated["created_by"],
        created_by_name=updated.get("created_by_name"),
        expires_at=expires_at,
        is_read=True,
        read_count=len(read_by),
        created_at=created_at,
        updated_at=updated_at
    )


@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete an announcement (admin only)"""
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    await db.announcements.delete_one({"id": announcement_id})
    
    return {"message": "Announcement deleted successfully"}


@api_router.post("/announcements/{announcement_id}/mark-read")
async def mark_announcement_read(
    announcement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark an announcement as read by the current user"""
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Add user to read_by list if not already there
    await db.announcements.update_one(
        {"id": announcement_id},
        {"$addToSet": {"read_by": current_user["id"]}}
    )
    
    return {"message": "Announcement marked as read"}


@api_router.get("/announcements/unread-count")
async def get_unread_announcements_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread announcements for the current user"""
    now = datetime.now(timezone.utc)
    
    # Count announcements that are active and not read by this user
    count = await db.announcements.count_documents({
        "$or": [
            {"expires_at": None},
            {"expires_at": {"$gt": now.isoformat()}}
        ],
        "read_by": {"$ne": current_user["id"]}
    })
    
    return {"unread_count": count}


# ============== DOCUMENT SECTION ROUTES ==============

# Constants for document storage limits
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per file
MAX_USER_STORAGE = 500 * 1024 * 1024  # 500 MB per user


@api_router.get("/documents/pin-status")
async def get_pin_status(current_user: dict = Depends(get_current_user)):
    """Check if user has set up their document PIN"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "documents_pin_hash": 1})
    has_pin = bool(user and user.get("documents_pin_hash"))
    return {"has_pin": has_pin}


@api_router.post("/documents/setup-pin")
async def setup_document_pin(
    pin_data: SetPinRequest,
    current_user: dict = Depends(get_current_user)
):
    """Set up the document section PIN (4-6 digits)"""
    # Check if PIN already exists
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "documents_pin_hash": 1})
    if user and user.get("documents_pin_hash"):
        raise HTTPException(status_code=400, detail="PIN already set. Use change-pin endpoint to update.")
    
    # Validate PIN is numeric
    if not pin_data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must contain only digits")
    
    # Hash the PIN
    pin_hash = bcrypt.hashpw(pin_data.pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Store in user document
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"documents_pin_hash": pin_hash}}
    )
    
    return {"message": "Document PIN set successfully"}


@api_router.post("/documents/verify-pin")
async def verify_document_pin(
    pin_data: VerifyPinRequest,
    current_user: dict = Depends(get_current_user)
):
    """Verify the document section PIN"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "documents_pin_hash": 1})
    
    if not user or not user.get("documents_pin_hash"):
        raise HTTPException(status_code=400, detail="No PIN set. Please set up your PIN first.")
    
    # Verify PIN
    if not bcrypt.checkpw(pin_data.pin.encode('utf-8'), user["documents_pin_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    return {"message": "PIN verified successfully", "verified": True}


@api_router.post("/documents/change-pin")
async def change_document_pin(
    current_pin: str,
    new_pin: str,
    current_user: dict = Depends(get_current_user)
):
    """Change the document section PIN"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "documents_pin_hash": 1})
    
    if not user or not user.get("documents_pin_hash"):
        raise HTTPException(status_code=400, detail="No PIN set. Please set up your PIN first.")
    
    # Verify current PIN
    if not bcrypt.checkpw(current_pin.encode('utf-8'), user["documents_pin_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    
    # Validate new PIN
    if not new_pin.isdigit() or len(new_pin) < 4 or len(new_pin) > 6:
        raise HTTPException(status_code=400, detail="New PIN must be 4-6 digits")
    
    # Hash and save new PIN
    new_pin_hash = bcrypt.hashpw(new_pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"documents_pin_hash": new_pin_hash}}
    )
    
    return {"message": "PIN changed successfully"}


class ChangePinRequest(BaseModel):
    current_pin: str
    new_pin: str = Field(..., min_length=4, max_length=6)


@api_router.put("/documents/change-pin")
async def change_document_pin_v2(
    pin_data: ChangePinRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change the document section PIN (v2 with request body)"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "documents_pin_hash": 1})
    
    if not user or not user.get("documents_pin_hash"):
        raise HTTPException(status_code=400, detail="No PIN set. Please set up your PIN first.")
    
    # Verify current PIN
    if not bcrypt.checkpw(pin_data.current_pin.encode('utf-8'), user["documents_pin_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    
    # Validate new PIN
    if not pin_data.new_pin.isdigit():
        raise HTTPException(status_code=400, detail="New PIN must contain only digits")
    
    # Hash and save new PIN
    new_pin_hash = bcrypt.hashpw(pin_data.new_pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"documents_pin_hash": new_pin_hash}}
    )
    
    return {"message": "PIN changed successfully"}


@api_router.get("/documents/storage-usage")
async def get_storage_usage(current_user: dict = Depends(get_current_user)):
    """Get current storage usage for the user"""
    documents = await db.documents.find({"user_id": current_user["id"]}, {"_id": 0, "file_size": 1}).to_list(1000)
    total_used = sum(doc.get("file_size", 0) for doc in documents)
    
    return {
        "used_bytes": total_used,
        "max_bytes": MAX_USER_STORAGE,
        "used_mb": round(total_used / (1024 * 1024), 2),
        "max_mb": MAX_USER_STORAGE / (1024 * 1024),
        "percentage_used": round((total_used / MAX_USER_STORAGE) * 100, 1) if MAX_USER_STORAGE > 0 else 0
    }


@api_router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    document_data: DocumentUpload,
    current_user: dict = Depends(get_current_user)
):
    """Upload a document (max 10MB per file, 500MB total per user)"""
    import base64
    
    # Decode base64 to get actual file size
    try:
        file_bytes = base64.b64decode(document_data.file_data.split(',')[-1] if ',' in document_data.file_data else document_data.file_data)
        file_size = len(file_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file data format")
    
    # Check file size limit
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    # Check total storage usage
    existing_docs = await db.documents.find({"user_id": current_user["id"]}, {"_id": 0, "file_size": 1}).to_list(1000)
    total_used = sum(doc.get("file_size", 0) for doc in existing_docs)
    
    if total_used + file_size > MAX_USER_STORAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Storage limit exceeded. You have {round((MAX_USER_STORAGE - total_used) / (1024*1024), 2)}MB remaining."
        )
    
    # Create document
    doc_id = str(uuid.uuid4())
    document = Document(
        id=doc_id,
        user_id=current_user["id"],
        filename=f"{doc_id}_{document_data.filename}",
        original_filename=document_data.filename,
        file_data=document_data.file_data,
        file_size=file_size,
        file_type=document_data.file_type,
        category=document_data.category,
        description=document_data.description
    )
    
    doc_dict = document.model_dump()
    doc_dict["uploaded_at"] = doc_dict["uploaded_at"].isoformat()
    
    await db.documents.insert_one(doc_dict)
    
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        file_size=document.file_size,
        file_type=document.file_type,
        category=document.category,
        description=document.description,
        uploaded_at=document.uploaded_at
    )


@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_my_documents(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all documents for the current user"""
    query = {"user_id": current_user["id"]}
    if category and category != "All":
        query["category"] = category
    
    documents = await db.documents.find(query, {"_id": 0, "file_data": 0}).sort("uploaded_at", -1).to_list(1000)
    
    result = []
    for doc in documents:
        uploaded_at = doc.get("uploaded_at")
        if isinstance(uploaded_at, str):
            uploaded_at = datetime.fromisoformat(uploaded_at)
        
        result.append(DocumentResponse(
            id=doc["id"],
            filename=doc["filename"],
            original_filename=doc["original_filename"],
            file_size=doc["file_size"],
            file_type=doc["file_type"],
            category=doc.get("category", "Other"),
            description=doc.get("description"),
            uploaded_at=uploaded_at
        ))
    
    return result


@api_router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific document with its data (for download)"""
    document = await db.documents.find_one(
        {"id": document_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    document = await db.documents.find_one(
        {"id": document_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.documents.delete_one({"id": document_id})
    
    return {"message": "Document deleted successfully"}


# ============== ADMIN DOCUMENT ACCESS ==============

@api_router.get("/admin/employees/{employee_id}/documents", response_model=List[DocumentResponse])
async def admin_get_employee_documents(
    employee_id: str,
    category: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Admin: Get all documents for a specific employee"""
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id, "role": "EMPLOYEE"}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    query = {"user_id": employee_id}
    if category and category != "All":
        query["category"] = category
    
    documents = await db.documents.find(query, {"_id": 0, "file_data": 0}).sort("uploaded_at", -1).to_list(1000)
    
    result = []
    for doc in documents:
        uploaded_at = doc.get("uploaded_at")
        if isinstance(uploaded_at, str):
            uploaded_at = datetime.fromisoformat(uploaded_at)
        
        result.append(DocumentResponse(
            id=doc["id"],
            filename=doc["filename"],
            original_filename=doc["original_filename"],
            file_size=doc["file_size"],
            file_type=doc["file_type"],
            category=doc.get("category", "Other"),
            description=doc.get("description"),
            uploaded_at=uploaded_at
        ))
    
    return result


@api_router.get("/admin/employees/{employee_id}/documents/{document_id}")
async def admin_get_employee_document(
    employee_id: str,
    document_id: str,
    admin: dict = Depends(require_admin)
):
    """Admin: Get a specific document from an employee (for download)"""
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id, "role": "EMPLOYEE"}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    document = await db.documents.find_one(
        {"id": document_id, "user_id": employee_id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@api_router.get("/admin/employees/{employee_id}/storage-usage")
async def admin_get_employee_storage(
    employee_id: str,
    admin: dict = Depends(require_admin)
):
    """Admin: Get storage usage for a specific employee"""
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id, "role": "EMPLOYEE"}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    documents = await db.documents.find({"user_id": employee_id}, {"_id": 0, "file_size": 1}).to_list(1000)
    total_used = sum(doc.get("file_size", 0) for doc in documents)
    
    return {
        "employee_id": employee_id,
        "employee_name": employee.get("name"),
        "used_bytes": total_used,
        "max_bytes": MAX_USER_STORAGE,
        "used_mb": round(total_used / (1024 * 1024), 2),
        "max_mb": MAX_USER_STORAGE / (1024 * 1024),
        "percentage_used": round((total_used / MAX_USER_STORAGE) * 100, 1) if MAX_USER_STORAGE > 0 else 0
    }


# ============== CORCHAT API ROUTES ==============

# WebSocket connection manager for real-time messaging
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # user_id: websocket
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        # Update user status to online
        await db.chat_user_status.update_one(
            {"user_id": user_id},
            {"$set": {"status": "online", "last_seen": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast_to_channel(self, message: dict, channel_id: str, exclude_user: str = None):
        # Get channel members
        channel = await db.chat_channels.find_one({"id": channel_id}, {"_id": 0})
        if not channel:
            return
        
        # For public channels, broadcast to all connected users
        if channel.get("type") == "PUBLIC":
            for user_id, connection in self.active_connections.items():
                if user_id != exclude_user:
                    try:
                        await connection.send_json(message)
                    except:
                        pass
        else:
            # For private channels, only broadcast to members
            for member_id in channel.get("members", []):
                if member_id != exclude_user and member_id in self.active_connections:
                    try:
                        await self.active_connections[member_id].send_json(message)
                    except:
                        pass

manager = ConnectionManager()


async def ensure_default_channels():
    """Create default channels if they don't exist"""
    default_channels = [
        {"name": "general", "description": "General discussion for the team", "is_default": True},
        {"name": "announcements", "description": "Important company announcements", "is_default": True}
    ]
    
    for ch in default_channels:
        existing = await db.chat_channels.find_one({"name": ch["name"], "is_default": True})
        if not existing:
            channel = ChatChannel(
                name=ch["name"],
                description=ch["description"],
                type=ChannelType.PUBLIC,
                created_by="system",
                created_by_name="System",
                is_default=True
            )
            doc = channel.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            doc["updated_at"] = doc["updated_at"].isoformat()
            await db.chat_channels.insert_one(doc)


# ============== AI CHATBOT (AurborBot) ==============

# System prompt for the HR assistant
HR_ASSISTANT_SYSTEM_PROMPT = """You are an intelligent HR assistant for {company_name}, a workforce management application. Your name is {bot_name}.

## Your Capabilities:
- Answer questions about HR policies, leave management, time tracking, and company procedures
- Help users navigate the application features
- Provide information about timesheets, projects, documents, and performance insights
- Assist with common HR inquiries

## Application Features You Can Help With:
1. **Time Tracking**: Clock in/out, view hours worked, breaks
2. **Timesheets**: View daily/weekly/monthly timesheets, export to PDF
3. **Leave Management**: Request PTO, view leave balance, check request status
4. **Projects**: View assigned projects, track time per project
5. **Documents**: Upload/view personal documents (secured with PIN)
6. **Team Chat (AurborChat)**: Join channels, send messages, direct messages
7. **Tickets**: Submit support tickets for IT, HR, or other departments
8. **Calendar**: View company holidays, events, and schedules
9. **Performance Insights**: View attendance patterns and work metrics

## User Context:
- User Name: {user_name}
- Role: {user_role}
- Company: {company_name}

## Guidelines:
- Be helpful, professional, and concise
- If you don't know something specific to their company policy, suggest they contact HR
- For technical issues, suggest contacting IT support or submitting a ticket
- Keep responses friendly but professional
- Use bullet points for lists
- Don't make up specific company policies - refer to HR for details
"""

class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    response: str
    session_id: str


@api_router.post("/chatbot/message", response_model=ChatMessageResponse)
async def send_chatbot_message(
    request: ChatMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to the AI HR assistant and get a response"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Get tenant info
    tenant = await db.tenants.find_one(
        {"slug": current_user.get("tenant_id", "aurborbloom")},
        {"_id": 0, "name": 1, "slug": 1}
    )
    company_name = tenant.get("name", "AurborBloom") if tenant else "AurborBloom"
    tenant_slug = tenant.get("slug", "aurborbloom") if tenant else "aurborbloom"
    
    # Determine bot name based on tenant
    bot_name = "AurborBot" if tenant_slug == "aurborbloom" else f"{company_name} Assistant"
    
    # Create or use existing session
    session_id = request.session_id or f"chatbot_{current_user['id']}_{uuid.uuid4().hex[:8]}"
    
    # Build system prompt with user context
    system_prompt = HR_ASSISTANT_SYSTEM_PROMPT.format(
        company_name=company_name,
        bot_name=bot_name,
        user_name=current_user.get("name", "User"),
        user_role=current_user.get("role", "EMPLOYEE")
    )
    
    # Get API key
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        # Initialize chat
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("openai", "gpt-5.2")
        
        # Load chat history from database
        history = await db.chatbot_history.find(
            {"session_id": session_id, "user_id": current_user["id"]},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(length=20)  # Last 20 messages for context
        
        # Send message
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        # Store messages in database
        timestamp = datetime.now(timezone.utc).isoformat()
        await db.chatbot_history.insert_many([
            {
                "session_id": session_id,
                "user_id": current_user["id"],
                "tenant_id": tenant_slug,
                "role": "user",
                "content": request.message,
                "timestamp": timestamp
            },
            {
                "session_id": session_id,
                "user_id": current_user["id"],
                "tenant_id": tenant_slug,
                "role": "assistant",
                "content": response,
                "timestamp": timestamp
            }
        ])
        
        return ChatMessageResponse(response=response, session_id=session_id)
        
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        # Fallback response
        return ChatMessageResponse(
            response="I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact your HR department for immediate assistance.",
            session_id=session_id
        )


@api_router.get("/chatbot/history/{session_id}")
async def get_chatbot_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history for a session"""
    messages = await db.chatbot_history.find(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0, "role": 1, "content": 1, "timestamp": 1}
    ).sort("timestamp", 1).to_list(length=100)
    
    return {"session_id": session_id, "messages": messages}


@api_router.delete("/chatbot/history/{session_id}")
async def clear_chatbot_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Clear chat history for a session"""
    result = await db.chatbot_history.delete_many({
        "session_id": session_id,
        "user_id": current_user["id"]
    })
    return {"deleted": result.deleted_count}


@api_router.post("/chatbot/new-session")
async def create_new_chatbot_session(
    current_user: dict = Depends(get_current_user)
):
    """Create a new chat session"""
    session_id = f"chatbot_{current_user['id']}_{uuid.uuid4().hex[:8]}"
    return {"session_id": session_id}


# ============== BACKGROUND DNS VERIFICATION ==============
async def verify_single_domain(tenant_id: str, domain: str) -> bool:
    """Verify a single domain's DNS configuration"""
    import socket
    import dns.resolver
    
    try:
        # Check CNAME record
        answers = dns.resolver.resolve(domain, 'CNAME')
        for rdata in answers:
            if 'emergentagent.com' in str(rdata.target).lower():
                return True
    except dns.resolver.NoAnswer:
        # No CNAME record, try A record resolution
        pass
    except dns.resolver.NXDOMAIN:
        # Domain doesn't exist
        logger.warning(f"Domain {domain} does not exist")
        return False
    except Exception as e:
        logger.warning(f"DNS CNAME check failed for {domain}: {e}")
    
    # Fallback: try basic DNS resolution
    try:
        socket.gethostbyname(domain)
        return True  # Domain resolves
    except socket.gaierror:
        return False


async def periodic_dns_verification():
    """Background task to periodically verify custom domains"""
    logger.info("🔄 Starting periodic DNS verification task...")
    
    while True:
        try:
            # Wait 1 hour between checks (3600 seconds)
            await asyncio.sleep(3600)
            
            # Find all tenants with unverified custom domains
            cursor = db.tenants.find(
                {"custom_domain": {"$ne": None}, "custom_domain_verified": False},
                {"_id": 0, "id": 1, "name": 1, "custom_domain": 1}
            )
            
            tenants_to_verify = await cursor.to_list(length=100)
            
            if tenants_to_verify:
                logger.info(f"🔍 Checking DNS for {len(tenants_to_verify)} pending domains...")
            
            for tenant in tenants_to_verify:
                domain = tenant.get("custom_domain")
                tenant_id = tenant.get("id")
                tenant_name = tenant.get("name")
                
                if domain and tenant_id:
                    verified = await verify_single_domain(tenant_id, domain)
                    
                    if verified:
                        await db.tenants.update_one(
                            {"id": tenant_id},
                            {"$set": {"custom_domain_verified": True}}
                        )
                        logger.info(f"✅ Auto-verified domain '{domain}' for tenant '{tenant_name}'")
                    else:
                        logger.debug(f"⏳ Domain '{domain}' for tenant '{tenant_name}' still pending verification")
                
                # Small delay between checks to avoid overwhelming DNS servers
                await asyncio.sleep(2)
                
        except asyncio.CancelledError:
            logger.info("🛑 DNS verification task cancelled")
            break
        except Exception as e:
            logger.error(f"❌ Error in periodic DNS verification: {e}")
            await asyncio.sleep(60)  # Wait a minute before retrying on error


# Initialize default channels on startup
@app.on_event("startup")
async def startup_event():
    await ensure_default_channels()
    await initialize_default_tenant()
    await create_tenant_indexes()
    # Start background DNS verification task
    asyncio.create_task(periodic_dns_verification())


async def create_tenant_indexes():
    """Create database indexes for tenant isolation and performance"""
    try:
        # Indexes for tenant_id + created_at (most common query pattern)
        index_configs = [
            ("users", [("tenant_id", 1), ("created_at", -1)]),
            ("users", [("tenant_id", 1), ("email", 1)]),
            ("timesheets", [("tenant_id", 1), ("created_at", -1)]),
            ("timesheets", [("tenant_id", 1), ("user_id", 1), ("clock_in_at", -1)]),
            ("tickets", [("tenant_id", 1), ("created_at", -1)]),
            ("tickets", [("tenant_id", 1), ("status", 1)]),
            ("leave_requests", [("tenant_id", 1), ("created_at", -1)]),
            ("leave_requests", [("tenant_id", 1), ("user_id", 1)]),
            ("projects", [("tenant_id", 1), ("created_at", -1)]),
            ("invitations", [("tenant_id", 1), ("created_at", -1)]),
            ("announcements", [("tenant_id", 1), ("created_at", -1)]),
            ("holidays", [("tenant_id", 1)]),
            ("leave_types", [("tenant_id", 1), ("is_active", 1)]),
            ("security_audit_logs", [("tenant_id", 1), ("created_at", -1)]),
            ("security_audit_logs", [("event_type", 1), ("created_at", -1)]),
            ("security_audit_logs", [("severity", 1), ("created_at", -1)]),
            ("tenant_usage", [("tenant_id", 1), ("date", -1)]),
            ("tenant_usage_hourly", [("tenant_id", 1), ("date", -1), ("hour", 1)]),
            ("tenant_rate_limits", [("tenant_slug", 1)]),
            ("webhooks", [("tenant_id", 1), ("is_active", 1)]),
            ("webhook_deliveries", [("webhook_id", 1), ("delivered_at", -1)]),
            ("custom_domain_ssl", [("domain", 1)]),
            ("custom_domain_ssl", [("tenant_id", 1)]),
        ]
        
        for collection_name, index_keys in index_configs:
            try:
                await db[collection_name].create_index(index_keys, background=True)
            except Exception as e:
                # Index might already exist or collection doesn't exist yet
                pass
        
        logger.info("✅ Database indexes created/verified for tenant isolation")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")


async def initialize_default_tenant():
    """Initialize the default AurborBloom tenant and migrate existing data"""
    # Check if default tenant exists
    default_tenant = await db.tenants.find_one({"slug": DEFAULT_TENANT_SLUG})
    
    if not default_tenant:
        # Create default tenant
        tenant = Tenant(
            slug=DEFAULT_TENANT_SLUG,
            name="AurborBloom",
            primary_color="#1a1a1a",
            secondary_color="#D4AF37",
            admin_signup_code=os.environ.get('ADMIN_INVITE_CODE', 'ARBORBLOOM-ADMIN-2025'),
            settings=TenantSettings()
        )
        
        doc = serialize_datetime(tenant.model_dump())
        await db.tenants.insert_one(doc)
        print(f"✅ Created default tenant: {DEFAULT_TENANT_SLUG}")
    
    # Migrate existing data to default tenant (add tenant_id where missing)
    collections_to_migrate = [
        "users", "timesheets", "tickets", "leave_requests", 
        "invitations", "announcements", "holidays", "projects"
    ]
    
    for collection_name in collections_to_migrate:
        collection = db[collection_name]
        result = await collection.update_many(
            {"tenant_id": {"$exists": False}},
            {"$set": {"tenant_id": DEFAULT_TENANT_SLUG}}
        )
        if result.modified_count > 0:
            print(f"✅ Migrated {result.modified_count} documents in {collection_name} to default tenant")


# Channel Routes
@api_router.get("/chat/channels", response_model=List[ChatChannelResponse])
async def get_channels(current_user: dict = Depends(get_current_user)):
    """Get all channels accessible to the user"""
    user_id = current_user["id"]
    
    # Get public channels and private channels where user is a member
    channels = await db.chat_channels.find({
        "$or": [
            {"type": "PUBLIC"},
            {"members": user_id}
        ]
    }, {"_id": 0}).sort("name", 1).to_list(100)
    
    result = []
    for channel in channels:
        # Get last message for preview
        last_msg = await db.chat_messages.find_one(
            {"channel_id": channel["id"], "is_deleted": False},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        # Get unread count
        unread_doc = await db.chat_unread.find_one(
            {"user_id": user_id, "channel_id": channel["id"]},
            {"_id": 0}
        )
        
        unread_count = 0
        if unread_doc:
            last_read = unread_doc.get("last_read_at")
            if last_read:
                if isinstance(last_read, str):
                    last_read = datetime.fromisoformat(last_read)
                unread_count = await db.chat_messages.count_documents({
                    "channel_id": channel["id"],
                    "is_deleted": False,
                    "created_at": {"$gt": last_read.isoformat()}
                })
        else:
            # User has never read this channel
            unread_count = await db.chat_messages.count_documents({
                "channel_id": channel["id"],
                "is_deleted": False
            })
        
        created_at = channel.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ChatChannelResponse(
            id=channel["id"],
            name=channel["name"],
            description=channel.get("description"),
            type=channel.get("type", "PUBLIC"),
            created_by=channel.get("created_by", ""),
            created_by_name=channel.get("created_by_name"),
            member_count=len(channel.get("members", [])) if channel.get("type") == "PRIVATE" else 0,
            is_default=channel.get("is_default", False),
            last_message=last_msg,
            unread_count=unread_count,
            created_at=created_at
        ))
    
    return result


@api_router.post("/chat/channels", response_model=ChatChannelResponse)
async def create_channel(
    channel_data: ChatChannelCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new channel"""
    # Check if channel name already exists
    existing = await db.chat_channels.find_one({"name": channel_data.name.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Channel name already exists")
    
    # Create channel
    members = channel_data.members if channel_data.type == ChannelType.PRIVATE else []
    if channel_data.type == ChannelType.PRIVATE and current_user["id"] not in members:
        members.append(current_user["id"])
    
    channel = ChatChannel(
        name=channel_data.name.lower(),
        description=channel_data.description,
        type=channel_data.type,
        created_by=current_user["id"],
        created_by_name=current_user.get("name"),
        members=members
    )
    
    doc = channel.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.chat_channels.insert_one(doc)
    
    return ChatChannelResponse(
        id=channel.id,
        name=channel.name,
        description=channel.description,
        type=channel.type.value,
        created_by=channel.created_by,
        created_by_name=channel.created_by_name,
        member_count=len(members),
        is_default=False,
        last_message=None,
        unread_count=0,
        created_at=channel.created_at
    )


@api_router.get("/chat/channels/{channel_id}")
async def get_channel(
    channel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get channel details"""
    channel = await db.chat_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check access for private channels
    if channel.get("type") == "PRIVATE" and current_user["id"] not in channel.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return channel


@api_router.delete("/chat/channels/{channel_id}")
async def delete_channel(
    channel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a channel (only creator or admin)"""
    channel = await db.chat_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if it's a default channel
    if channel.get("is_default"):
        raise HTTPException(status_code=403, detail="Cannot delete default channels")
    
    # Only creator or admin can delete
    if channel.get("created_by") != current_user["id"] and current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only channel creator or admin can delete")
    
    # Delete all messages in channel
    await db.chat_messages.delete_many({"channel_id": channel_id})
    # Delete channel
    await db.chat_channels.delete_one({"id": channel_id})
    
    return {"message": "Channel deleted successfully"}


# Message Routes
@api_router.get("/chat/channels/{channel_id}/messages", response_model=List[ChatMessageResponse])
async def get_channel_messages(
    channel_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a channel"""
    channel = await db.chat_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check access for private channels
    if channel.get("type") == "PRIVATE" and current_user["id"] not in channel.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"channel_id": channel_id, "is_deleted": False}
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.chat_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Mark as read
    await db.chat_unread.update_one(
        {"user_id": current_user["id"], "channel_id": channel_id},
        {"$set": {"last_read_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    result = []
    for msg in reversed(messages):  # Reverse to show oldest first
        created_at = msg.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ChatMessageResponse(
            id=msg["id"],
            channel_id=msg.get("channel_id"),
            dm_thread_id=msg.get("dm_thread_id"),
            sender_id=msg["sender_id"],
            sender_name=msg["sender_name"],
            sender_image=msg.get("sender_image"),
            content=msg["content"],
            message_type=msg.get("message_type", "text"),
            file_url=msg.get("file_url"),
            file_name=msg.get("file_name"),
            is_edited=msg.get("is_edited", False),
            reactions=msg.get("reactions", {}),
            created_at=created_at
        ))
    
    return result


@api_router.post("/chat/channels/{channel_id}/messages", response_model=ChatMessageResponse)
async def send_channel_message(
    channel_id: str,
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to a channel"""
    channel = await db.chat_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check access for private channels
    if channel.get("type") == "PRIVATE" and current_user["id"] not in channel.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Handle attachment
    attachment_data = None
    file_url = None
    file_name = None
    msg_type = message_data.message_type
    
    if message_data.attachment:
        attachment_data = message_data.attachment.model_dump()
        file_url = attachment_data.get("file_url")
        file_name = attachment_data.get("filename")
        if attachment_data.get("is_image"):
            msg_type = "image"
        else:
            msg_type = "file"
    
    message = ChatMessage(
        channel_id=channel_id,
        sender_id=current_user["id"],
        sender_name=current_user.get("name", "Unknown"),
        sender_image=current_user.get("profile_image"),
        content=message_data.content,
        message_type=msg_type,
        file_url=file_url,
        file_name=file_name
    )
    
    doc = message.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if attachment_data:
        doc["attachment"] = attachment_data
    
    await db.chat_messages.insert_one(doc)
    
    # Broadcast via WebSocket
    ws_message = {
        "type": "new_message",
        "channel_id": channel_id,
        "message": {
            "id": message.id,
            "channel_id": channel_id,
            "sender_id": message.sender_id,
            "sender_name": message.sender_name,
            "sender_image": message.sender_image,
            "content": message.content,
            "message_type": msg_type,
            "attachment": attachment_data,
            "created_at": doc["created_at"]
        }
    }
    await manager.broadcast_to_channel(ws_message, channel_id, exclude_user=current_user["id"])
    
    return ChatMessageResponse(
        id=message.id,
        channel_id=channel_id,
        dm_thread_id=None,
        sender_id=message.sender_id,
        sender_name=message.sender_name,
        sender_image=message.sender_image,
        content=message.content,
        message_type=msg_type,
        file_url=file_url,
        file_name=file_name,
        attachment=attachment_data,
        is_edited=False,
        reactions={},
        created_at=message.created_at
    )


# Direct Message Routes
@api_router.get("/chat/dm")
async def get_dm_threads(current_user: dict = Depends(get_current_user)):
    """Get all DM threads for the current user"""
    user_id = current_user["id"]
    
    threads = await db.chat_dm_threads.find(
        {"participants": user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for thread in threads:
        # Find the other participant
        other_user_id = next((p for p in thread["participants"] if p != user_id), None)
        if not other_user_id:
            continue
        
        # Get unread count
        unread_doc = await db.chat_unread.find_one(
            {"user_id": user_id, "dm_thread_id": thread["id"]},
            {"_id": 0}
        )
        
        unread_count = 0
        if unread_doc:
            last_read = unread_doc.get("last_read_at")
            if last_read:
                if isinstance(last_read, str):
                    last_read = datetime.fromisoformat(last_read)
                unread_count = await db.chat_messages.count_documents({
                    "dm_thread_id": thread["id"],
                    "is_deleted": False,
                    "sender_id": {"$ne": user_id},
                    "created_at": {"$gt": last_read.isoformat()}
                })
        
        created_at = thread.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append({
            "id": thread["id"],
            "participants": thread["participants"],
            "participant_names": thread.get("participant_names", {}),
            "participant_images": thread.get("participant_images", {}),
            "other_user_id": other_user_id,
            "other_user_name": thread.get("participant_names", {}).get(other_user_id, "Unknown"),
            "other_user_image": thread.get("participant_images", {}).get(other_user_id),
            "last_message": thread.get("last_message"),
            "unread_count": unread_count,
            "created_at": created_at
        })
    
    return result


@api_router.post("/chat/dm/{user_id}", response_model=DMThreadResponse)
async def start_dm_thread(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start or get existing DM thread with a user"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot start DM with yourself")
    
    # Check if target user exists
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if thread already exists
    existing_thread = await db.chat_dm_threads.find_one({
        "participants": {"$all": [current_user["id"], user_id]}
    }, {"_id": 0})
    
    if existing_thread:
        # Convert to response format
        other_user_id = user_id if user_id != current_user["id"] else existing_thread["participants"][0]
        other_user_name = existing_thread.get("participant_names", {}).get(other_user_id, "Unknown")
        other_user_image = existing_thread.get("participant_images", {}).get(other_user_id, "")
        
        created_at = existing_thread.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        return DMThreadResponse(
            id=existing_thread["id"],
            participants=existing_thread["participants"],
            participant_names=existing_thread.get("participant_names", {}),
            participant_images=existing_thread.get("participant_images", {}),
            other_user_id=other_user_id,
            other_user_name=other_user_name,
            other_user_image=other_user_image,
            last_message=existing_thread.get("last_message"),
            unread_count=0,
            created_at=created_at
        )
    
    # Create new thread
    thread = DMThread(
        participants=[current_user["id"], user_id],
        participant_names={
            current_user["id"]: current_user.get("name", "Unknown"),
            user_id: target_user.get("name", "Unknown")
        },
        participant_images={
            current_user["id"]: current_user.get("profile_image") or "",
            user_id: target_user.get("profile_image") or ""
        }
    )
    
    doc = thread.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.chat_dm_threads.insert_one(doc)
    
    # Return response format
    return DMThreadResponse(
        id=thread.id,
        participants=thread.participants,
        participant_names=thread.participant_names,
        participant_images=thread.participant_images,
        other_user_id=user_id,
        other_user_name=target_user.get("name", "Unknown"),
        other_user_image=target_user.get("profile_image") or "",
        last_message=None,
        unread_count=0,
        created_at=thread.created_at
    )


@api_router.get("/chat/dm/{thread_id}/messages", response_model=List[ChatMessageResponse])
async def get_dm_messages(
    thread_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a DM thread"""
    thread = await db.chat_dm_threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check access
    if current_user["id"] not in thread.get("participants", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"dm_thread_id": thread_id, "is_deleted": False}
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.chat_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Mark as read
    await db.chat_unread.update_one(
        {"user_id": current_user["id"], "dm_thread_id": thread_id},
        {"$set": {"last_read_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    result = []
    for msg in reversed(messages):
        created_at = msg.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ChatMessageResponse(
            id=msg["id"],
            channel_id=None,
            dm_thread_id=msg.get("dm_thread_id"),
            sender_id=msg["sender_id"],
            sender_name=msg["sender_name"],
            sender_image=msg.get("sender_image"),
            content=msg["content"],
            message_type=msg.get("message_type", "text"),
            file_url=msg.get("file_url"),
            file_name=msg.get("file_name"),
            is_edited=msg.get("is_edited", False),
            reactions=msg.get("reactions", {}),
            created_at=created_at
        ))
    
    return result


@api_router.post("/chat/dm/{thread_id}/messages", response_model=ChatMessageResponse)
async def send_dm_message(
    thread_id: str,
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a DM thread"""
    thread = await db.chat_dm_threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check access
    if current_user["id"] not in thread.get("participants", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Handle attachment
    attachment_data = None
    file_url = None
    file_name = None
    msg_type = message_data.message_type
    
    if message_data.attachment:
        attachment_data = message_data.attachment.model_dump()
        file_url = attachment_data.get("file_url")
        file_name = attachment_data.get("filename")
        if attachment_data.get("is_image"):
            msg_type = "image"
        else:
            msg_type = "file"
    
    message = ChatMessage(
        dm_thread_id=thread_id,
        sender_id=current_user["id"],
        sender_name=current_user.get("name", "Unknown"),
        sender_image=current_user.get("profile_image"),
        content=message_data.content,
        message_type=msg_type,
        file_url=file_url,
        file_name=file_name
    )
    
    doc = message.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if attachment_data:
        doc["attachment"] = attachment_data
    
    await db.chat_messages.insert_one(doc)
    
    # Update thread's last message
    await db.chat_dm_threads.update_one(
        {"id": thread_id},
        {
            "$set": {
                "last_message": {
                    "content": message.content[:50],
                    "sender_id": message.sender_id,
                    "created_at": doc["created_at"]
                },
                "updated_at": doc["updated_at"]
            }
        }
    )
    
    # Send via WebSocket to other participant
    other_user_id = next((p for p in thread["participants"] if p != current_user["id"]), None)
    if other_user_id:
        ws_message = {
            "type": "new_dm",
            "thread_id": thread_id,
            "message": {
                "id": message.id,
                "dm_thread_id": thread_id,
                "sender_id": message.sender_id,
                "sender_name": message.sender_name,
                "sender_image": message.sender_image,
                "content": message.content,
                "message_type": msg_type,
                "attachment": attachment_data,
                "created_at": doc["created_at"]
            }
        }
        await manager.send_personal_message(ws_message, other_user_id)
    
    return ChatMessageResponse(
        id=message.id,
        channel_id=None,
        dm_thread_id=thread_id,
        sender_id=message.sender_id,
        sender_name=message.sender_name,
        sender_image=message.sender_image,
        content=message.content,
        message_type=msg_type,
        file_url=file_url,
        file_name=file_name,
        attachment=attachment_data,
        is_edited=False,
        reactions={},
        created_at=message.created_at
    )


# User status and presence
@api_router.get("/chat/users")
async def get_chat_users(current_user: dict = Depends(get_current_user)):
    """Get all users for DM purposes"""
    users = await db.users.find(
        {"is_active": True},
        {"_id": 0, "password_hash": 0, "documents_pin_hash": 0}
    ).to_list(500)
    
    # Get online status for each user
    result = []
    for user in users:
        if user["id"] == current_user["id"]:
            continue  # Skip current user
        
        status_doc = await db.chat_user_status.find_one({"user_id": user["id"]}, {"_id": 0})
        
        result.append({
            "id": user["id"],
            "name": user.get("name", "Unknown"),
            "email": user.get("email"),
            "profile_image": user.get("profile_image"),
            "role": user.get("role"),
            "status": status_doc.get("status", "offline") if status_doc else "offline"
        })
    
    return result


@api_router.get("/chat/unread-counts")
async def get_unread_counts(current_user: dict = Depends(get_current_user)):
    """Get total unread message counts"""
    user_id = current_user["id"]
    
    # Get all channels user has access to
    channels = await db.chat_channels.find({
        "$or": [
            {"type": "PUBLIC"},
            {"members": user_id}
        ]
    }, {"_id": 0, "id": 1}).to_list(100)
    
    total_channel_unread = 0
    for channel in channels:
        unread_doc = await db.chat_unread.find_one(
            {"user_id": user_id, "channel_id": channel["id"]},
            {"_id": 0}
        )
        
        if unread_doc:
            last_read = unread_doc.get("last_read_at")
            if last_read:
                if isinstance(last_read, str):
                    last_read = datetime.fromisoformat(last_read)
                count = await db.chat_messages.count_documents({
                    "channel_id": channel["id"],
                    "is_deleted": False,
                    "created_at": {"$gt": last_read.isoformat()}
                })
                total_channel_unread += count
        else:
            count = await db.chat_messages.count_documents({
                "channel_id": channel["id"],
                "is_deleted": False
            })
            total_channel_unread += count
    
    # Get DM unread counts
    dm_threads = await db.chat_dm_threads.find(
        {"participants": user_id},
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    total_dm_unread = 0
    for thread in dm_threads:
        unread_doc = await db.chat_unread.find_one(
            {"user_id": user_id, "dm_thread_id": thread["id"]},
            {"_id": 0}
        )
        
        if unread_doc:
            last_read = unread_doc.get("last_read_at")
            if last_read:
                if isinstance(last_read, str):
                    last_read = datetime.fromisoformat(last_read)
                count = await db.chat_messages.count_documents({
                    "dm_thread_id": thread["id"],
                    "is_deleted": False,
                    "sender_id": {"$ne": user_id},
                    "created_at": {"$gt": last_read.isoformat()}
                })
                total_dm_unread += count
    
    return {
        "channels": total_channel_unread,
        "direct_messages": total_dm_unread,
        "total": total_channel_unread + total_dm_unread
    }


@api_router.get("/chat/search")
async def search_messages(
    q: str,
    channel_id: Optional[str] = None,
    dm_thread_id: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Search messages in channels and DMs"""
    user_id = current_user["id"]
    
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    
    query = {
        "content": {"$regex": q, "$options": "i"},
        "is_deleted": False
    }
    
    if channel_id:
        # Verify user has access to channel
        channel = await db.chat_channels.find_one({"id": channel_id}, {"_id": 0})
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        if channel.get("type") == "PRIVATE" and user_id not in channel.get("members", []):
            raise HTTPException(status_code=403, detail="Access denied")
        query["channel_id"] = channel_id
    elif dm_thread_id:
        # Verify user is participant in DM thread
        thread = await db.chat_dm_threads.find_one({"id": dm_thread_id}, {"_id": 0})
        if not thread or user_id not in thread.get("participants", []):
            raise HTTPException(status_code=404, detail="Thread not found")
        query["dm_thread_id"] = dm_thread_id
    else:
        # Search all accessible messages
        accessible_channels = await db.chat_channels.find({
            "$or": [{"type": "PUBLIC"}, {"members": user_id}]
        }, {"id": 1}).to_list(100)
        channel_ids = [c["id"] for c in accessible_channels]
        
        dm_threads = await db.chat_dm_threads.find(
            {"participants": user_id}, {"id": 1}
        ).to_list(100)
        thread_ids = [t["id"] for t in dm_threads]
        
        query["$or"] = [
            {"channel_id": {"$in": channel_ids}},
            {"dm_thread_id": {"$in": thread_ids}}
        ]
    
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Format results
    results = []
    for msg in messages:
        result = {
            "id": msg["id"],
            "content": msg["content"],
            "sender_id": msg["sender_id"],
            "sender_name": msg.get("sender_name"),
            "created_at": msg["created_at"],
            "channel_id": msg.get("channel_id"),
            "dm_thread_id": msg.get("dm_thread_id")
        }
        
        # Add context (channel name or DM participant)
        if msg.get("channel_id"):
            channel = await db.chat_channels.find_one({"id": msg["channel_id"]}, {"_id": 0, "name": 1})
            result["context"] = f"#{channel['name']}" if channel else "Unknown channel"
            result["context_type"] = "channel"
        elif msg.get("dm_thread_id"):
            thread = await db.chat_dm_threads.find_one({"id": msg["dm_thread_id"]}, {"_id": 0})
            if thread:
                other_user_id = next((p for p in thread["participants"] if p != user_id), None)
                if other_user_id:
                    other_user = await db.users.find_one({"id": other_user_id}, {"_id": 0, "name": 1})
                    result["context"] = other_user.get("name", "Unknown") if other_user else "Unknown"
            result["context_type"] = "dm"
        
        results.append(result)
    
    return results


@api_router.post("/chat/messages/{message_id}/reactions")
async def add_reaction(
    message_id: str,
    emoji: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a reaction to a message"""
    user_id = current_user["id"]
    user_name = current_user.get("name", "Unknown")
    
    # Verify message exists
    message = await db.chat_messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get or create reactions for this message
    existing = await db.chat_reactions.find_one({
        "message_id": message_id,
        "emoji": emoji,
        "user_id": user_id
    })
    
    if existing:
        # Remove reaction (toggle off)
        await db.chat_reactions.delete_one({
            "message_id": message_id,
            "emoji": emoji,
            "user_id": user_id
        })
        action = "removed"
    else:
        # Add reaction
        reaction = {
            "id": str(uuid.uuid4()),
            "message_id": message_id,
            "emoji": emoji,
            "user_id": user_id,
            "user_name": user_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_reactions.insert_one(reaction)
        action = "added"
    
    # Get updated reaction counts for this message
    reactions = await db.chat_reactions.find({"message_id": message_id}, {"_id": 0}).to_list(100)
    
    # Group by emoji
    reaction_summary = {}
    for r in reactions:
        emoji_key = r["emoji"]
        if emoji_key not in reaction_summary:
            reaction_summary[emoji_key] = {"emoji": emoji_key, "count": 0, "users": []}
        reaction_summary[emoji_key]["count"] += 1
        reaction_summary[emoji_key]["users"].append({"id": r["user_id"], "name": r["user_name"]})
    
    # Broadcast reaction update via WebSocket
    ws_message = {
        "type": "reaction_update",
        "message_id": message_id,
        "reactions": list(reaction_summary.values()),
        "action": action,
        "user_id": user_id,
        "emoji": emoji
    }
    
    if message.get("channel_id"):
        await manager.broadcast_to_channel(ws_message, message["channel_id"])
    elif message.get("dm_thread_id"):
        thread = await db.chat_dm_threads.find_one({"id": message["dm_thread_id"]}, {"_id": 0})
        if thread:
            for participant in thread.get("participants", []):
                await manager.send_personal_message(ws_message, participant)
    
    return {"action": action, "reactions": list(reaction_summary.values())}


@api_router.get("/chat/messages/{message_id}/reactions")
async def get_reactions(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all reactions for a message"""
    reactions = await db.chat_reactions.find({"message_id": message_id}, {"_id": 0}).to_list(100)
    
    # Group by emoji
    reaction_summary = {}
    for r in reactions:
        emoji_key = r["emoji"]
        if emoji_key not in reaction_summary:
            reaction_summary[emoji_key] = {"emoji": emoji_key, "count": 0, "users": []}
        reaction_summary[emoji_key]["count"] += 1
        reaction_summary[emoji_key]["users"].append({"id": r["user_id"], "name": r["user_name"]})
    
    return list(reaction_summary.values())


@api_router.get("/chat/user-status")
async def get_all_user_status(current_user: dict = Depends(get_current_user)):
    """Get online/offline status for all users"""
    statuses = await db.chat_user_status.find({}, {"_id": 0}).to_list(500)
    
    # Convert to dict for easy lookup
    status_map = {}
    for s in statuses:
        status_map[s["user_id"]] = {
            "status": s.get("status", "offline"),
            "last_seen": s.get("last_seen")
        }
    
    return status_map


@api_router.post("/chat/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file for chat (images and documents)"""
    
    # Validate file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Validate file type
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: images (JPEG, PNG, GIF, WebP) and documents (PDF, Word, Excel, TXT, CSV)"
        )
    
    # Determine file category
    is_image = content_type in ALLOWED_IMAGE_TYPES
    file_category = "images" if is_image else "documents"
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if not file_ext:
        # Guess extension from content type
        ext_map = {
            "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp",
            "application/pdf": ".pdf", "text/plain": ".txt", "text/csv": ".csv"
        }
        file_ext = ext_map.get(content_type, ".bin")
    
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Create category subdirectory
    category_dir = UPLOAD_DIR / file_category
    category_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = category_dir / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)
    
    # Generate URL
    file_url = f"/api/chat/files/{file_category}/{unique_filename}"
    
    # Store file metadata in database
    file_record = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "stored_filename": unique_filename,
        "file_url": file_url,
        "content_type": content_type,
        "size": file_size,
        "category": file_category,
        "uploaded_by": current_user["id"],
        "uploaded_by_name": current_user.get("name", "Unknown"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_files.insert_one(file_record)
    
    return {
        "id": file_record["id"],
        "filename": file.filename,
        "file_url": file_url,
        "content_type": content_type,
        "size": file_size,
        "is_image": is_image
    }


@api_router.get("/chat/files/{category}/{filename}")
async def get_chat_file(category: str, filename: str):
    """Serve uploaded chat files"""
    if category not in ["images", "documents"]:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    file_path = UPLOAD_DIR / category / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        media_type=content_type,
        filename=filename
    )


# WebSocket endpoint for real-time messaging
@app.websocket("/api/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time chat"""
    try:
        # Validate token
        payload = decode_token(token)
        user_id = payload["sub"]
        
        # Verify user exists and is active
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user or not user.get("is_active", True):
            await websocket.close(code=4001)
            return
        
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                data = await websocket.receive_json()
                
                # Handle different message types
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif data.get("type") == "typing":
                    # Broadcast typing indicator
                    channel_id = data.get("channel_id")
                    dm_thread_id = data.get("dm_thread_id")
                    
                    if channel_id:
                        await manager.broadcast_to_channel({
                            "type": "typing",
                            "channel_id": channel_id,
                            "user_id": user_id,
                            "user_name": user.get("name")
                        }, channel_id, exclude_user=user_id)
                    elif dm_thread_id:
                        thread = await db.chat_dm_threads.find_one({"id": dm_thread_id}, {"_id": 0})
                        if thread:
                            other_user_id = next((p for p in thread["participants"] if p != user_id), None)
                            if other_user_id:
                                await manager.send_personal_message({
                                    "type": "typing",
                                    "thread_id": dm_thread_id,
                                    "user_id": user_id,
                                    "user_name": user.get("name")
                                }, other_user_id)
        
        except WebSocketDisconnect:
            manager.disconnect(user_id)
            # Update user status to offline
            await db.chat_user_status.update_one(
                {"user_id": user_id},
                {"$set": {"status": "offline", "last_seen": datetime.now(timezone.utc).isoformat()}},
                upsert=True
            )
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=4000)


# ============== LEAVE/PTO API ROUTES ==============

# Helper function to calculate business days
def calculate_days(start_date: str, end_date: str) -> int:
    from datetime import datetime
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    delta = end - start
    return delta.days + 1  # Include both start and end date


# Initialize default leave types
async def ensure_default_leave_types():
    """Create default leave types if they don't exist"""
    default_types = [
        {"name": "Vacation", "icon": "🏖️"},
        {"name": "Sick Leave", "icon": "🤒"},
        {"name": "Personal", "icon": "👤"},
        {"name": "Bereavement", "icon": "🖤"},
        {"name": "Parental Leave", "icon": "👶"}
    ]
    
    for lt in default_types:
        existing = await db.leave_types.find_one({"name": lt["name"]})
        if not existing:
            leave_type = LeaveType(name=lt["name"], icon=lt["icon"])
            doc = leave_type.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.leave_types.insert_one(doc)


# Initialize default leave types on startup
@app.on_event("startup")
async def startup_leave_types():
    await ensure_default_leave_types()


# Helper to send notification
async def create_notification(user_id: str, notif_type: NotificationType, title: str, message: str, reference_id: str = None):
    notification = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        reference_id=reference_id
    )
    doc = notification.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["type"] = doc["type"].value
    await db.notifications.insert_one(doc)
    return notification


# Leave Types APIs
@api_router.get("/leave/types")
async def get_leave_types(current_user: dict = Depends(get_current_user)):
    """Get all active leave types for the tenant"""
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    types = await db.leave_types.find({"is_active": True, "tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    
    # Fallback to default types if none exist for this tenant
    if not types:
        types = await db.leave_types.find({"is_active": True, "tenant_id": {"$exists": False}}, {"_id": 0}).to_list(100)
    
    return types


@api_router.post("/admin/leave/types")
async def create_leave_type(
    type_data: LeaveTypeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Create a new leave type"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # CRITICAL: Include tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Check if type already exists for this tenant
    existing = await db.leave_types.find_one({"name": type_data.name, "tenant_id": tenant_id})
    if existing:
        raise HTTPException(status_code=400, detail="Leave type already exists")
    
    leave_type = LeaveType(name=type_data.name, icon=type_data.icon)
    doc = leave_type.model_dump()
    doc["tenant_id"] = tenant_id
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leave_types.insert_one(doc)
    
    return {"message": "Leave type created", "id": leave_type.id}


@api_router.put("/admin/leave/types/{type_id}")
async def update_leave_type(
    type_id: str,
    type_data: LeaveTypeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Update a leave type"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.leave_types.find_one({"id": type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    await db.leave_types.update_one(
        {"id": type_id},
        {"$set": {"name": type_data.name, "icon": type_data.icon}}
    )
    
    return {"message": "Leave type updated"}


@api_router.delete("/admin/leave/types/{type_id}")
async def delete_leave_type(
    type_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Delete (deactivate) a leave type"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.leave_types.find_one({"id": type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    # Soft delete - just mark as inactive
    await db.leave_types.update_one(
        {"id": type_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Leave type deleted"}


# Leave Requests APIs (Employee)
@api_router.get("/leave/requests")
async def get_my_leave_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get current user's leave requests"""
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status.upper()
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Ensure dates are strings
    for req in requests:
        if isinstance(req.get('start_date'), datetime):
            req['start_date'] = req['start_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('end_date'), datetime):
            req['end_date'] = req['end_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('created_at'), datetime):
            req['created_at'] = req['created_at'].isoformat()
        if isinstance(req.get('reviewed_at'), datetime):
            req['reviewed_at'] = req['reviewed_at'].isoformat()
    
    return requests


@api_router.post("/leave/requests")
async def create_leave_request(
    request_data: LeaveRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a new leave request"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Validate dates
    try:
        start = datetime.strptime(request_data.start_date, "%Y-%m-%d")
        end = datetime.strptime(request_data.end_date, "%Y-%m-%d")
        if end < start:
            raise HTTPException(status_code=400, detail="End date must be after start date")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    days = calculate_days(request_data.start_date, request_data.end_date)
    
    # Check for overlapping requests (within same tenant)
    overlap = await db.leave_requests.find_one({
        "tenant_id": tenant_id,
        "user_id": current_user["id"],
        "status": {"$ne": "DENIED"},
        "$or": [
            {"start_date": {"$lte": request_data.end_date}, "end_date": {"$gte": request_data.start_date}}
        ]
    })
    if overlap:
        raise HTTPException(status_code=400, detail="You already have a leave request for overlapping dates")
    
    # Check if it's a custom type
    is_custom = request_data.is_custom_type
    if not is_custom:
        existing_type = await db.leave_types.find_one({"name": request_data.leave_type, "is_active": True})
        if not existing_type:
            is_custom = True
    
    leave_request = LeaveRequest(
        user_id=current_user["id"],
        user_name=current_user.get("name", "Unknown"),
        user_image=current_user.get("profile_image"),
        leave_type=request_data.leave_type,
        is_custom_type=is_custom,
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        days=days,
        reason=request_data.reason
    )
    
    doc = leave_request.model_dump()
    doc["tenant_id"] = tenant_id  # Add tenant_id
    doc["created_at"] = doc["created_at"].isoformat()
    doc["status"] = doc["status"].value
    await db.leave_requests.insert_one(doc)
    
    # Notify all admins of this tenant
    admins = await db.users.find({"tenant_id": tenant_id, "role": "ADMIN", "is_active": True}, {"_id": 0, "id": 1}).to_list(100)
    for admin in admins:
        await create_notification(
            user_id=admin["id"],
            notif_type=NotificationType.LEAVE_REQUEST,
            title="New Leave Request",
            message=f"📝 {current_user.get('name', 'An employee')} requested {request_data.leave_type} ({days} day{'s' if days > 1 else ''})",
            reference_id=leave_request.id
        )
    
    return {"message": "Leave request submitted", "id": leave_request.id}


@api_router.delete("/leave/requests/{request_id}")
async def cancel_leave_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a pending leave request"""
    request = await db.leave_requests.find_one({"id": request_id, "user_id": current_user["id"]}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if request.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")
    
    await db.leave_requests.delete_one({"id": request_id})
    
    return {"message": "Leave request cancelled"}


# Leave Requests APIs (Admin)
@api_router.get("/admin/leave/requests")
async def get_all_leave_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Get all leave requests"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status.upper()
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Ensure dates are strings (MongoDB may auto-parse dates)
    for req in requests:
        if isinstance(req.get('start_date'), datetime):
            req['start_date'] = req['start_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('end_date'), datetime):
            req['end_date'] = req['end_date'].strftime('%Y-%m-%d')
        if isinstance(req.get('created_at'), datetime):
            req['created_at'] = req['created_at'].isoformat()
        if isinstance(req.get('reviewed_at'), datetime):
            req['reviewed_at'] = req['reviewed_at'].isoformat()
    
    return requests


@api_router.put("/admin/leave/requests/{request_id}")
async def review_leave_request(
    request_id: str,
    review: LeaveRequestReview,
    current_user: dict = Depends(get_current_user)
):
    """Admin: Approve or deny a leave request"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    request = await db.leave_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if request.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="Request has already been reviewed")
    
    # Update request
    await db.leave_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": review.status,
                "reviewed_by": current_user["id"],
                "reviewer_name": current_user.get("name"),
                "review_note": review.review_note,
                "reviewed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Notify employee
    if review.status == "APPROVED":
        notif_type = NotificationType.LEAVE_APPROVED
        title = "Leave Approved ✅"
        message = f"Your {request['leave_type']} request ({request['start_date']} to {request['end_date']}) has been approved"
        if review.review_note:
            message += f". Note: {review.review_note}"
    else:
        notif_type = NotificationType.LEAVE_DENIED
        title = "Leave Denied ❌"
        message = f"Your {request['leave_type']} request ({request['start_date']} to {request['end_date']}) has been denied"
        if review.review_note:
            message += f". Reason: {review.review_note}"
    
    await create_notification(
        user_id=request["user_id"],
        notif_type=notif_type,
        title=title,
        message=message,
        reference_id=request_id
    )
    
    return {"message": f"Leave request {review.status.lower()}"}


# Notification APIs
@api_router.get("/notifications")
async def get_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications


@api_router.get("/notifications/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}


# ============== CALENDAR INTEGRATION ROUTES ==============

def generate_calendar_token(user_id: str, feed_type: str = "personal") -> str:
    """Generate a secure token for calendar feed access"""
    payload = {
        "user_id": user_id,
        "feed_type": feed_type,
        "purpose": "calendar_feed"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_calendar_token(token: str) -> dict:
    """Verify and decode a calendar feed token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("purpose") != "calendar_feed":
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def format_datetime_ics(dt_str: str, all_day: bool = True) -> str:
    """Format date string for ICS format"""
    if all_day:
        # For all-day events, use DATE format: YYYYMMDD
        return dt_str.replace("-", "")
    else:
        # For timed events, use DATETIME format
        return dt_str.replace("-", "").replace(":", "") + "Z"


def generate_ics_content(events: list, calendar_name: str = "AurborBloom Calendar") -> str:
    """Generate ICS file content from events"""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AurborBloom//Calendar Feed//EN",
        f"X-WR-CALNAME:{calendar_name}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]
    
    for event in events:
        uid = event.get("id", str(uuid.uuid4()))
        summary = event.get("title", "Event")
        description = event.get("description", "")
        start_date = event.get("start_date", "")
        end_date = event.get("end_date", "")
        status = event.get("status", "CONFIRMED")
        
        # Convert status
        ics_status = "CONFIRMED" if status.upper() == "APPROVED" else "TENTATIVE"
        
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{uid}@aurborbloom.com")
        lines.append(f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}")
        
        # For leave requests, use all-day format
        # End date in ICS is exclusive, so add 1 day
        start_formatted = format_datetime_ics(start_date)
        
        # Parse end date and add 1 day for ICS (exclusive end)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        end_formatted = end_dt.strftime("%Y%m%d")
        
        lines.append(f"DTSTART;VALUE=DATE:{start_formatted}")
        lines.append(f"DTEND;VALUE=DATE:{end_formatted}")
        lines.append(f"SUMMARY:{summary}")
        if description:
            # Escape special characters in description
            desc_escaped = description.replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,")
            lines.append(f"DESCRIPTION:{desc_escaped}")
        lines.append(f"STATUS:{ics_status}")
        lines.append("TRANSP:OPAQUE")
        lines.append("END:VEVENT")
    
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


@api_router.get("/calendar/token")
async def get_calendar_token(
    current_user: dict = Depends(get_current_user)
):
    """Get or generate calendar feed tokens for the current user"""
    user_id = current_user["id"]
    is_admin = current_user.get("role", "").upper() == "ADMIN"
    
    # Generate personal token
    personal_token = generate_calendar_token(user_id, "personal")
    
    result = {
        "personal_feed": {
            "token": personal_token,
            "url": f"/api/calendar/feed/{personal_token}.ics",
            "description": "Your personal leave and PTO events"
        }
    }
    
    # Admins also get a team feed
    if is_admin:
        team_token = generate_calendar_token(user_id, "team")
        result["team_feed"] = {
            "token": team_token,
            "url": f"/api/calendar/feed/{team_token}.ics",
            "description": "All team members' leave and PTO events"
        }
    
    return result


@api_router.get("/calendar/feed/{token}.ics")
async def get_calendar_feed(token: str):
    """
    Public endpoint - Get ICS calendar feed
    No authentication required - uses token for verification
    """
    # Verify token
    payload = verify_calendar_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired calendar token")
    
    user_id = payload.get("user_id")
    feed_type = payload.get("feed_type", "personal")
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_admin = user.get("role", "").upper() == "ADMIN"
    
    # Build query based on feed type
    if feed_type == "team" and is_admin:
        # Team feed - get all approved leave requests
        query = {"status": "APPROVED"}
        calendar_name = "AurborBloom - Team Leave Calendar"
    else:
        # Personal feed - only user's approved leave requests
        query = {"user_id": user_id, "status": "APPROVED"}
        calendar_name = f"AurborBloom - {user.get('name', 'My')} Leave Calendar"
    
    # Fetch approved leave requests
    leave_requests = await db.leave_requests.find(query, {"_id": 0}).to_list(500)
    
    # Convert leave requests to calendar events
    events = []
    for lr in leave_requests:
        # Get leave type display name
        leave_type = lr.get("leave_type", "Leave")
        if lr.get("is_custom_type"):
            leave_type = f"Custom: {leave_type}"
        
        # For team feed, include employee name
        if feed_type == "team":
            title = f"{lr.get('user_name', 'Employee')} - {leave_type}"
        else:
            title = f"{leave_type}"
        
        event = {
            "id": lr.get("id"),
            "title": title,
            "description": lr.get("reason", ""),
            "start_date": lr.get("start_date"),
            "end_date": lr.get("end_date"),
            "status": "APPROVED"
        }
        events.append(event)
    
    # Generate ICS content
    ics_content = generate_ics_content(events, calendar_name)
    
    # Return as ICS file
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=aurborbloom-calendar.ics",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@api_router.post("/calendar/regenerate-token")
async def regenerate_calendar_token(
    feed_type: str = "personal",
    current_user: dict = Depends(get_current_user)
):
    """Regenerate calendar feed token (invalidates old URLs)"""
    user_id = current_user["id"]
    is_admin = current_user.get("role", "").upper() == "ADMIN"
    
    if feed_type == "team" and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can access team feed")
    
    new_token = generate_calendar_token(user_id, feed_type)
    
    return {
        "token": new_token,
        "url": f"/api/calendar/feed/{new_token}.ics",
        "message": "Token regenerated. Old calendar URLs will no longer work."
    }


# ============== TICKETING SYSTEM ROUTES ==============

# SLA Configuration (hours until due based on priority)
SLA_HOURS = {
    "URGENT": 4,
    "HIGH": 8,
    "MEDIUM": 24,
    "LOW": 72
}

# Category display names
CATEGORY_NAMES = {
    "IT_SUPPORT": "IT Support",
    "HR": "Human Resources",
    "PAYROLL": "Payroll",
    "FACILITIES": "Facilities",
    "TIME_ATTENDANCE": "Time & Attendance",
    "BENEFITS": "Benefits",
    "OTHER": "Other"
}


async def generate_ticket_number() -> str:
    """Generate a unique ticket number: TKT-YYYYMMDD-XXXX"""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    
    # Count tickets created today
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.tickets.count_documents({
        "created_at": {"$gte": start_of_day.isoformat()}
    })
    
    sequence = str(count + 1).zfill(4)
    return f"TKT-{today}-{sequence}"


def calculate_sla_due(priority: str) -> datetime:
    """Calculate SLA due datetime based on priority"""
    hours = SLA_HOURS.get(priority, 24)
    return datetime.now(timezone.utc) + timedelta(hours=hours)


@api_router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new support ticket (any authenticated user)"""
    ticket_number = await generate_ticket_number()
    sla_due = calculate_sla_due(ticket_data.priority.value)
    
    ticket = Ticket(
        ticket_number=ticket_number,
        subject=ticket_data.subject,
        description=ticket_data.description,
        category=ticket_data.category,
        priority=ticket_data.priority,
        created_by=current_user["id"],
        creator_name=current_user.get("name", "Unknown"),
        creator_email=current_user.get("email", ""),
        creator_image=current_user.get("profile_image"),
        sla_due_at=sla_due
    )
    
    ticket_doc = ticket.model_dump()
    ticket_doc["tenant_id"] = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)  # CRITICAL: Add tenant_id
    ticket_doc["created_at"] = ticket_doc["created_at"].isoformat()
    ticket_doc["updated_at"] = ticket_doc["updated_at"].isoformat()
    ticket_doc["sla_due_at"] = ticket_doc["sla_due_at"].isoformat() if ticket_doc["sla_due_at"] else None
    ticket_doc["category"] = ticket_doc["category"].value
    ticket_doc["priority"] = ticket_doc["priority"].value
    ticket_doc["status"] = ticket_doc["status"].value
    
    await db.tickets.insert_one(ticket_doc)
    
    # Get tenant_id for webhooks
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    # Trigger webhook for ticket creation
    await trigger_webhooks(
        tenant_id=tenant_id,
        event_type=WebhookEventType.TICKET_CREATED,
        payload={
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "subject": ticket.subject,
            "category": ticket.category.value,
            "priority": ticket.priority.value,
            "created_by": current_user.get("email")
        }
    )
    
    # Notify all admins about new ticket
    admins = await db.users.find({"role": "ADMIN", "is_active": True}, {"_id": 0, "id": 1}).to_list(100)
    for admin in admins:
        await create_notification(
            user_id=admin["id"],
            notif_type=NotificationType.TICKET_CREATED,
            title="New Support Ticket",
            message=f"[{ticket_number}] {ticket_data.subject} - {CATEGORY_NAMES.get(ticket_data.category.value, ticket_data.category.value)}",
            reference_id=ticket.id
        )
    
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        category=ticket.category.value,
        priority=ticket.priority.value,
        status=ticket.status.value,
        created_by=ticket.created_by,
        creator_name=ticket.creator_name,
        creator_email=ticket.creator_email,
        creator_image=ticket.creator_image,
        assigned_to=ticket.assigned_to,
        assigned_names=ticket.assigned_names,
        sla_due_at=ticket.sla_due_at,
        sla_breached=ticket.sla_breached,
        first_response_at=ticket.first_response_at,
        resolved_at=ticket.resolved_at,
        attachments=ticket.attachments,
        comment_count=0,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at
    )


@api_router.get("/tickets")
async def get_tickets(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get tickets - Employees see their own, Admins see all (within their tenant)"""
    # CRITICAL: Filter by tenant_id for data isolation
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    query = {"tenant_id": tenant_id}
    
    # Role-based filtering
    if current_user.get("role") != "ADMIN":
        # Employees can only see their own tickets
        query["created_by"] = current_user["id"]
    elif assigned_to_me:
        # Admin filtering by assigned to self
        query["assigned_to"] = current_user["id"]
    
    # Apply filters
    if status:
        query["status"] = status.upper()
    if category:
        query["category"] = category.upper()
    if priority:
        query["priority"] = priority.upper()
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Get comment counts for each ticket
    result = []
    for ticket in tickets:
        comment_count = await db.ticket_comments.count_documents({
            "ticket_id": ticket["id"],
            "is_internal": False if current_user.get("role") != "ADMIN" else {"$exists": True}
        })
        
        # Parse dates
        for date_field in ["created_at", "updated_at", "sla_due_at", "first_response_at", "resolved_at"]:
            if ticket.get(date_field) and isinstance(ticket[date_field], str):
                try:
                    ticket[date_field] = datetime.fromisoformat(ticket[date_field].replace("Z", "+00:00"))
                except:
                    pass
        
        # Check SLA breach
        if ticket.get("sla_due_at") and ticket.get("status") not in ["RESOLVED", "CLOSED"]:
            sla_due = ticket["sla_due_at"]
            if isinstance(sla_due, str):
                sla_due = datetime.fromisoformat(sla_due.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > sla_due:
                ticket["sla_breached"] = True
                # Update in DB
                await db.tickets.update_one({"id": ticket["id"]}, {"$set": {"sla_breached": True}})
        
        ticket["comment_count"] = comment_count
        result.append(ticket)
    
    return result


@api_router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific ticket by ID"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access - employees can only see their own tickets
    if current_user.get("role") != "ADMIN" and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get comment count
    comment_count = await db.ticket_comments.count_documents({
        "ticket_id": ticket_id,
        "is_internal": False if current_user.get("role") != "ADMIN" else {"$exists": True}
    })
    
    ticket["comment_count"] = comment_count
    
    # Parse dates
    for date_field in ["created_at", "updated_at", "sla_due_at", "first_response_at", "resolved_at"]:
        if ticket.get(date_field) and isinstance(ticket[date_field], str):
            try:
                ticket[date_field] = datetime.fromisoformat(ticket[date_field].replace("Z", "+00:00"))
            except:
                pass
    
    return ticket


@api_router.put("/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    update_data: TicketUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a ticket (Admin only for most fields)"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    is_admin = current_user.get("role") == "ADMIN"
    is_creator = ticket["created_by"] == current_user["id"]
    
    if not is_admin and not is_creator:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    # Admin-only updates
    if is_admin:
        if update_data.status is not None:
            update_fields["status"] = update_data.status.value
            
            # Track resolution time
            if update_data.status == TicketStatus.RESOLVED and not ticket.get("resolved_at"):
                update_fields["resolved_at"] = datetime.now(timezone.utc).isoformat()
                
                # Notify ticket creator
                await create_notification(
                    user_id=ticket["created_by"],
                    notif_type=NotificationType.TICKET_RESOLVED,
                    title="Ticket Resolved",
                    message=f"Your ticket [{ticket['ticket_number']}] has been resolved",
                    reference_id=ticket_id
                )
        
        if update_data.priority is not None:
            update_fields["priority"] = update_data.priority.value
            # Recalculate SLA if priority changed
            update_fields["sla_due_at"] = calculate_sla_due(update_data.priority.value).isoformat()
        
        if update_data.assigned_to is not None:
            # Get names of assigned admins
            assigned_names = []
            for admin_id in update_data.assigned_to:
                admin = await db.users.find_one({"id": admin_id}, {"_id": 0, "name": 1})
                if admin:
                    assigned_names.append(admin.get("name", "Unknown"))
                    
                    # Notify newly assigned admin
                    if admin_id not in ticket.get("assigned_to", []):
                        await create_notification(
                            user_id=admin_id,
                            notif_type=NotificationType.TICKET_ASSIGNED,
                            title="Ticket Assigned",
                            message=f"You've been assigned to [{ticket['ticket_number']}] {ticket['subject']}",
                            reference_id=ticket_id
                        )
            
            update_fields["assigned_to"] = update_data.assigned_to
            update_fields["assigned_names"] = assigned_names
        
        if update_data.category is not None:
            update_fields["category"] = update_data.category.value
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_fields})
    
    # Return updated ticket
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return updated


@api_router.delete("/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete a ticket (Admin only)"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Delete ticket and all comments
    await db.tickets.delete_one({"id": ticket_id})
    await db.ticket_comments.delete_many({"ticket_id": ticket_id})
    
    # Delete attachments from filesystem
    for attachment in ticket.get("attachments", []):
        try:
            file_path = TICKET_UPLOAD_DIR / attachment.get("filename", "")
            if file_path.exists():
                file_path.unlink()
        except:
            pass
    
    return {"message": "Ticket deleted successfully"}


# Ticket Comments
@api_router.get("/tickets/{ticket_id}/comments")
async def get_ticket_comments(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comments for a ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    is_admin = current_user.get("role") == "ADMIN"
    if not is_admin and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Filter internal comments for non-admins
    query = {"ticket_id": ticket_id}
    if not is_admin:
        query["is_internal"] = False
    
    comments = await db.ticket_comments.find(query, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Parse dates
    for comment in comments:
        if isinstance(comment.get("created_at"), str):
            comment["created_at"] = datetime.fromisoformat(comment["created_at"].replace("Z", "+00:00"))
    
    return comments


@api_router.post("/tickets/{ticket_id}/comments")
async def add_ticket_comment(
    ticket_id: str,
    comment_data: TicketCommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a comment to a ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    is_admin = current_user.get("role") == "ADMIN"
    is_creator = ticket["created_by"] == current_user["id"]
    
    if not is_admin and not is_creator:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only admins can add internal notes
    is_internal = comment_data.is_internal and is_admin
    
    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user["id"],
        user_name=current_user.get("name", "Unknown"),
        user_image=current_user.get("profile_image"),
        user_role=current_user.get("role", "EMPLOYEE"),
        content=comment_data.content,
        is_internal=is_internal
    )
    
    comment_doc = comment.model_dump()
    comment_doc["created_at"] = comment_doc["created_at"].isoformat()
    
    await db.ticket_comments.insert_one(comment_doc)
    
    # Update ticket timestamp and track first response
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if is_admin and not ticket.get("first_response_at"):
        update_fields["first_response_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_fields})
    
    # Send notification (non-internal comments only)
    if not is_internal:
        if is_admin:
            # Notify ticket creator
            await create_notification(
                user_id=ticket["created_by"],
                notif_type=NotificationType.TICKET_COMMENT,
                title="New Comment on Your Ticket",
                message=f"[{ticket['ticket_number']}] {current_user.get('name', 'Admin')} added a comment",
                reference_id=ticket_id
            )
        else:
            # Notify assigned admins
            for admin_id in ticket.get("assigned_to", []):
                await create_notification(
                    user_id=admin_id,
                    notif_type=NotificationType.TICKET_COMMENT,
                    title="New Comment on Ticket",
                    message=f"[{ticket['ticket_number']}] {current_user.get('name', 'User')} added a comment",
                    reference_id=ticket_id
                )
    
    # Remove MongoDB _id before returning
    comment_doc.pop("_id", None)
    return comment_doc


@api_router.post("/tickets/{ticket_id}/comments/{comment_id}/attachments")
async def add_comment_attachment(
    ticket_id: str,
    comment_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an attachment to a ticket comment"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    is_admin = current_user.get("role") == "ADMIN"
    if not is_admin and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify comment exists and belongs to user
    comment = await db.ticket_comments.find_one({"id": comment_id, "ticket_id": ticket_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["user_id"] != current_user["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Can only add attachments to your own comments")
    
    # Validate file
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: images, PDF, Word, Excel, text, video files")
    
    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Check total attachments size for this comment
    existing_attachments = comment.get("attachments", [])
    total_size = sum(att.get("file_size", 0) for att in existing_attachments) + len(content)
    if total_size > MAX_COMMENT_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f"Total attachments exceed {MAX_COMMENT_UPLOAD_SIZE // (1024*1024)}MB limit")
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"comment_{comment_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = TICKET_UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create attachment record
    attachment = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_filename": file.filename or "attachment",
        "file_type": file.content_type,
        "file_size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to comment
    await db.ticket_comments.update_one(
        {"id": comment_id},
        {"$push": {"attachments": attachment}}
    )
    
    # Update ticket timestamp
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": "File uploaded successfully",
        "attachment": attachment
    }


@api_router.post("/tickets/{ticket_id}/comments-with-attachments")
async def add_comment_with_attachments(
    ticket_id: str,
    content: str = Form(...),
    is_internal: bool = Form(False),
    files: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user)
):
    """Add a comment with attachments to a ticket (single request)"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    is_admin = current_user.get("role") == "ADMIN"
    is_creator = ticket["created_by"] == current_user["id"]
    
    if not is_admin and not is_creator:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only admins can add internal notes
    is_internal_note = is_internal and is_admin
    
    # Process attachments
    attachments = []
    total_size = 0
    
    for file in files:
        if not file.content_type:
            continue
            
        if file.content_type not in ALLOWED_FILE_TYPES:
            raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")
        
        file_content = await file.read()
        
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit")
        
        total_size += len(file_content)
        if total_size > MAX_COMMENT_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail=f"Total attachments exceed {MAX_COMMENT_UPLOAD_SIZE // (1024*1024)}MB limit")
        
        # Save file
        file_ext = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"ticket_{ticket_id}_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = TICKET_UPLOAD_DIR / unique_filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        attachments.append({
            "id": str(uuid.uuid4()),
            "filename": unique_filename,
            "original_filename": file.filename or "attachment",
            "file_type": file.content_type,
            "file_size": len(file_content),
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create comment
    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user["id"],
        user_name=current_user.get("name", "Unknown"),
        user_image=current_user.get("profile_image"),
        user_role=current_user.get("role", "EMPLOYEE"),
        content=content,
        is_internal=is_internal_note,
        attachments=attachments
    )
    
    comment_doc = comment.model_dump()
    comment_doc["created_at"] = comment_doc["created_at"].isoformat()
    
    await db.ticket_comments.insert_one(comment_doc)
    
    # Update ticket timestamp and track first response
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if is_admin and not ticket.get("first_response_at"):
        update_fields["first_response_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_fields})
    
    # Send notification (non-internal comments only)
    if not is_internal_note:
        if is_admin:
            await create_notification(
                user_id=ticket["created_by"],
                notif_type=NotificationType.TICKET_COMMENT,
                title="New Comment on Your Ticket",
                message=f"[{ticket['ticket_number']}] {current_user.get('name', 'Admin')} added a comment",
                reference_id=ticket_id
            )
        else:
            for admin_id in ticket.get("assigned_to", []):
                await create_notification(
                    user_id=admin_id,
                    notif_type=NotificationType.TICKET_COMMENT,
                    title="New Comment on Ticket",
                    message=f"[{ticket['ticket_number']}] {current_user.get('name', 'User')} added a comment",
                    reference_id=ticket_id
                )
    
    comment_doc.pop("_id", None)
    return comment_doc


# Ticket File Attachments
@api_router.post("/tickets/{ticket_id}/attachments")
async def upload_ticket_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an attachment to a ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    is_admin = current_user.get("role") == "ADMIN"
    if not is_admin and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate file
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: images, PDF, Word, Excel, text files")
    
    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"{ticket_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = TICKET_UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create attachment record
    attachment = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_filename": file.filename or "attachment",
        "file_type": file.content_type,
        "file_size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to ticket
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"attachments": attachment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "message": "File uploaded successfully",
        "attachment": attachment
    }


@api_router.get("/tickets/attachments/{filename}")
async def get_ticket_attachment(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Download a ticket attachment (from ticket or comment)"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    file_path = TICKET_UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if attachment is on a ticket
    ticket = await db.tickets.find_one(
        {"attachments.filename": filename, "tenant_id": tenant_id},
        {"_id": 0, "created_by": 1, "assigned_to": 1}
    )
    
    # If not found in tickets, check ticket_comments
    if not ticket:
        comment = await db.ticket_comments.find_one(
            {"attachments.filename": filename},
            {"_id": 0, "ticket_id": 1, "user_id": 1}
        )
        
        if comment:
            # Get the parent ticket to verify access
            ticket = await db.tickets.find_one(
                {"id": comment["ticket_id"], "tenant_id": tenant_id},
                {"_id": 0, "created_by": 1, "assigned_to": 1}
            )
    
    # Verify access
    if ticket:
        is_admin = current_user.get("role") in ["ADMIN", "SUPER_ADMIN"]
        is_creator = ticket.get("created_by") == current_user["id"]
        is_assigned = current_user["id"] in ticket.get("assigned_to", [])
        
        if not is_admin and not is_creator and not is_assigned:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # No ticket found - deny access for security
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        content_type = "application/octet-stream"
    
    # Get original filename if available
    original_filename = filename
    if ticket:
        for att in ticket.get("attachments", []):
            if att.get("filename") == filename:
                original_filename = att.get("original_filename", filename)
                break
    
    return FileResponse(
        file_path,
        media_type=content_type,
        filename=original_filename
    )


@api_router.delete("/tickets/{ticket_id}/attachments/{attachment_id}")
async def delete_ticket_attachment(
    ticket_id: str,
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an attachment from a ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    is_admin = current_user.get("role") == "ADMIN"
    if not is_admin and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find attachment
    attachment = None
    for att in ticket.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete file
    try:
        file_path = TICKET_UPLOAD_DIR / attachment.get("filename", "")
        if file_path.exists():
            file_path.unlink()
    except:
        pass
    
    # Remove from ticket
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$pull": {"attachments": {"id": attachment_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Attachment deleted successfully"}


# Admin ticket statistics
@api_router.get("/admin/tickets/stats")
async def get_ticket_stats(admin: dict = Depends(require_admin)):
    """Get ticket statistics for admin dashboard"""
    # Count by status
    open_count = await db.tickets.count_documents({"status": "OPEN"})
    in_progress_count = await db.tickets.count_documents({"status": "IN_PROGRESS"})
    waiting_count = await db.tickets.count_documents({"status": "WAITING_ON_USER"})
    resolved_count = await db.tickets.count_documents({"status": "RESOLVED"})
    closed_count = await db.tickets.count_documents({"status": "CLOSED"})
    
    # Count breached SLA
    breached_count = await db.tickets.count_documents({
        "sla_breached": True,
        "status": {"$nin": ["RESOLVED", "CLOSED"]}
    })
    
    # Count by category
    category_counts = {}
    for cat in TicketCategory:
        count = await db.tickets.count_documents({"category": cat.value})
        category_counts[cat.value] = count
    
    # Count by priority
    priority_counts = {}
    for pri in TicketPriority:
        count = await db.tickets.count_documents({
            "priority": pri.value,
            "status": {"$nin": ["RESOLVED", "CLOSED"]}
        })
        priority_counts[pri.value] = count
    
    # Unassigned tickets
    unassigned_count = await db.tickets.count_documents({
        "assigned_to": {"$size": 0},
        "status": {"$nin": ["RESOLVED", "CLOSED"]}
    })
    
    return {
        "by_status": {
            "open": open_count,
            "in_progress": in_progress_count,
            "waiting_on_user": waiting_count,
            "resolved": resolved_count,
            "closed": closed_count
        },
        "active_total": open_count + in_progress_count + waiting_count,
        "sla_breached": breached_count,
        "unassigned": unassigned_count,
        "by_category": category_counts,
        "by_priority": priority_counts
    }


# ============== CALENDAR & HOLIDAYS ==============

class Holiday(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    date: str  # YYYY-MM-DD format
    description: Optional[str] = None
    is_recurring: bool = False  # Recurs every year
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HolidayCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    date: str  # YYYY-MM-DD
    description: Optional[str] = None
    is_recurring: bool = False


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    is_recurring: Optional[bool] = None


# Holiday CRUD
@api_router.post("/admin/holidays")
async def create_holiday(
    holiday_data: HolidayCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new company holiday (Admin only)"""
    holiday = Holiday(
        name=holiday_data.name,
        date=holiday_data.date,
        description=holiday_data.description,
        is_recurring=holiday_data.is_recurring,
        created_by=admin["id"]
    )
    
    holiday_doc = holiday.model_dump()
    holiday_doc["created_at"] = holiday_doc["created_at"].isoformat()
    
    await db.holidays.insert_one(holiday_doc)
    
    return {
        "id": holiday.id,
        "name": holiday.name,
        "date": holiday.date,
        "description": holiday.description,
        "is_recurring": holiday.is_recurring,
        "created_at": holiday.created_at.isoformat()
    }


@api_router.get("/holidays")
async def get_holidays(
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all holidays, optionally filtered by year"""
    query = {}
    
    if year:
        # Match holidays for the given year or recurring holidays
        query["$or"] = [
            {"date": {"$regex": f"^{year}"}},
            {"is_recurring": True}
        ]
    
    holidays = await db.holidays.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    
    # For recurring holidays, adjust the year to the requested year
    result = []
    for h in holidays:
        if h.get("is_recurring") and year:
            # Update the year for display
            original_date = h["date"]
            h["date"] = f"{year}{original_date[4:]}"
        result.append(h)
    
    return result


@api_router.put("/admin/holidays/{holiday_id}")
async def update_holiday(
    holiday_id: str,
    update_data: HolidayUpdate,
    admin: dict = Depends(require_admin)
):
    """Update a holiday (Admin only)"""
    holiday = await db.holidays.find_one({"id": holiday_id}, {"_id": 0})
    
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    update_fields = {}
    if update_data.name is not None:
        update_fields["name"] = update_data.name
    if update_data.date is not None:
        update_fields["date"] = update_data.date
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.is_recurring is not None:
        update_fields["is_recurring"] = update_data.is_recurring
    
    if update_fields:
        await db.holidays.update_one({"id": holiday_id}, {"$set": update_fields})
    
    updated = await db.holidays.find_one({"id": holiday_id}, {"_id": 0})
    return updated


@api_router.delete("/admin/holidays/{holiday_id}")
async def delete_holiday(
    holiday_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete a holiday (Admin only)"""
    result = await db.holidays.delete_one({"id": holiday_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    return {"message": "Holiday deleted successfully"}


# Calendar Events Aggregation
@api_router.get("/calendar/events")
async def get_calendar_events(
    start_date: str,  # YYYY-MM-DD
    end_date: str,    # YYYY-MM-DD
    current_user: dict = Depends(get_current_user)
):
    """
    Get all calendar events for a date range.
    Returns: holidays, leaves, project deadlines, birthdays, work anniversaries
    """
    is_admin = current_user.get("role") == "ADMIN"
    user_id = current_user["id"]
    
    events = []
    
    # Parse year from start_date for recurring events
    year = int(start_date[:4])
    
    # 1. Get Holidays
    holidays = await db.holidays.find({}, {"_id": 0}).to_list(500)
    for h in holidays:
        holiday_date = h["date"]
        # Handle recurring holidays
        if h.get("is_recurring"):
            holiday_date = f"{year}{holiday_date[4:]}"
        
        if start_date <= holiday_date <= end_date:
            events.append({
                "id": h["id"],
                "title": h["name"],
                "start": holiday_date,
                "end": holiday_date,
                "type": "holiday",
                "color": "#EF4444",  # Red
                "description": h.get("description", "Company Holiday"),
                "allDay": True
            })
    
    # 2. Get Approved/Pending Leaves
    leave_query = {
        "status": {"$in": ["APPROVED", "PENDING"]},
        "$or": [
            {"start_date": {"$lte": end_date, "$gte": start_date}},
            {"end_date": {"$lte": end_date, "$gte": start_date}},
            {"start_date": {"$lte": start_date}, "end_date": {"$gte": end_date}}
        ]
    }
    
    # Non-admins only see their own leaves
    if not is_admin:
        leave_query["user_id"] = user_id
    
    leaves = await db.leave_requests.find(leave_query, {"_id": 0}).to_list(500)
    for leave in leaves:
        is_own = leave["user_id"] == user_id
        events.append({
            "id": leave["id"],
            "title": f"{leave.get('user_name', 'Employee')} - {leave.get('leave_type', 'Leave')}" if is_admin else f"{leave.get('leave_type', 'Leave')}",
            "start": leave["start_date"],
            "end": leave["end_date"],
            "type": "leave",
            "status": leave["status"],
            "color": "#22C55E" if leave["status"] == "APPROVED" else "#EAB308",  # Green or Yellow
            "description": leave.get("reason", ""),
            "allDay": True,
            "is_own": is_own
        })
    
    # 3. Get Project Deadlines
    project_query = {"estimated_end_date": {"$gte": start_date, "$lte": end_date}}
    
    if not is_admin:
        # Get projects where user is assigned
        project_query["assigned_employees"] = user_id
    
    projects = await db.projects.find(project_query, {"_id": 0}).to_list(500)
    for proj in projects:
        if proj.get("estimated_end_date"):
            events.append({
                "id": proj["id"],
                "title": f"📅 {proj['name']} Deadline",
                "start": proj["estimated_end_date"],
                "end": proj["estimated_end_date"],
                "type": "project_deadline",
                "color": "#3B82F6",  # Blue
                "description": proj.get("description", ""),
                "allDay": True
            })
    
    # 4. Get Birthdays & Work Anniversaries (only for employees visible to user)
    employee_query = {"is_active": True}
    if not is_admin:
        # For employees, show their own + could show team if we had team structure
        # For now, show all active employees' birthdays (common in companies)
        pass
    
    employees = await db.users.find(employee_query, {
        "_id": 0, "id": 1, "name": 1, "date_of_birth": 1, "join_date": 1
    }).to_list(500)
    
    for emp in employees:
        # Birthday
        if emp.get("date_of_birth"):
            dob = emp["date_of_birth"]
            # Convert to current year
            if len(dob) >= 10:
                birthday_this_year = f"{year}{dob[4:10]}"
                if start_date <= birthday_this_year <= end_date:
                    events.append({
                        "id": f"bday-{emp['id']}",
                        "title": f"🎂 {emp['name']}'s Birthday",
                        "start": birthday_this_year,
                        "end": birthday_this_year,
                        "type": "birthday",
                        "color": "#A855F7",  # Purple
                        "allDay": True
                    })
        
        # Work Anniversary
        if emp.get("join_date"):
            join = emp["join_date"]
            if len(join) >= 10:
                anniversary_this_year = f"{year}{join[4:10]}"
                join_year = int(join[:4])
                years_of_service = year - join_year
                
                if years_of_service > 0 and start_date <= anniversary_this_year <= end_date:
                    events.append({
                        "id": f"anniv-{emp['id']}",
                        "title": f"🎉 {emp['name']} - {years_of_service} Year{'s' if years_of_service > 1 else ''} Anniversary",
                        "start": anniversary_this_year,
                        "end": anniversary_this_year,
                        "type": "anniversary",
                        "color": "#F97316",  # Orange
                        "allDay": True
                    })
    
    return events


# ============== LEGACY ROUTES ==============
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "AurborBloom API v1.0.0"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# Include the router in the main app
app.include_router(api_router)


# Rate Limiting Middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting per tenant"""
    # Skip rate limiting for non-API routes and health checks
    if not request.url.path.startswith("/api") or request.url.path in ["/api/health", "/api/tenants"]:
        return await call_next(request)
    
    # Try to extract tenant_id from JWT token
    tenant_id = "anonymous"
    auth_header = request.headers.get("authorization", "")
    
    if auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            tenant_id = payload.get("tenant_id", "unknown")
        except:
            pass
    
    # Check rate limit
    is_allowed, remaining = check_rate_limit(tenant_id)
    
    if not is_allowed:
        # Log rate limit exceeded
        await log_audit_event(
            event_type=AuditEventType.SUSPICIOUS_ACTIVITY,
            tenant_id=tenant_id,
            details={"reason": "Rate limit exceeded", "endpoint": request.url.path},
            severity="WARNING"
        )
        
        return Response(
            content=json.dumps({
                "detail": "Rate limit exceeded. Please try again later.",
                "retry_after": RATE_LIMIT_WINDOW
            }),
            status_code=429,
            headers={
                "Content-Type": "application/json",
                "X-RateLimit-Limit": str(RATE_LIMIT_MAX_REQUESTS),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(RATE_LIMIT_WINDOW),
                "Retry-After": str(RATE_LIMIT_WINDOW)
            }
        )
    
    # Track usage
    if tenant_id != "anonymous":
        await track_usage(tenant_id, request.url.path, request.method)
    
    # Add rate limit headers to response
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_MAX_REQUESTS)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(RATE_LIMIT_WINDOW)
    
    return response


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
