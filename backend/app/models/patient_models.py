from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    doctor_id: Optional[str] = None
    emergency: bool = False
    condition_notes: Optional[str] = None


class PatientUpdate(BaseModel):
    diagnosis: Optional[str] = None
    injury_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    condition_notes: Optional[str] = None
    doctor_id: Optional[str] = None
    phone: Optional[str] = None
    emergency: Optional[bool] = None


class PatientCreateResponse(BaseModel):
    id: str
    name: str
    status: Optional[str] = None
    doctor_id: Optional[str] = None
    created_at: datetime


class PatientListItem(BaseModel):
    id: str
    name: str
    status: Optional[str] = None
    doctor_id: Optional[str] = None
    injury_type: Optional[str] = None
    severity: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    condition_notes: Optional[str] = None
    doctor_id: Optional[str] = None
    status: Optional[str] = None
    diagnosis: Optional[str] = None
    injury_type: Optional[str] = None
    severity: Optional[str] = None
    emergency: Optional[bool] = None
    created_at: datetime
