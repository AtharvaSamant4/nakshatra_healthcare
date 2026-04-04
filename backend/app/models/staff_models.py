from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StaffCreate(BaseModel):
    name: str
    email: Optional[str] = None
    role: str  # "doctor" or "receptionist"
    specialization: Optional[str] = None


class StaffListItem(BaseModel):
    id: str
    name: str
    role: str
    specialization: Optional[str] = None


class StaffResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    role: str
    specialization: Optional[str] = None
    created_at: datetime
