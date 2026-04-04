from fastapi import APIRouter, Query
from typing import Optional
from app.models.exercise_models import ExerciseResponse
from app.services import exercise_service

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseResponse])
def list_exercises(
    body_part: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
):
    return exercise_service.list_exercises(body_part=body_part, difficulty=difficulty)


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: str):
    return exercise_service.get_exercise(exercise_id)
