from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query
from app.models.progress_models import ProgressResponse, ExerciseTrendResponse
from app.services import progress_service

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/{user_id}", response_model=ProgressResponse)
def get_progress(user_id: UUID):
    return progress_service.get_progress(str(user_id))


@router.get("/{user_id}/exercise-trend", response_model=ExerciseTrendResponse)
def get_exercise_trend(
    user_id: UUID,
    days: int = Query(default=30, ge=1, le=365),
    exercise_id: Optional[UUID] = Query(default=None),
):
    return progress_service.get_exercise_trend(
        user_id=str(user_id),
        days=days,
        exercise_id=str(exercise_id) if exercise_id else None,
    )

@router.get("/{user_id}/improvement")
def get_improvement(user_id: UUID):
    return progress_service.get_improvement(str(user_id))
