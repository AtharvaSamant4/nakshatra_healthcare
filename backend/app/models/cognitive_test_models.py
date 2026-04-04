from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class CognitiveTestCreate(BaseModel):
    user_id: str
    test_type: str  # 'memory_recall' | 'verbal_fluency' | 'attention_reaction' | 'sentence_repetition'
    score: int
    response_time_ms: Optional[int] = None
    accuracy: Optional[float] = None
    transcript: Optional[str] = None
    expected_response: Optional[str] = None
    word_count: Optional[int] = None
    error_count: Optional[int] = None
    duration_seconds: Optional[int] = None
    test_metadata: Optional[dict[str, Any]] = None


class CognitiveTestCreateResponse(BaseModel):
    id: str
    user_id: str
    test_type: str
    score: int
    accuracy: Optional[float] = None
    response_time_ms: Optional[int] = None
    duration_seconds: Optional[int] = None
    completed_at: datetime
    feedback_id: str


class CognitiveTestListItem(BaseModel):
    id: str
    test_type: str
    score: int
    accuracy: Optional[float] = None
    response_time_ms: Optional[int] = None
    duration_seconds: Optional[int] = None
    completed_at: datetime


class CognitiveTestListResponse(BaseModel):
    sessions: list[CognitiveTestListItem]
    total: int


class CognitiveTestEvaluateRequest(BaseModel):
    test_type: str
    transcript: str
    expected_response: str
    test_metadata: Optional[dict[str, Any]] = None


class CognitiveTestEvaluateResponse(BaseModel):
    score: int
    accuracy: float
    feedback: str
    corrections: list[str]
    missed_items: list[str]
    extra_items: list[str]


# Backward-compatible aliases for existing imports.
EvaluateRequest = CognitiveTestEvaluateRequest
EvaluateResponse = CognitiveTestEvaluateResponse
