from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class GameSessionCreate(BaseModel):
    user_id: str
    game_type: str
    score: int
    accuracy: Optional[float] = None
    avg_reaction_ms: Optional[float] = None
    level_reached: Optional[int] = None
    duration_seconds: Optional[int] = None
    game_metadata: Optional[dict[str, Any]] = None


class GameSessionCreateResponse(BaseModel):
    id: str
    user_id: str
    game_type: str
    score: int
    accuracy: Optional[float] = None
    level_reached: Optional[int] = None
    duration_seconds: Optional[int] = None
    completed_at: datetime
    feedback_id: str


class GameSessionListItem(BaseModel):
    id: str
    game_type: str
    score: int
    accuracy: Optional[float] = None
    duration_seconds: Optional[int] = None
    completed_at: datetime


class GameSessionListResponse(BaseModel):
    sessions: list[GameSessionListItem]
    total: int
