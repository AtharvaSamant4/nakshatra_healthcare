from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.cognitive_test_models import (
    CognitiveTestCreate,
    CognitiveTestCreateResponse,
    CognitiveTestListItem,
    CognitiveTestListResponse,
    CognitiveTestEvaluateRequest,
    CognitiveTestEvaluateResponse,
)
from app.services import gemini_service, feedback_service

VALID_TEST_TYPES = {"memory_recall", "verbal_fluency", "attention_reaction", "sentence_repetition"}


def create_cognitive_test_session(payload: CognitiveTestCreate) -> CognitiveTestCreateResponse:
    if payload.test_type not in VALID_TEST_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid test_type. Must be one of: {', '.join(VALID_TEST_TYPES)}",
        )

    supabase = get_supabase()

    row = {
        "user_id": payload.user_id,
        "test_type": payload.test_type,
        "score": payload.score,
        "response_time_ms": payload.response_time_ms,
        "accuracy": payload.accuracy,
        "transcript": payload.transcript,
        "expected_response": payload.expected_response,
        "word_count": payload.word_count,
        "error_count": payload.error_count,
        "duration_seconds": payload.duration_seconds,
        "test_metadata": payload.test_metadata,
    }

    insert_response = supabase.table("cognitive_test_sessions").insert(row).execute()

    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Failed to save cognitive test session")

    session_id = insert_response.data[0]["id"]

    # Fetch recent history for same user + test_type
    history_response = (
        supabase.table("cognitive_test_sessions")
        .select("completed_at, score, accuracy, response_time_ms")
        .eq("user_id", payload.user_id)
        .eq("test_type", payload.test_type)
        .neq("id", session_id)
        .order("completed_at", desc=True)
        .limit(5)
        .execute()
    )
    history = history_response.data or []

    # Call Gemini for feedback
    session_data = {
        "test_type": payload.test_type,
        "score": payload.score,
        "accuracy": payload.accuracy,
        "response_time_ms": payload.response_time_ms,
        "word_count": payload.word_count,
        "error_count": payload.error_count,
        "duration_seconds": payload.duration_seconds,
        "transcript": payload.transcript,
        "expected_response": payload.expected_response,
        "test_metadata": payload.test_metadata or {},
    }
    feedback_data = gemini_service.generate_cognitive_test_feedback(session_data, history)

    # Store feedback
    feedback_id = feedback_service.store_feedback(
        user_id=payload.user_id,
        session_id=session_id,
        session_type="cognitive_test",
        feedback_data=feedback_data,
    )

    session_record = insert_response.data[0]
    return CognitiveTestCreateResponse(
        id=session_record["id"],
        user_id=session_record["user_id"],
        test_type=session_record["test_type"],
        score=session_record["score"],
        accuracy=session_record.get("accuracy"),
        response_time_ms=session_record.get("response_time_ms"),
        duration_seconds=session_record.get("duration_seconds"),
        completed_at=session_record["completed_at"],
        feedback_id=feedback_id,
    )


def list_cognitive_test_sessions(
    user_id: str,
    test_type: str | None = None,
    limit: int = 20,
) -> CognitiveTestListResponse:
    supabase = get_supabase()

    # Count query
    count_q = (
        supabase.table("cognitive_test_sessions")
        .select("id", count="exact")
        .eq("user_id", user_id)
    )
    if test_type:
        count_q = count_q.eq("test_type", test_type)
    count_response = count_q.execute()
    total = count_response.count or 0

    # Rows query
    rows_q = (
        supabase.table("cognitive_test_sessions")
        .select("id, test_type, score, accuracy, response_time_ms, duration_seconds, completed_at")
        .eq("user_id", user_id)
        .order("completed_at", desc=True)
        .limit(limit)
    )
    if test_type:
        rows_q = rows_q.eq("test_type", test_type)
    rows_response = rows_q.execute()
    rows = rows_response.data or []

    sessions = [CognitiveTestListItem(**r) for r in rows]
    return CognitiveTestListResponse(sessions=sessions, total=total)


def evaluate_response(payload: CognitiveTestEvaluateRequest) -> CognitiveTestEvaluateResponse:
    if payload.test_type not in VALID_TEST_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid test_type. Must be one of: {', '.join(VALID_TEST_TYPES)}",
        )

    result = gemini_service.evaluate_cognitive_response(
        test_type=payload.test_type,
        transcript=payload.transcript,
        expected=payload.expected_response,
        metadata=payload.test_metadata,
    )

    return CognitiveTestEvaluateResponse(**result)
