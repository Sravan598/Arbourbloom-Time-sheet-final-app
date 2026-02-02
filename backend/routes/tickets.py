"""
Ticket Management Routes
Handles support tickets, comments, and attachments
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import aiofiles
import mimetypes

from database import db
from config import DEFAULT_TENANT_SLUG, TICKET_UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_FILE_TYPES
from utils.auth import get_current_user, require_admin, get_tenant_id
from services.notification import create_notification
from services.webhook import trigger_webhooks, WebhookEventType
from models.enums import NotificationType, TicketCategory, TicketPriority, TicketStatus

router = APIRouter(tags=["Tickets"])


# Ensure upload directory exists
TICKET_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ============== CONSTANTS ==============

SLA_HOURS = {
    "LOW": 72,
    "MEDIUM": 48,
    "HIGH": 24,
    "URGENT": 4
}

CATEGORY_NAMES = {
    "IT_SUPPORT": "IT Support",
    "HR": "Human Resources",
    "PAYROLL": "Payroll",
    "FACILITIES": "Facilities",
    "TIME_ATTENDANCE": "Time & Attendance",
    "BENEFITS": "Benefits",
    "OTHER": "Other"
}


# ============== REQUEST/RESPONSE MODELS ==============

class Ticket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus = TicketStatus.OPEN
    created_by: str
    creator_name: str
    creator_email: str
    creator_image: Optional[str] = None
    assigned_to: List[str] = []
    assigned_names: List[str] = []
    sla_due_at: Optional[datetime] = None
    sla_breached: bool = False
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    attachments: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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


class TicketComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    user_role: str
    content: str
    attachments: List[dict] = []
    is_internal: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketCommentCreate(BaseModel):
    content: str
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


# ============== HELPER FUNCTIONS ==============

async def generate_ticket_number() -> str:
    """Generate a unique ticket number like TKT-2024-00001"""
    year = datetime.now(timezone.utc).year
    
    # Get the last ticket number for this year
    last_ticket = await db.tickets.find_one(
        {"ticket_number": {"$regex": f"^TKT-{year}-"}},
        sort=[("ticket_number", -1)]
    )
    
    if last_ticket:
        try:
            last_num = int(last_ticket["ticket_number"].split("-")[-1])
            new_num = last_num + 1
        except Exception:
            new_num = 1
    else:
        new_num = 1
    
    return f"TKT-{year}-{new_num:05d}"


def calculate_sla_due(priority: str) -> datetime:
    """Calculate SLA due date based on priority"""
    hours = SLA_HOURS.get(priority, 24)
    return datetime.now(timezone.utc) + timedelta(hours=hours)


# ============== TICKET CRUD ROUTES ==============

@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new support ticket (any authenticated user)"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
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
    ticket_doc["tenant_id"] = tenant_id
    ticket_doc["created_at"] = ticket_doc["created_at"].isoformat()
    ticket_doc["updated_at"] = ticket_doc["updated_at"].isoformat()
    ticket_doc["sla_due_at"] = ticket_doc["sla_due_at"].isoformat() if ticket_doc["sla_due_at"] else None
    ticket_doc["category"] = ticket_doc["category"].value
    ticket_doc["priority"] = ticket_doc["priority"].value
    ticket_doc["status"] = ticket_doc["status"].value
    
    await db.tickets.insert_one(ticket_doc)
    
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
    admins = await db.users.find({
        "tenant_id": tenant_id,
        "role": "ADMIN", 
        "is_active": True
    }, {"_id": 0, "id": 1}).to_list(100)
    
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


@router.get("/tickets")
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
                except Exception:
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


@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific ticket by ID"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    ticket = await db.tickets.find_one({
        "id": ticket_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
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


@router.put("/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    update_data: TicketUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a ticket (Admin only for most fields)"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    ticket = await db.tickets.find_one({
        "id": ticket_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
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


@router.delete("/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete a ticket (Admin only)"""
    tenant_id = get_tenant_id(admin)
    
    ticket = await db.tickets.find_one({
        "id": ticket_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
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


# ============== TICKET COMMENT ROUTES ==============

@router.get("/tickets/{ticket_id}/comments")
async def get_ticket_comments(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comments for a ticket"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    ticket = await db.tickets.find_one({
        "id": ticket_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    is_admin = current_user.get("role") == "ADMIN"
    if not is_admin and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Filter out internal comments for non-admins
    query = {"ticket_id": ticket_id}
    if not is_admin:
        query["is_internal"] = False
    
    comments = await db.ticket_comments.find(query, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Parse dates
    for comment in comments:
        if isinstance(comment.get("created_at"), str):
            comment["created_at"] = datetime.fromisoformat(comment["created_at"].replace("Z", "+00:00"))
    
    return comments


@router.post("/tickets/{ticket_id}/comments")
async def create_ticket_comment(
    ticket_id: str,
    comment_data: TicketCommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a comment to a ticket"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    ticket = await db.tickets.find_one({
        "id": ticket_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    is_admin = current_user.get("role") == "ADMIN"
    if not is_admin and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only admins can create internal comments
    if comment_data.is_internal and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can create internal comments")
    
    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user["id"],
        user_name=current_user.get("name", "Unknown"),
        user_image=current_user.get("profile_image"),
        user_role=current_user.get("role", "EMPLOYEE"),
        content=comment_data.content,
        is_internal=comment_data.is_internal
    )
    
    comment_doc = comment.model_dump()
    comment_doc["tenant_id"] = tenant_id
    comment_doc["created_at"] = comment_doc["created_at"].isoformat()
    
    await db.ticket_comments.insert_one(comment_doc)
    
    # Update ticket's updated_at
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Track first response time for admin comments
    if is_admin and not ticket.get("first_response_at"):
        await db.tickets.update_one(
            {"id": ticket_id},
            {"$set": {"first_response_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Notify ticket creator if admin commented (non-internal)
    if is_admin and not comment_data.is_internal:
        await create_notification(
            user_id=ticket["created_by"],
            notif_type=NotificationType.TICKET_COMMENT,
            title="New Comment on Your Ticket",
            message=f"[{ticket['ticket_number']}] {current_user.get('name', 'Admin')} commented on your ticket",
            reference_id=ticket_id
        )
    # Notify assigned admins if employee commented
    elif not is_admin:
        for admin_id in ticket.get("assigned_to", []):
            await create_notification(
                user_id=admin_id,
                notif_type=NotificationType.TICKET_COMMENT,
                title="New Comment on Ticket",
                message=f"[{ticket['ticket_number']}] {current_user.get('name', 'Employee')} added a comment",
                reference_id=ticket_id
            )
    
    comment_doc.pop("_id", None)
    comment_doc["created_at"] = comment.created_at
    
    return comment_doc


# ============== TICKET ATTACHMENT ROUTES ==============

@router.get("/tickets/attachments/{filename}")
async def get_ticket_attachment(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Download a ticket attachment"""
    from fastapi.responses import FileResponse
    
    file_path = TICKET_UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Get original filename from ticket or comment attachment
    ticket = await db.tickets.find_one(
        {"attachments.filename": filename},
        {"_id": 0, "attachments": 1, "created_by": 1, "tenant_id": 1}
    )
    
    original_filename = filename
    
    if ticket:
        # Check access
        tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
        if ticket.get("tenant_id") != tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if current_user.get("role") != "ADMIN" and ticket.get("created_by") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        for att in ticket.get("attachments", []):
            if att.get("filename") == filename:
                original_filename = att.get("original_filename", filename)
                break
    else:
        # Check in comments
        comment = await db.ticket_comments.find_one(
            {"attachments.filename": filename},
            {"_id": 0, "attachments": 1, "ticket_id": 1}
        )
        
        if comment:
            for att in comment.get("attachments", []):
                if att.get("filename") == filename:
                    original_filename = att.get("original_filename", filename)
                    break
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(original_filename)
    if not content_type:
        content_type = "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        filename=original_filename,
        media_type=content_type
    )


@router.post("/tickets/{ticket_id}/attachments")
async def upload_ticket_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an attachment to a ticket"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    ticket = await db.tickets.find_one({
        "id": ticket_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    if current_user.get("role") != "ADMIN" and ticket["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate file
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Read and check file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")
    
    # Generate unique filename
    ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = TICKET_UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create attachment record
    attachment = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_type": file.content_type,
        "file_size": len(content),
        "uploaded_by": current_user["id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to ticket attachments
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"attachments": attachment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return attachment


@router.delete("/tickets/{ticket_id}/attachments/{attachment_id}")
async def delete_ticket_attachment(
    ticket_id: str,
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a ticket attachment"""
    tenant_id = current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    ticket = await db.tickets.find_one({
        "id": ticket_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access - only creator or admin can delete
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


# ============== ADMIN TICKET STATS ==============

@router.get("/admin/tickets/stats")
async def get_ticket_stats(admin: dict = Depends(require_admin)):
    """Get ticket statistics for the tenant"""
    tenant_id = get_tenant_id(admin)
    
    # Total tickets by status
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.tickets.aggregate(pipeline).to_list(100)
    
    # Total tickets by priority
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    priority_counts = await db.tickets.aggregate(pipeline).to_list(100)
    
    # Total tickets by category
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    category_counts = await db.tickets.aggregate(pipeline).to_list(100)
    
    # SLA breached count
    sla_breached = await db.tickets.count_documents({
        "tenant_id": tenant_id,
        "sla_breached": True,
        "status": {"$nin": ["RESOLVED", "CLOSED"]}
    })
    
    # Average resolution time (in hours)
    pipeline = [
        {"$match": {
            "tenant_id": tenant_id,
            "resolved_at": {"$exists": True},
            "created_at": {"$exists": True}
        }},
        {"$project": {
            "resolution_time": {
                "$divide": [
                    {"$subtract": [
                        {"$dateFromString": {"dateString": "$resolved_at"}},
                        {"$dateFromString": {"dateString": "$created_at"}}
                    ]},
                    3600000  # Convert to hours
                ]
            }
        }},
        {"$group": {"_id": None, "avg_resolution_hours": {"$avg": "$resolution_time"}}}
    ]
    resolution_time = await db.tickets.aggregate(pipeline).to_list(1)
    avg_resolution = resolution_time[0]["avg_resolution_hours"] if resolution_time else 0
    
    return {
        "by_status": {item["_id"]: item["count"] for item in status_counts},
        "by_priority": {item["_id"]: item["count"] for item in priority_counts},
        "by_category": {item["_id"]: item["count"] for item in category_counts},
        "sla_breached": sla_breached,
        "avg_resolution_hours": round(avg_resolution, 1) if avg_resolution else 0
    }
