from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    condition_notes: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    condition_notes: Optional[str] = None
    created_at: datetime


class UserListItem(BaseModel):
    id: str
    name: str
    created_at: datetime
