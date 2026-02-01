"""
Tenant Models
Multi-tenancy related models for the HRMS application
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


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
