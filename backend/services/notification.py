from datetime import datetime, timezone
import uuid

# Import from local modules
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import db
from models.enums import NotificationType


async def create_notification(
    user_id: str, 
    notif_type: NotificationType, 
    title: str, 
    message: str, 
    reference_id: str = None
):
    """Create a notification for a user"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notif_type.value,
        "title": title,
        "message": message,
        "reference_id": reference_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification
