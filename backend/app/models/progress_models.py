from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProgressSummary(BaseModel):
    total_exercise_sessions: int
    total_game_sessions: int
    total_reps: int
    avg_form_score: Optional[float] = None
    current_streak_days: int
    total_active_days: int


class ExerciseProgressDay(BaseModel):
    date: str               # "YYYY-MM-DD"
    sessions: int
    total_reps: int
    avg_form_score: Optional[float] = None


class GameProgressDay(BaseModel):
    date: str
    game_type: str
    best_score: int
    avg_accuracy: Optional[float] = None


class RecentFeedbackItem(BaseModel):
    id: str
    session_type: str
    summary: Optional[str] = None
    recovery_score: Optional[int] = None
    created_at: datetime


class BodyPartBreakdownItem(BaseModel):
    body_part: str
    sessions: int
    avg_form_score: Optional[float] = None


class ProgressResponse(BaseModel):
    user_id: str
    summary: ProgressSummary
    exercise_progress: list[ExerciseProgressDay]
    game_progress: list[GameProgressDay]
    recent_feedback: list[RecentFeedbackItem]
    body_part_breakdown: list[BodyPartBreakdownItem]


class ExerciseTrendDay(BaseModel):
    date: str
    avg_angle: Optional[float] = None
    avg_form_score: Optional[float] = None
    total_reps: int


class ExerciseTrendResponse(BaseModel):
    trend: list[ExerciseTrendDay]
