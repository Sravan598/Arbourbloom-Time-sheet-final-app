from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from .enums import ChannelType


class ChatChannel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    channel_type: ChannelType = ChannelType.PUBLIC
    created_by: str
    members: List[str] = []
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatChannelCreate(BaseModel):
    name: str
    description: str = ""
    channel_type: ChannelType = ChannelType.PUBLIC
    members: List[str] = []


class ChatChannelResponse(BaseModel):
    id: str
    name: str
    description: str
    channel_type: ChannelType
    created_by: str
    creator_name: str = ""
    members: List[str]
    member_count: int = 0
    is_default: bool
    created_at: datetime


class ChatAttachment(BaseModel):
    file_url: str
    filename: str
    file_type: str
    file_size: int
    is_image: bool = False


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_id: Optional[str] = None
    dm_thread_id: Optional[str] = None
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    content: str
    attachment: Optional[ChatAttachment] = None
    reactions: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class ChatMessageCreate(BaseModel):
    content: str
    attachment: Optional[ChatAttachment] = None


class ChatMessageResponse(BaseModel):
    id: str
    channel_id: Optional[str] = None
    dm_thread_id: Optional[str] = None
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    content: str
    attachment: Optional[dict] = None
    reactions: dict = {}
    created_at: datetime
    updated_at: Optional[datetime] = None


class DMThread(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]  # Exactly 2 user IDs
    last_message_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DMThreadResponse(BaseModel):
    id: str
    participants: List[str]
    other_user_id: str
    other_user_name: str
    other_user_image: Optional[str] = None
    last_message_at: datetime
    created_at: datetime


class ChatUnreadCount(BaseModel):
    channel_id: Optional[str] = None
    dm_thread_id: Optional[str] = None
    count: int
    last_read_at: Optional[datetime] = None


class ChatUserStatus(BaseModel):
    user_id: str
    user_name: str
    user_image: Optional[str] = None
    is_online: bool = False
    last_seen: Optional[datetime] = None
