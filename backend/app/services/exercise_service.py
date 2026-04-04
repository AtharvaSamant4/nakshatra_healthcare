from fastapi import HTTPException
from typing import Optional
from app.db.supabase_client import get_supabase
from app.models.exercise_models import ExerciseResponse


def list_exercises(
    body_part: Optional[str] = None,
    difficulty: Optional[str] = None,
) -> list[ExerciseResponse]:
    supabase = get_supabase()

    query = supabase.table("exercises").select("*")

    if body_part:
        query = query.eq("body_part", body_part)
    if difficulty:
        query = query.eq("difficulty", difficulty)

    response = query.execute()

    return [ExerciseResponse(**row) for row in (response.data or [])]


def get_exercise(exercise_id: str) -> ExerciseResponse:
    supabase = get_supabase()

    response = supabase.table("exercises").select("*").eq("id", exercise_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Exercise not found")

    return ExerciseResponse(**response.data[0])
