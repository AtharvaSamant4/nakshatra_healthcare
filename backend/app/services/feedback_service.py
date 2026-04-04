from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.feedback_models import FeedbackResponse


def store_feedback(
    user_id: str,
    session_id: str,
    session_type: str,
    feedback_data: dict,
) -> str:
    """Inserts AI feedback into ai_feedback table. Returns the new feedback id."""
    supabase = get_supabase()

    row = {
        "user_id": user_id,
        "session_id": session_id,
        "session_type": session_type,
        "summary": feedback_data.get("summary"),
        "tips": feedback_data.get("tips"),
        "encouragement": feedback_data.get("encouragement"),
        "focus_areas": feedback_data.get("focus_areas"),
        "recovery_score": feedback_data.get("recovery_score"),
    }

    response = supabase.table("ai_feedback").insert(row).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to store feedback")

    return response.data[0]["id"]


def get_feedback(session_id: str, session_type: str) -> FeedbackResponse:
    """Retrieves feedback by session_id + session_type. Raises 404 if not found."""
    supabase = get_supabase()

    response = (
        supabase.table("ai_feedback")
        .select("*")
        .eq("session_id", session_id)
        .eq("session_type", session_type)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return FeedbackResponse(**response.data[0])
