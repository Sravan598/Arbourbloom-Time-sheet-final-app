"""
Tenant Management Routes
Super Admin routes for managing tenants
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os

from database import db
from models.tenant import (
    Tenant, TenantCreate, TenantUpdate, TenantResponse, 
    TenantPublicInfo, TenantSettings, DEFAULT_TENANT_SLUG
)
from utils.auth import require_super_admin, get_current_user

router = APIRouter(tags=["Tenants"])


@router.get("/tenants/public", response_model=List[TenantPublicInfo])
async def get_public_tenants():
    """Get list of active tenants for login dropdown"""
    tenants = await db.tenants.find(
        {"is_active": True},
        {"_id": 0, "slug": 1, "name": 1, "logo_url": 1, "primary_color": 1, "settings": 1}
    ).to_list(100)
    return tenants


@router.get("/tenants/{slug}/public", response_model=TenantPublicInfo)
async def get_tenant_public_info(slug: str):
    """Get public info for a specific tenant"""
    tenant = await db.tenants.find_one(
        {"slug": slug, "is_active": True},
        {"_id": 0, "slug": 1, "name": 1, "logo_url": 1, "primary_color": 1, "settings": 1}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.get("/super-admin/tenants", response_model=List[TenantResponse])
async def get_all_tenants(super_admin: dict = Depends(require_super_admin)):
    """Get all tenants (Super Admin only)"""
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(100)
    return tenants


@router.post("/super-admin/tenants", response_model=TenantResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    super_admin: dict = Depends(require_super_admin)
):
    """Create a new tenant (Super Admin only)"""
    # Check if slug already exists
    existing = await db.tenants.find_one({"slug": tenant_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Tenant slug already exists")
    
    # Generate unique admin code
    admin_code = f"{tenant_data.slug.upper()}-ADMIN-{uuid.uuid4().hex[:6].upper()}"
    
    tenant = Tenant(
        slug=tenant_data.slug,
        name=tenant_data.name,
        logo_url=tenant_data.logo_url,
        primary_color=tenant_data.primary_color or "#1a1a1a",
        secondary_color=tenant_data.secondary_color or "#D4AF37",
        email=tenant_data.email,
        phone=tenant_data.phone,
        address=tenant_data.address,
        admin_signup_code=admin_code,
        created_by=super_admin.get("id"),
        settings=TenantSettings()
    )
    
    doc = tenant.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.tenants.insert_one(doc)
    
    return tenant


@router.get("/super-admin/tenants/{tenant_id}")
async def get_tenant_details(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Get detailed tenant information including admin code"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.put("/super-admin/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    super_admin: dict = Depends(require_super_admin)
):
    """Update tenant settings (Super Admin only)"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_dict = {k: v for k, v in tenant_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": update_dict}
        )
    
    updated = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return updated


@router.delete("/super-admin/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    super_admin: dict = Depends(require_super_admin)
):
    """Soft delete a tenant (Super Admin only)"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if tenant.get("slug") == DEFAULT_TENANT_SLUG:
        raise HTTPException(status_code=400, detail="Cannot delete the default tenant")
    
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Tenant deactivated successfully"}


@router.get("/tenants/by-domain/{domain}")
async def get_tenant_by_domain(domain: str):
    """Get tenant by custom domain (for domain-based routing)"""
    tenant = await db.tenants.find_one(
        {"custom_domain": domain, "custom_domain_verified": True, "is_active": True},
        {"_id": 0, "slug": 1, "name": 1, "logo_url": 1, "primary_color": 1, "settings": 1}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found for this domain")
    return tenant
