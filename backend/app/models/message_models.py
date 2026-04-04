from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    patient_id: str
    sender_type: str  # "patient" or "doctor"
    sender_id: str
    content: str


class MessageResponse(BaseModel):
    id: str
    patient_id: str
    sender_type: str
    content: str
    created_at: datetime


class MessageItem(BaseModel):
    id: str
    sender_type: str
    sender_name: Optional[str] = None
    content: str
    created_at: datetime


class MessageThreadResponse(BaseModel):
    messages: list[MessageItem]
