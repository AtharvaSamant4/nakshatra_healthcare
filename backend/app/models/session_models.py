from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class AngleHistoryItem(BaseModel):
    rep: int
    peak_angle: float


class SessionCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user_id: str
    exercise_id: str
    reps_completed: int
    avg_angle: Optional[float] = None
    min_angle: Optional[float] = None
    max_angle: Optional[float] = None
    form_score: Optional[float] = None
    duration_seconds: Optional[int] = None
    angle_history: Optional[list[AngleHistoryItem]] = None
    started_at: datetime
    completed_at: datetime
    prescription_id: Optional[str] = None  # V2: link session to a prescription
    # Progressive ROM metrics from client (optional; not persisted until DB columns exist)
    score: Optional[int] = None
    quality: Optional[str] = None


class SessionProgressComparison(BaseModel):
    """Session-over-session comparison (optional on create response)."""

    difference: int
    status: str
    message: str


class SessionCreateResponse(BaseModel):
    id: str
    user_id: str
    exercise_id: str
    reps_completed: int
    avg_angle: Optional[float] = None
    min_angle: Optional[float] = None
    max_angle: Optional[float] = None
    form_score: Optional[float] = None
    duration_seconds: Optional[int] = None
    started_at: datetime
    completed_at: datetime
    feedback_id: str
    progress: Optional[SessionProgressComparison] = None


class SessionDetail(BaseModel):
    id: str
    user_id: str
    exercise_id: str
    exercise_name: Optional[str] = None
    reps_completed: int
    avg_angle: Optional[float] = None
    min_angle: Optional[float] = None
    max_angle: Optional[float] = None
    form_score: Optional[float] = None
    duration_seconds: Optional[int] = None
    angle_history: Optional[list[AngleHistoryItem]] = None
    started_at: datetime
    completed_at: datetime


class SessionListItem(BaseModel):
    id: str
    exercise_name: Optional[str] = None
    reps_completed: int
    form_score: Optional[float] = None
    duration_seconds: Optional[int] = None
    completed_at: datetime
    progressive_score: Optional[int] = None
    progressive_quality: Optional[str] = None


class SessionListResponse(BaseModel):
    sessions: list[SessionListItem]
    total: int
