import logging
import threading
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.session_models import (
    SessionCreate,
    SessionCreateResponse,
    SessionDetail,
    SessionListItem,
    SessionListResponse,
)
from app.services import gemini_service, feedback_service

logger = logging.getLogger(__name__)


def create_session(payload: SessionCreate) -> SessionCreateResponse:
    supabase = get_supabase()

    # Resolve exercise name + body_part for the Gemini prompt
    exercise_row = (
        supabase.table("exercises")
        .select("name, body_part")
        .eq("id", payload.exercise_id)
        .execute()
    )
    exercise_name = exercise_row.data[0]["name"] if exercise_row.data else "Unknown"
    body_part = exercise_row.data[0]["body_part"] if exercise_row.data else "Unknown"

    # Fetch patient clinical context for enhanced Gemini prompt (V2).
    # Safe before migration: patients table may not exist or may lack new columns.
    patient_context: dict | None = None
    try:
        patient_resp = (
            supabase.table("patients")
            .select("diagnosis, injury_type, severity")
            .eq("id", payload.user_id)
            .execute()
        )
        if patient_resp.data:
            row = patient_resp.data[0]
            patient_context = {
                "diagnosis": row.get("diagnosis"),
                "injury_type": row.get("injury_type"),
                "severity": row.get("severity"),
            }
    except Exception as exc:
        # patients table or columns not yet available — proceed without context
        logger.info("patient context unavailable (pre-migration?): %s", exc)

    # Build the row to insert — angle_history stored as JSON-serialisable list of dicts
    angle_history_data = None
    if payload.angle_history:
        angle_history_data = [item.model_dump() for item in payload.angle_history]

    row = {
        "user_id": payload.user_id,
        "exercise_id": payload.exercise_id,
        "reps_completed": payload.reps_completed,
        "avg_angle": payload.avg_angle,
        "min_angle": payload.min_angle,
        "max_angle": payload.max_angle,
        "form_score": payload.form_score,
        "duration_seconds": payload.duration_seconds,
        "angle_history": angle_history_data,
        "started_at": payload.started_at.isoformat(),
        "completed_at": payload.completed_at.isoformat(),
    }
    if payload.prescription_id:
        row["prescription_id"] = payload.prescription_id

    # Insert session — if prescription_id column doesn't exist yet, retry without it
    try:
        insert_response = supabase.table("exercise_sessions").insert(row).execute()
    except Exception as exc:
        if payload.prescription_id and "prescription_id" in row:
            logger.warning(
                "prescription_id column not found, inserting without it: %s", exc
            )
            row_without_rx = {k: v for k, v in row.items() if k != "prescription_id"}
            insert_response = (
                supabase.table("exercise_sessions").insert(row_without_rx).execute()
            )
        else:
            raise

    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Failed to save exercise session")

    session_id = insert_response.data[0]["id"]

    # Fetch recent history for this user + exercise (last 5 sessions before this one)
    history_response = (
        supabase.table("exercise_sessions")
        .select("completed_at, reps_completed, avg_angle, form_score")
        .eq("user_id", payload.user_id)
        .eq("exercise_id", payload.exercise_id)
        .neq("id", session_id)
        .order("completed_at", desc=True)
        .limit(5)
        .execute()
    )
    history = history_response.data or []

    # Call Gemini — always returns something (fallback on failure)
    session_data = {
        "exercise_name": exercise_name,
        "body_part": body_part,
        "reps_completed": payload.reps_completed,
        "avg_angle": payload.avg_angle,
        "min_angle": payload.min_angle,
        "max_angle": payload.max_angle,
        "form_score": payload.form_score,
        "duration_seconds": payload.duration_seconds,
    }
    feedback_data = gemini_service.generate_exercise_feedback(
        session_data, history, patient_context=patient_context
    )

    # Store feedback and get its id
    feedback_id = feedback_service.store_feedback(
        user_id=payload.user_id,
        session_id=session_id,
        session_type="exercise",
        feedback_data=feedback_data,
    )

    session_record = insert_response.data[0]

    # Auto-trigger weekly report in a background thread — never blocks or fails the response
    def _bg_report():
        from app.services import ai_service  # late import avoids circular at module load
        ai_service.auto_trigger_weekly_report(payload.user_id)

    threading.Thread(target=_bg_report, daemon=True).start()

    return SessionCreateResponse(
        id=session_record["id"],
        user_id=session_record["user_id"],
        exercise_id=session_record["exercise_id"],
        reps_completed=session_record["reps_completed"],
        avg_angle=session_record.get("avg_angle"),
        min_angle=session_record.get("min_angle"),
        max_angle=session_record.get("max_angle"),
        form_score=session_record.get("form_score"),
        duration_seconds=session_record.get("duration_seconds"),
        started_at=session_record["started_at"],
        completed_at=session_record["completed_at"],
        feedback_id=feedback_id,
    )


def get_session(session_id: str) -> SessionDetail:
    supabase = get_supabase()

    response = (
        supabase.table("exercise_sessions")
        .select("*")
        .eq("id", session_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found")

    row = response.data[0]

    # Join exercise name
    exercise_name = None
    if row.get("exercise_id"):
        ex = (
            supabase.table("exercises")
            .select("name")
            .eq("id", row["exercise_id"])
            .execute()
        )
        if ex.data:
            exercise_name = ex.data[0]["name"]

    return SessionDetail(
        id=row["id"],
        user_id=row["user_id"],
        exercise_id=row["exercise_id"],
        exercise_name=exercise_name,
        reps_completed=row["reps_completed"],
        avg_angle=row.get("avg_angle"),
        min_angle=row.get("min_angle"),
        max_angle=row.get("max_angle"),
        form_score=row.get("form_score"),
        duration_seconds=row.get("duration_seconds"),
        angle_history=row.get("angle_history"),
        started_at=row["started_at"],
        completed_at=row["completed_at"],
    )


def list_sessions(user_id: str, limit: int = 20, offset: int = 0) -> SessionListResponse:
    supabase = get_supabase()

    # Total count
    count_response = (
        supabase.table("exercise_sessions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total = count_response.count or 0

    # Paginated rows
    rows_response = (
        supabase.table("exercise_sessions")
        .select("id, exercise_id, reps_completed, form_score, duration_seconds, completed_at")
        .eq("user_id", user_id)
        .order("completed_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    rows = rows_response.data or []

    # Bulk resolve exercise names
    exercise_ids = list({r["exercise_id"] for r in rows if r.get("exercise_id")})
    exercise_name_map: dict[str, str] = {}
    if exercise_ids:
        ex_response = (
            supabase.table("exercises")
            .select("id, name")
            .in_("id", exercise_ids)
            .execute()
        )
        exercise_name_map = {e["id"]: e["name"] for e in (ex_response.data or [])}

    sessions = [
        SessionListItem(
            id=r["id"],
            exercise_name=exercise_name_map.get(r.get("exercise_id", "")),
            reps_completed=r["reps_completed"],
            form_score=r.get("form_score"),
            duration_seconds=r.get("duration_seconds"),
            completed_at=r["completed_at"],
        )
        for r in rows
    ]

    return SessionListResponse(sessions=sessions, total=total)
