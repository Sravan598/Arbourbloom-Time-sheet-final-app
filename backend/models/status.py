from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class StatusCheckCreate(BaseModel):
    client_name: str
    
    
class StatusCheck(BaseModel):
    id: str
    client_name: str
    timestamp: datetime
