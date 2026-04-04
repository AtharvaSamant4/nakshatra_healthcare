from fastapi import APIRouter, Query
from typing import Optional
from app.models.progress_models import ProgressResponse, ExerciseTrendResponse
from app.services import progress_service

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/{user_id}", response_model=ProgressResponse)
def get_progress(user_id: str):
    return progress_service.get_progress(user_id)


@router.get("/{user_id}/exercise-trend", response_model=ExerciseTrendResponse)
def get_exercise_trend(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365),
    exercise_id: Optional[str] = Query(default=None),
):
    return progress_service.get_exercise_trend(
        user_id=user_id,
        days=days,
        exercise_id=exercise_id,
    )
