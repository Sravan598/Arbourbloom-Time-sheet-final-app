from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    file_type: str
    file_size: int
    file_data: str
    category: str = "general"
    description: str = ""
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentUpload(BaseModel):
    name: str
    file_type: str
    file_size: int
    file_data: str
    category: str = "general"
    description: str = ""


class DocumentResponse(BaseModel):
    id: str
    user_id: str
    name: str
    file_type: str
    file_size: int
    category: str
    description: str
    uploaded_at: datetime


class SetPinRequest(BaseModel):
    pin: str


class VerifyPinRequest(BaseModel):
    pin: str
