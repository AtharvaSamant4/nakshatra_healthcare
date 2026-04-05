import json
import logging
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.feedback_models import FeedbackResponse

logger = logging.getLogger(__name__)


def _coerce_jsonb_list(val, *, allow_null: bool) -> list | None:
    """Ensure value is JSON-serializable for PostgREST jsonb columns."""
    if val is None:
        return None if allow_null else []
    if isinstance(val, list):
        out: list[str] = []
        for x in val:
            if isinstance(x, (str, int, float, bool)):
                out.append(str(x))
            elif isinstance(x, dict):
                out.append(json.dumps(x))
            else:
                out.append(str(x))
        return out
    if isinstance(val, str):
        return [val]
    return [str(val)]


def _sanitize_feedback_payload(feedback_data: dict) -> dict:
    summary = feedback_data.get("summary")
    if summary is not None:
        summary = str(summary)[:8000]

    enc = feedback_data.get("encouragement")
    if enc is not None:
        enc = str(enc)[:8000]

    rs = feedback_data.get("recovery_score")
    try:
        if rs is not None:
            rs = max(1, min(10, int(rs)))
    except (TypeError, ValueError):
        rs = None

    return {
        "summary": summary,
        "tips": _coerce_jsonb_list(feedback_data.get("tips"), allow_null=True),
        "encouragement": enc,
        "focus_areas": _coerce_jsonb_list(feedback_data.get("focus_areas"), allow_null=True),
        "recovery_score": rs,
    }


def store_feedback(
    user_id: str,
    session_id: str,
    session_type: str,
    feedback_data: dict,
) -> str:
    """Inserts AI feedback into ai_feedback table. Returns the new feedback id."""
    supabase = get_supabase()

    sanitized = _sanitize_feedback_payload(feedback_data)
    row = {
        "user_id": user_id,
        "session_id": session_id,
        "session_type": session_type,
        "summary": sanitized["summary"],
        "tips": sanitized["tips"],
        "encouragement": sanitized["encouragement"],
        "focus_areas": sanitized["focus_areas"],
        "recovery_score": sanitized["recovery_score"],
    }

    try:
        response = supabase.table("ai_feedback").insert(row).execute()
    except Exception as exc:
        logger.warning("ai_feedback full insert failed (%s), retrying minimal row", exc)
        minimal = {
            "user_id": user_id,
            "session_id": session_id,
            "session_type": session_type,
            "summary": (sanitized["summary"] or "Your session was recorded successfully.")[:2000],
            "recovery_score": sanitized["recovery_score"] if sanitized["recovery_score"] is not None else 7,
        }
        try:
            response = supabase.table("ai_feedback").insert(minimal).execute()
        except Exception as exc2:
            logger.exception("ai_feedback minimal insert failed: %s", exc2)
            raise HTTPException(
                status_code=500,
                detail="Failed to store feedback",
            ) from exc2

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
