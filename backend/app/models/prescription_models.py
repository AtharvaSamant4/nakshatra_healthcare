from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: str
    exercise_id: Optional[str] = None
    game_type: Optional[str] = None
    target_reps: Optional[int] = None
    target_sets: Optional[int] = None
    frequency: Optional[str] = None
    priority: str = "normal"
    notes: Optional[str] = None


class PrescriptionUpdate(BaseModel):
    status: Optional[str] = None
    target_reps: Optional[int] = None
    target_sets: Optional[int] = None
    frequency: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionCompliance(BaseModel):
    sessions_completed: int
    last_session_at: Optional[str] = None


class PrescriptionCreateResponse(BaseModel):
    id: str
    patient_id: str
    exercise_id: Optional[str] = None
    status: str
    created_at: datetime


class PrescriptionListItem(BaseModel):
    id: str
    exercise_id: Optional[str] = None
    exercise_name: Optional[str] = None
    game_type: Optional[str] = None
    target_reps: Optional[int] = None
    frequency: Optional[str] = None
    priority: str
    status: str
    compliance: PrescriptionCompliance
