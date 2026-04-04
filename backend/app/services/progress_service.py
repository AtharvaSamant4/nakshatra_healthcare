import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.progress_models import (
    ProgressResponse,
    ProgressSummary,
    ExerciseProgressDay,
    GameProgressDay,
    RecentFeedbackItem,
    BodyPartBreakdownItem,
    ExerciseTrendResponse,
    ExerciseTrendDay,
)

logger = logging.getLogger(__name__)


def _date_str(ts: str) -> str:
    """Extract YYYY-MM-DD from an ISO timestamp string."""
    return ts[:10]


def _safe_avg(values: list[float]) -> float | None:
    clean = [v for v in values if v is not None]
    if not clean:
        return None
    return round(sum(clean) / len(clean), 4)


def _compute_streak(active_dates: set[str]) -> int:
    """Count consecutive days ending today (UTC)."""
    today = datetime.now(timezone.utc).date()
    streak = 0
    current = today
    while str(current) in active_dates:
        streak += 1
        current -= timedelta(days=1)
    return streak


def _user_table(supabase) -> str:
    """Return 'patients' after migration, 'users' before it."""
    try:
        supabase.table("patients").select("id").limit(1).execute()
        return "patients"
    except Exception:
        logger.info("patients table not found, falling back to users for progress check")
        return "users"


