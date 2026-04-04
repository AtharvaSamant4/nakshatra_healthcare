from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.game_models import (
    GameSessionCreate,
    GameSessionCreateResponse,
    GameSessionListItem,
    GameSessionListResponse,
)
from app.services import gemini_service, feedback_service

VALID_GAME_TYPES = {"memory", "reaction", "pattern", "stroop", "trail_making"}


def create_game_session(payload: GameSessionCreate) -> GameSessionCreateResponse:
    if payload.game_type not in VALID_GAME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid game_type. Must be one of: {', '.join(VALID_GAME_TYPES)}",
        )

    supabase = get_supabase()

    row = {
        "user_id": payload.user_id,
        "game_type": payload.game_type,
        "score": payload.score,
        "accuracy": payload.accuracy,
        "avg_reaction_ms": payload.avg_reaction_ms,
        "level_reached": payload.level_reached,
        "duration_seconds": payload.duration_seconds,
        "game_metadata": payload.game_metadata,
    }

    insert_response = supabase.table("game_sessions").insert(row).execute()

    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Failed to save game session")

    session_id = insert_response.data[0]["id"]

    # Fetch recent history for same user + game_type
    history_response = (
        supabase.table("game_sessions")
        .select("completed_at, score, accuracy")
        .eq("user_id", payload.user_id)
        .eq("game_type", payload.game_type)
        .neq("id", session_id)
        .order("completed_at", desc=True)
        .limit(5)
        .execute()
    )
    history = history_response.data or []

    # Call Gemini — always returns something (fallback on failure)
    session_data = {
        "game_type": payload.game_type,
        "score": payload.score,
        "accuracy": payload.accuracy,
        "level_reached": payload.level_reached,
        "duration_seconds": payload.duration_seconds,
        "game_metadata": payload.game_metadata or {},
    }
    feedback_data = gemini_service.generate_game_feedback(session_data, history)

    # Store feedback and get its id
    feedback_id = feedback_service.store_feedback(
        user_id=payload.user_id,
        session_id=session_id,
        session_type="game",
        feedback_data=feedback_data,
    )

    session_record = insert_response.data[0]
    return GameSessionCreateResponse(
        id=session_record["id"],
        user_id=session_record["user_id"],
        game_type=session_record["game_type"],
        score=session_record["score"],
        accuracy=session_record.get("accuracy"),
        level_reached=session_record.get("level_reached"),
        duration_seconds=session_record.get("duration_seconds"),
        completed_at=session_record["completed_at"],
        feedback_id=feedback_id,
    )


def list_game_sessions(
    user_id: str,
    game_type: str | None = None,
    limit: int = 20,
) -> GameSessionListResponse:
    supabase = get_supabase()

    # Count query
    count_q = (
        supabase.table("game_sessions")
        .select("id", count="exact")
        .eq("user_id", user_id)
    )
    if game_type:
        count_q = count_q.eq("game_type", game_type)
    count_response = count_q.execute()
    total = count_response.count or 0

    # Rows query
    rows_q = (
        supabase.table("game_sessions")
        .select("id, game_type, score, accuracy, duration_seconds, completed_at")
        .eq("user_id", user_id)
        .order("completed_at", desc=True)
        .limit(limit)
    )
    if game_type:
        rows_q = rows_q.eq("game_type", game_type)
    rows_response = rows_q.execute()
    rows = rows_response.data or []

    sessions = [GameSessionListItem(**r) for r in rows]
    return GameSessionListResponse(sessions=sessions, total=total)
