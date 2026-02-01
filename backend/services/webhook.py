"""
Webhook Service
Tenant-specific webhook management and delivery
"""
import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
import uuid
import httpx
from database import db

logger = logging.getLogger(__name__)


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
    events: List[str]
    is_active: bool = True
    headers: Optional[Dict[str, str]] = None
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
            delivery_record["response_body"] = response.text[:500]
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