def get_progress(user_id: str) -> ProgressResponse:
    supabase = get_supabase()

    # --- Verify user/patient exists (safe before and after migration) ---
    table = _user_table(supabase)
    user_check = supabase.table(table).select("id").eq("id", user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")

    # --- Fetch all exercise sessions ---
    ex_sessions_resp = (
        supabase.table("exercise_sessions")
        .select("id, exercise_id, reps_completed, form_score, completed_at")
        .eq("user_id", user_id)
        .order("completed_at", desc=False)
        .execute()
    )
    ex_sessions = ex_sessions_resp.data or []

    # --- Fetch all game sessions ---
    game_sessions_resp = (
        supabase.table("game_sessions")
        .select("id, game_type, score, accuracy, completed_at")
        .eq("user_id", user_id)
        .order("completed_at", desc=False)
        .execute()
    )
    game_sessions = game_sessions_resp.data or []

    # --- Resolve exercise metadata (body_part) for breakdown ---
    exercise_ids = list({s["exercise_id"] for s in ex_sessions if s.get("exercise_id")})
    exercise_meta: dict[str, dict] = {}
    if exercise_ids:
        ex_meta_resp = (
            supabase.table("exercises")
            .select("id, body_part")
            .in_("id", exercise_ids)
            .execute()
        )
        exercise_meta = {e["id"]: e for e in (ex_meta_resp.data or [])}

    # --- Summary aggregates ---
    total_reps = sum(s.get("reps_completed", 0) or 0 for s in ex_sessions)
    all_form_scores = [s["form_score"] for s in ex_sessions if s.get("form_score") is not None]
    avg_form_score = _safe_avg(all_form_scores)

    active_dates: set[str] = set()
    for s in ex_sessions:
        if s.get("completed_at"):
            active_dates.add(_date_str(s["completed_at"]))
    for s in game_sessions:
        if s.get("completed_at"):
            active_dates.add(_date_str(s["completed_at"]))

    summary = ProgressSummary(
        total_exercise_sessions=len(ex_sessions),
        total_game_sessions=len(game_sessions),
        total_reps=total_reps,
        avg_form_score=avg_form_score,
        current_streak_days=_compute_streak(active_dates),
        total_active_days=len(active_dates),
    )

    # --- Exercise progress by day ---
    ex_by_day: dict[str, dict] = defaultdict(lambda: {"sessions": 0, "reps": [], "form_scores": []})
    for s in ex_sessions:
        if not s.get("completed_at"):
            continue
        day = _date_str(s["completed_at"])
        ex_by_day[day]["sessions"] += 1
        ex_by_day[day]["reps"].append(s.get("reps_completed", 0) or 0)
        if s.get("form_score") is not None:
            ex_by_day[day]["form_scores"].append(s["form_score"])

    exercise_progress = [
        ExerciseProgressDay(
            date=day,
            sessions=data["sessions"],
            total_reps=sum(data["reps"]),
            avg_form_score=_safe_avg(data["form_scores"]),
        )
        for day, data in sorted(ex_by_day.items())
    ]

    # --- Game progress by day + game_type ---
    game_by_day: dict[tuple, dict] = defaultdict(lambda: {"scores": [], "accuracies": []})
    for s in game_sessions:
        if not s.get("completed_at"):
            continue
        key = (_date_str(s["completed_at"]), s["game_type"])
        game_by_day[key]["scores"].append(s.get("score", 0) or 0)
        if s.get("accuracy") is not None:
            game_by_day[key]["accuracies"].append(s["accuracy"])

    game_progress = [
        GameProgressDay(
            date=key[0],
            game_type=key[1],
            best_score=max(data["scores"]),
            avg_accuracy=_safe_avg(data["accuracies"]),
        )
        for key, data in sorted(game_by_day.items())
    ]

    # --- Recent feedback (last 5) ---
    feedback_resp = (
        supabase.table("ai_feedback")
        .select("id, session_type, summary, recovery_score, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    recent_feedback = [
        RecentFeedbackItem(**row) for row in (feedback_resp.data or [])
    ]

    # --- Body part breakdown ---
    bp_map: dict[str, dict] = defaultdict(lambda: {"sessions": 0, "form_scores": []})
    for s in ex_sessions:
        bp = exercise_meta.get(s.get("exercise_id", ""), {}).get("body_part")
        if not bp:
            continue
        bp_map[bp]["sessions"] += 1
        if s.get("form_score") is not None:
            bp_map[bp]["form_scores"].append(s["form_score"])

    body_part_breakdown = [
        BodyPartBreakdownItem(
            body_part=bp,
            sessions=data["sessions"],
            avg_form_score=_safe_avg(data["form_scores"]),
        )
        for bp, data in sorted(bp_map.items())
    ]

    return ProgressResponse(
        user_id=user_id,
        summary=summary,
        exercise_progress=exercise_progress,
        game_progress=game_progress,
        recent_feedback=recent_feedback,
        body_part_breakdown=body_part_breakdown,
    )


def get_exercise_trend(
    user_id: str,
    days: int = 30,
    exercise_id: str | None = None,
) -> ExerciseTrendResponse:
    supabase = get_supabase()

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    query = (
        supabase.table("exercise_sessions")
        .select("avg_angle, form_score, reps_completed, completed_at")
        .eq("user_id", user_id)
        .gte("completed_at", cutoff)
        .order("completed_at", desc=False)
    )
    if exercise_id:
        query = query.eq("exercise_id", exercise_id)

    response = query.execute()
    rows = response.data or []

    # Aggregate by day
    by_day: dict[str, dict] = defaultdict(lambda: {"angles": [], "form_scores": [], "reps": []})
    for r in rows:
        if not r.get("completed_at"):
            continue
        day = _date_str(r["completed_at"])
        if r.get("avg_angle") is not None:
            by_day[day]["angles"].append(r["avg_angle"])
        if r.get("form_score") is not None:
            by_day[day]["form_scores"].append(r["form_score"])
        by_day[day]["reps"].append(r.get("reps_completed", 0) or 0)

    trend = [
        ExerciseTrendDay(
            date=day,
            avg_angle=_safe_avg(data["angles"]),
            avg_form_score=_safe_avg(data["form_scores"]),
            total_reps=sum(data["reps"]),
        )
        for day, data in sorted(by_day.items())
    ]

    return ExerciseTrendResponse(trend=trend)

def get_improvement(user_id: str) -> dict:
    from app.db.supabase_client import get_supabase
    from datetime import datetime, timezone, timedelta
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    current_start = (now - timedelta(days=7)).isoformat()
    previous_start = (now - timedelta(days=14)).isoformat()
    
    cur_resp = supabase.table("exercise_sessions").select("form_score").eq("user_id", user_id).gte("completed_at", current_start).lte("completed_at", now.isoformat()).execute()
    cur_scores = [r["form_score"] for r in (cur_resp.data or []) if r.get("form_score") is not None]
    
    prev_resp = supabase.table("exercise_sessions").select("form_score").eq("user_id", user_id).gte("completed_at", previous_start).lt("completed_at", current_start).execute()
    prev_scores = [r["form_score"] for r in (prev_resp.data or []) if r.get("form_score") is not None]
    
    cur_avg = sum(cur_scores) / len(cur_scores) if cur_scores else 0
    prev_avg = sum(prev_scores) / len(prev_scores) if prev_scores else 0
    
    if prev_avg == 0:
        improvement = 100 if cur_avg > 0 else 0
    else:
        improvement = round(((cur_avg - prev_avg) / prev_avg) * 100)
        
    return {"improvement": improvement}
