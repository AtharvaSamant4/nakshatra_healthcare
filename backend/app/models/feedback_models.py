from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FeedbackResponse(BaseModel):
    id: str
    session_id: str
    session_type: str
    summary: Optional[str] = None
    tips: Optional[list[str]] = None
    encouragement: Optional[str] = None
    focus_areas: Optional[list[str]] = None
    recovery_score: Optional[int] = None
    created_at: datetime


class FeedbackProcessing(BaseModel):
    status: str = "processing"
    message: str = "AI feedback is being generated. Please retry in a few seconds."
