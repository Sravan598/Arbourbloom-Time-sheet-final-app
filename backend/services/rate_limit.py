"""
Rate Limiting Service
Per-tenant API rate limiting
"""
from datetime import datetime, timezone
from typing import Dict, Tuple
from config import RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS
from database import db
import logging

logger = logging.getLogger(__name__)

# In-memory rate limit tracking (resets on restart - for production use Redis)
rate_limit_store: Dict[str, Dict] = {}

# Usage metrics tracking
usage_metrics_store: Dict[str, Dict] = {}


def check_rate_limit(tenant_id: str) -> Tuple[bool, int]:
    """
    Check if tenant has exceeded rate limit.
    Returns (is_allowed, remaining_requests)
    """
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


def get_usage_metrics(tenant_id: str) -> dict:
    """Get in-memory usage metrics for a tenant"""
    return usage_metrics_store.get(tenant_id, {
        "total_requests": 0,
        "requests_by_endpoint": {},
        "requests_by_hour": {}
    })
