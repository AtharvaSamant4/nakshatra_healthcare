from uuid import UUID
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from app.models.feedback_models import FeedbackResponse, FeedbackProcessing
from app.services import feedback_service

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.get("/{session_id}")
def get_feedback(
    session_id: UUID,
    session_type: str = Query(..., description="'exercise' or 'game'"),
):
    """
    Returns 200 with feedback when ready.
    Returns 202 with a processing status if feedback hasn't been stored yet.
    """
    try:
        feedback = feedback_service.get_feedback(str(session_id), session_type)
        return feedback
    except Exception as exc:
        # 404 from get_feedback means feedback not yet available — return 202
        if hasattr(exc, "status_code") and exc.status_code == 404:
            return JSONResponse(
                status_code=202,
                content=FeedbackProcessing().model_dump(),
            )
        raise
