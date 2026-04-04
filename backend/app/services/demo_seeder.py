"""
Demo data seeder — Feature 7.
Seeds 7 days of realistic exercise + game sessions for a patient,
then auto-generates a weekly report and recommendation.
Safe to call multiple times (idempotent via date check).
"""
import logging
import random
from datetime import datetime, timezone, timedelta
from app.db.supabase_client import get_supabase
from app.services import ai_service

logger = logging.getLogger(__name__)

# Exercises from the seed data (IDs from schema.sql)
_EXERCISE_IDS = [
    ("a1000001-0001-4000-8000-000000000001", "shoulder"),  # Shoulder Flexion
    ("a1000001-0001-4000-8000-000000000002", "shoulder"),  # Shoulder Abduction
    ("a1000001-0001-4000-8000-000000000003", "elbow"),     # Elbow Flexion
    ("a1000001-0001-4000-8000-000000000004", "knee"),      # Knee Extension
    ("a1000001-0001-4000-8000-000000000008", "hip"),       # Straight Leg Raise
]

_GAME_TYPES = ["memory", "reaction", "pattern"]


def _random_session(patient_id: str, exercise_id: str, day_offset: int, session_num: int) -> dict:
    """Generate a realistic-looking exercise session for a given day offset (0=today, 6=6 days ago)."""
    base_day = datetime.now(timezone.utc) - timedelta(days=day_offset)
    hour = 9 + session_num * 2  # spread sessions through the day
    started = base_day.replace(hour=hour, minute=random.randint(0, 30), second=0, microsecond=0)
    duration = random.randint(120, 420)
    completed = started + timedelta(seconds=duration)

    # Slight improvement trend: earlier days have lower form scores
    base_form = 0.55 + (6 - day_offset) * 0.03  # 0.55 → 0.73 over 7 days
    form_score = round(min(0.95, max(0.30, base_form + random.uniform(-0.08, 0.08))), 3)

    reps = random.randint(6, 15)
    avg_angle = round(random.uniform(60, 130), 1)
    min_angle = round(avg_angle - random.uniform(20, 40), 1)
    max_angle = round(avg_angle + random.uniform(20, 40), 1)

    return {
        "user_id":         patient_id,
        "exercise_id":     exercise_id,
        "reps_completed":  reps,
        "avg_angle":       avg_angle,
        "min_angle":       min_angle,
        "max_angle":       max_angle,
        "form_score":      form_score,
        "duration_seconds": duration,
        "angle_history":   None,
        "started_at":      started.isoformat(),
        "completed_at":    completed.isoformat(),
    }


def _random_game_session(patient_id: str, game_type: str, day_offset: int) -> dict:
    """Generate a realistic game session."""
    base_day = datetime.now(timezone.utc) - timedelta(days=day_offset)
    hour = random.randint(14, 20)
    played_at = base_day.replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)

    # Slight improvement trend
    base_accuracy = 0.60 + (6 - day_offset) * 0.025
    accuracy = round(min(0.98, max(0.30, base_accuracy + random.uniform(-0.10, 0.10))), 3)
    score = random.randint(200, 900)
    avg_reaction_ms = round(random.uniform(250, 700), 1)

    return {
        "user_id":       patient_id,
        "game_type":     game_type,
        "score":         score,
        "accuracy":      accuracy,
        "avg_reaction_ms": avg_reaction_ms,
        "level_reached": random.randint(1, 5),
        "duration_seconds": random.randint(60, 300),
        "game_metadata": {"demo": True},
        "completed_at":  played_at.isoformat(),
    }


def seed(patient_id: str) -> dict:
    """
    Seed 7 days of demo data and generate AI report + recommendation.
    Returns summary of what was seeded.
    """
    supabase = get_supabase()

    # Check if demo data already exists for this patient in the last 7 days
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    existing = (
        supabase.table("exercise_sessions")
        .select("id", count="exact")
        .eq("user_id", patient_id)
        .gte("completed_at", seven_days_ago)
        .execute()
    )
    existing_count = existing.count or 0

    exercise_sessions_inserted = 0
    game_sessions_inserted = 0

    if existing_count < 3:
        # Seed 2 exercise sessions per day for 7 days
        exercise_rows = []
        for day_offset in range(7):
            num_sessions = random.choice([1, 2])
            exercises_today = random.sample(_EXERCISE_IDS, min(num_sessions, len(_EXERCISE_IDS)))
            for i, (ex_id, _) in enumerate(exercises_today):
                exercise_rows.append(_random_session(patient_id, ex_id, day_offset, i))

        if exercise_rows:
            try:
                resp = supabase.table("exercise_sessions").insert(exercise_rows).execute()
                exercise_sessions_inserted = len(resp.data or [])
            except Exception as exc:
                logger.warning("Demo exercise insert failed: %s", exc)

        # Seed 1 game session per day for 7 days
        game_rows = []
        for day_offset in range(7):
            game_type = random.choice(_GAME_TYPES)
            game_rows.append(_random_game_session(patient_id, game_type, day_offset))

        if game_rows:
            try:
                resp = supabase.table("game_sessions").insert(game_rows).execute()
                game_sessions_inserted = len(resp.data or [])
            except Exception as exc:
                logger.warning("Demo game insert failed: %s", exc)

    # Generate weekly report
    report_result = None
    try:
        report_result = ai_service.generate_weekly_report(patient_id)
    except Exception as exc:
        logger.warning("Demo report generation failed: %s", exc)

    # Generate recommendation
    rec_result = None
    try:
        rec_result = ai_service.generate_recommendations(patient_id)
    except Exception as exc:
        logger.warning("Demo recommendation generation failed: %s", exc)

    return {
        "status": "ok",
        "exercise_sessions_seeded": exercise_sessions_inserted,
        "game_sessions_seeded": game_sessions_inserted,
        "skipped_seeding": existing_count >= 3,
        "report_generated": report_result is not None,
        "recommendation_generated": rec_result is not None,
    }
