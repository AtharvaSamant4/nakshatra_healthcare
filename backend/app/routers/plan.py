from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.db.supabase_client import get_supabase
from app.services import patient_service, plan_engine

router = APIRouter(prefix="/api/plan", tags=["plan"])


def _latest_session_score_percent(user_id: str) -> int:
    supabase = get_supabase()
    try:
        try:
            resp = (
                supabase.table("exercise_sessions")
                .select("form_score, progressive_score")
                .eq("user_id", user_id)
                .order("completed_at", desc=True)
                .limit(1)
                .execute()
            )
        except Exception:
            resp = (
                supabase.table("exercise_sessions")
                .select("form_score")
                .eq("user_id", user_id)
                .order("completed_at", desc=True)
                .limit(1)
                .execute()
            )
    except Exception:
        return 0
    if not resp.data:
        return 0
    row = resp.data[0]
    ps = row.get("progressive_score")
    if ps is not None:
        try:
            return int(ps)
        except (TypeError, ValueError):
            pass
    fs = row.get("form_score")
    if fs is None:
        return 0
    try:
        return int(round(float(fs) * 100))
    except (TypeError, ValueError):
        return 0


@router.get("/{patient_id}")
def get_adaptive_plan(patient_id: UUID):
    """
    Returns a basic adaptive plan from patient injury_type and latest session form score.
    """
    pid = str(patient_id)
    try:
        patient = patient_service.get_patient(pid)
    except HTTPException:
        raise
    injury = patient.injury_type or ""
    score = _latest_session_score_percent(pid)
    plan = plan_engine.generate_basic_plan(injury, score)
    return {"plan": plan, "note": "Based on your current progress"}
