"""
AI feature service.
Fetches context from Supabase, computes metrics, and delegates to gemini_service.
"""
import logging
import json
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.services import gemini_service

logger = logging.getLogger(__name__)


# ─── Context helpers ──────────────────────────────────────────────────────────

def _get_patient(supabase, patient_id: str) -> dict:
    resp = supabase.table("patients").select("*").eq("id", patient_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return resp.data[0]


def _get_sessions(supabase, patient_id: str, limit: int = 10) -> list[dict]:
    """Fetch recent exercise sessions and resolve exercise names."""
    resp = (
        supabase.table("exercise_sessions")
        .select("id, exercise_id, reps_completed, form_score, duration_seconds, avg_angle, min_angle, max_angle, completed_at")
        .eq("user_id", patient_id)
        .order("completed_at", desc=True)
        .limit(limit)
        .execute()
    )
    sessions = resp.data or []

    ex_ids = list({s["exercise_id"] for s in sessions if s.get("exercise_id")})
    name_map: dict[str, str] = {}
    if ex_ids:
        ex_resp = (
            supabase.table("exercises")
            .select("id, name")
            .in_("id", ex_ids)
            .execute()
        )
        name_map = {e["id"]: e["name"] for e in (ex_resp.data or [])}

    for s in sessions:
        s["exercise_name"] = name_map.get(s.get("exercise_id", ""), "exercise")

    return sessions


def _get_sessions_since(supabase, patient_id: str, since_iso: str) -> list[dict]:
    """Fetch exercise sessions since a given ISO timestamp."""
    resp = (
        supabase.table("exercise_sessions")
        .select("id, exercise_id, reps_completed, form_score, duration_seconds, avg_angle, completed_at")
        .eq("user_id", patient_id)
        .gte("completed_at", since_iso)
        .order("completed_at", desc=True)
        .execute()
    )
    sessions = resp.data or []

    ex_ids = list({s["exercise_id"] for s in sessions if s.get("exercise_id")})
    name_map: dict[str, str] = {}
    if ex_ids:
        ex_resp = (
            supabase.table("exercises")
            .select("id, name")
            .in_("id", ex_ids)
            .execute()
        )
        name_map = {e["id"]: e["name"] for e in (ex_resp.data or [])}

    for s in sessions:
        s["exercise_name"] = name_map.get(s.get("exercise_id", ""), "exercise")

    return sessions


def _get_game_sessions(supabase, patient_id: str, limit: int = 5) -> list[dict]:
    resp = (
        supabase.table("game_sessions")
        .select("game_type, score, accuracy, avg_reaction_ms, completed_at")
        .eq("user_id", patient_id)
        .order("completed_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def _get_game_sessions_since(supabase, patient_id: str, since_iso: str) -> list[dict]:
    resp = (
        supabase.table("game_sessions")
        .select("game_type, score, accuracy, avg_reaction_ms, completed_at")
        .eq("user_id", patient_id)
        .gte("completed_at", since_iso)
        .order("completed_at", desc=True)
        .execute()
    )
    return resp.data or []


def _get_prescriptions(supabase, patient_id: str) -> list[dict]:
    resp = (
        supabase.table("prescriptions")
        .select("exercise_id, game_type, frequency, priority, status, notes")
        .eq("patient_id", patient_id)
        .eq("status", "active")
        .execute()
    )
    prescriptions = resp.data or []

    ex_ids = [p["exercise_id"] for p in prescriptions if p.get("exercise_id")]
    name_map: dict[str, str] = {}
    if ex_ids:
        ex_resp = (
            supabase.table("exercises")
            .select("id, name")
            .in_("id", ex_ids)
            .execute()
        )
        name_map = {e["id"]: e["name"] for e in (ex_resp.data or [])}

    for p in prescriptions:
        if p.get("exercise_id"):
            p["exercise_name"] = name_map.get(p["exercise_id"])

    return prescriptions


def _get_recent_feedback(supabase, patient_id: str, limit: int = 3) -> list[dict]:
    try:
        resp = (
            supabase.table("ai_feedback")
            .select("summary, recovery_score, session_type, created_at")
            .eq("user_id", patient_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception:
        return []


def _get_latest_report(supabase, patient_id: str) -> dict | None:
    try:
        resp = (
            supabase.table("reports")
            .select("id, report_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None
    except Exception:
        return None


def _get_latest_recommendation(supabase, patient_id: str) -> dict | None:
    try:
        resp = (
            supabase.table("ai_recommendations")
            .select("id, recommendation_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None
    except Exception:
        return None


# ─── Scoring helpers ──────────────────────────────────────────────────────────

def _compute_form_score_100(session: dict) -> float:
    """
    Compute a 0–100 form score from raw session data.
    Factors: form_score (raw 0–1), ROM (max_angle - min_angle), reps.
    """
    raw = session.get("form_score") or 0.0
    max_a = session.get("max_angle") or 0.0
    min_a = session.get("min_angle") or 0.0
    rom = max_a - min_a

    # ROM factor: 0 at 0°, 1.0 at ≥90°
    rom_factor = min(rom / 90.0, 1.0) if rom > 0 else 0.0

    # Reps factor: 0 at 0, 1.0 at ≥10 reps
    reps = session.get("reps_completed") or 0
    reps_factor = min(reps / 10.0, 1.0)

    # Weighted composite: form 60%, ROM 25%, reps 15%
    score = (raw * 0.60) + (rom_factor * 0.25) + (reps_factor * 0.15)
    return round(score * 100, 1)


def _compute_metrics(sessions_7d: list[dict], sessions_prev7d: list[dict],
                     game_sessions_7d: list[dict]) -> dict:
    """
    Compute all metrics for the weekly report.
    Returns: improvement_pct, consistency_score, avg_form_score,
             cognitive_avg_accuracy, composite_score
    """
    # Physical metrics
    form_scores_7d = [s.get("form_score") or 0.0 for s in sessions_7d]
    avg_form_7d = sum(form_scores_7d) / len(form_scores_7d) if form_scores_7d else 0.0

    form_scores_prev = [s.get("form_score") or 0.0 for s in sessions_prev7d]
    avg_form_prev = sum(form_scores_prev) / len(form_scores_prev) if form_scores_prev else None

    if avg_form_prev is not None and avg_form_prev > 0:
        improvement_pct = ((avg_form_7d - avg_form_prev) / avg_form_prev) * 100
    else:
        improvement_pct = 0.0

    # Consistency: unique active days out of 7
    active_days = set()
    for s in sessions_7d:
        ts = s.get("completed_at", "")
        if ts:
            active_days.add(str(ts)[:10])
    for g in game_sessions_7d:
        ts = g.get("completed_at", "")
        if ts:
            active_days.add(str(ts)[:10])
    consistency_score = len(active_days) / 7.0

    # Cognitive metrics
    cog_accuracies = [g.get("accuracy") or 0.0 for g in game_sessions_7d]
    cog_avg_accuracy = sum(cog_accuracies) / len(cog_accuracies) if cog_accuracies else 0.0

    # Composite: physical (avg_form) + cognitive (avg_accuracy) / 2
    composite_score = (avg_form_7d + cog_avg_accuracy) / 2.0

    return {
        "improvement_pct": round(improvement_pct, 2),
        "consistency_score": round(consistency_score, 3),
        "avg_form_score": round(avg_form_7d, 3),
        "cognitive_avg_accuracy": round(cog_avg_accuracy, 3),
        "composite_score": round(composite_score, 3),
    }


# ─── Feature 1: Patient chat ──────────────────────────────────────────────────

def patient_chat(patient_id: str, message: str) -> str:
    supabase = get_supabase()
    latest_recommendation = _get_latest_recommendation(supabase, patient_id)
    context = {
        "patient":              _get_patient(supabase, patient_id),
        "sessions":             _get_sessions(supabase, patient_id, limit=5),
        "game_sessions":        _get_game_sessions(supabase, patient_id, limit=3),
        "prescriptions":        _get_prescriptions(supabase, patient_id),
        "recent_feedback":      _get_recent_feedback(supabase, patient_id, limit=3),
        "latest_recommendation": latest_recommendation,
    }
    return gemini_service.generate_patient_chat(message, context)


# ─── Feature 2: Generate report ───────────────────────────────────────────────

def generate_report(patient_id: str) -> dict:
    supabase = get_supabase()
    context = {
        "patient":       _get_patient(supabase, patient_id),
        "sessions":      _get_sessions(supabase, patient_id, limit=10),
        "game_sessions": _get_game_sessions(supabase, patient_id, limit=5),
        "prescriptions": _get_prescriptions(supabase, patient_id),
    }

    report_json = gemini_service.generate_report(context)

    try:
        insert_resp = (
            supabase.table("reports")
            .insert({"patient_id": patient_id, "report_json": report_json})
            .execute()
        )
        row = insert_resp.data[0] if insert_resp.data else {}
    except Exception as exc:
        logger.warning("Failed to persist report for %s: %s", patient_id, exc)
        row = {}

    return {
        "id":         row.get("id"),
        "patient_id": patient_id,
        "report":     report_json,
        "created_at": row.get("created_at"),
    }


def list_reports(patient_id: str) -> list[dict]:
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("reports")
            .select("id, patient_id, report_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        data = resp.data or []
        for r in data:
            if "report_json" in r:
                r["report"] = r.pop("report_json")
        return data
    except Exception as exc:
        logger.warning("list_reports failed: %s", exc)
        return []


# ─── Feature 3: Doctor chat ───────────────────────────────────────────────────

def doctor_chat(doctor_id: str, patient_id: str, message: str) -> str:
    supabase = get_supabase()
    latest_recommendation = _get_latest_recommendation(supabase, patient_id)
    context = {
        "patient":               _get_patient(supabase, patient_id),
        "sessions":              _get_sessions(supabase, patient_id, limit=20),
        "game_sessions":         _get_game_sessions(supabase, patient_id, limit=5),
        "prescriptions":         _get_prescriptions(supabase, patient_id),
        "latest_report":         _get_latest_report(supabase, patient_id),
        "latest_recommendation": latest_recommendation,
    }
    return gemini_service.generate_doctor_chat(message, context)


# ─── Feature: Automated Weekly Report ────────────────────────────────────────

def generate_weekly_report(patient_id: str) -> dict:
    """
    Generate a weekly report using 7-day windowed data + computed metrics.
    Persists to reports table and returns full report.
    """
    supabase = get_supabase()

    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    fourteen_days_ago = (now - timedelta(days=14)).isoformat()

    patient = _get_patient(supabase, patient_id)
    sessions_7d = _get_sessions_since(supabase, patient_id, seven_days_ago)
    sessions_prev7d = _get_sessions_since(supabase, patient_id, fourteen_days_ago)
    # prev7d includes last 14 days; remove last 7 to get 7–14 days ago
    sessions_prev7d_only = [
        s for s in sessions_prev7d
        if str(s.get("completed_at", "")) < seven_days_ago
    ]
    game_sessions_7d = _get_game_sessions_since(supabase, patient_id, seven_days_ago)
    all_sessions = _get_sessions(supabase, patient_id, limit=30)

    computed = _compute_metrics(sessions_7d, sessions_prev7d_only, game_sessions_7d)

    context = {
        "patient":        patient,
        "sessions_7d":    sessions_7d,
        "game_sessions_7d": game_sessions_7d,
        "all_sessions":   all_sessions,
        "computed":       computed,
    }

    report_json = gemini_service.generate_weekly_report(context)
    # Ensure computed metrics are canonical (not overridden by LLM)
    report_json["improvement"] = computed["improvement_pct"]
    report_json["consistency"] = computed["consistency_score"]
    report_json["composite_score"] = computed["composite_score"]

    try:
        insert_resp = (
            supabase.table("reports")
            .insert({"patient_id": patient_id, "report_json": report_json})
            .execute()
        )
        row = insert_resp.data[0] if insert_resp.data else {}
    except Exception as exc:
        logger.warning("Failed to persist weekly report for %s: %s", patient_id, exc)
        row = {}

    return {
        "id":         row.get("id"),
        "patient_id": patient_id,
        "report":     report_json,
        "created_at": row.get("created_at"),
    }


# ─── Feature: AI Recommendation Engine ───────────────────────────────────────

def generate_recommendations(patient_id: str) -> dict:
    """
    Generate AI exercise/game plan recommendations.
    Persists to ai_recommendations table. Returns recommendation dict.
    """
    supabase = get_supabase()

    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    fourteen_days_ago = (now - timedelta(days=14)).isoformat()

    patient = _get_patient(supabase, patient_id)
    sessions_7d = _get_sessions_since(supabase, patient_id, seven_days_ago)
    sessions_prev7d_all = _get_sessions_since(supabase, patient_id, fourteen_days_ago)
    sessions_prev7d = [
        s for s in sessions_prev7d_all
        if str(s.get("completed_at", "")) < seven_days_ago
    ]
    game_sessions_7d = _get_game_sessions_since(supabase, patient_id, seven_days_ago)
    all_sessions = _get_sessions(supabase, patient_id, limit=20)
    all_games = _get_game_sessions(supabase, patient_id, limit=5)
    prescriptions = _get_prescriptions(supabase, patient_id)
    latest_report = _get_latest_report(supabase, patient_id)

    computed = _compute_metrics(sessions_7d, sessions_prev7d, game_sessions_7d)

    context = {
        "patient":       patient,
        "sessions":      all_sessions,
        "game_sessions": all_games,
        "prescriptions": prescriptions,
        "latest_report": latest_report,
        "computed":      computed,
    }

    rec_json = gemini_service.generate_recommendations(context)
    rec_json["composite_score"] = computed["composite_score"]

    try:
        insert_resp = (
            supabase.table("ai_recommendations")
            .insert({
                "patient_id": patient_id,
                "recommendation_json": rec_json,
            })
            .execute()
        )
        row = insert_resp.data[0] if insert_resp.data else {}
    except Exception as exc:
        logger.warning("Failed to persist recommendation for %s: %s", patient_id, exc)
        row = {}

    return {
        "id":         row.get("id"),
        "patient_id": patient_id,
        "recommendation": rec_json,
        "created_at": row.get("created_at"),
    }


def list_recommendations(patient_id: str) -> list[dict]:
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("ai_recommendations")
            .select("id, patient_id, recommendation_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        data = resp.data or []
        for r in data:
            if "recommendation_json" in r:
                r["recommendation"] = r.pop("recommendation_json")
        return data
    except Exception as exc:
        logger.warning("list_recommendations failed: %s", exc)
        return []


# ─── Auto-trigger: called from session_service after session save ─────────────

# ─── Feature: Recovery Timeline Prediction ───────────────────────────────────

_TARGET_ROM = 120.0  # degrees — standard full shoulder/knee ROM target


def predict_recovery(patient_id: str) -> dict:
    """
    Pure-math recovery prediction.
    Uses first and latest session ROM + elapsed days to project days to target ROM.
    No ML, no Gemini call.
    """
    supabase = get_supabase()

    # Fetch all sessions ordered oldest→newest for this patient
    resp = (
        supabase.table("exercise_sessions")
        .select("max_angle, min_angle, avg_angle, completed_at")
        .eq("user_id", patient_id)
        .order("completed_at", desc=False)
        .execute()
    )
    sessions = resp.data or []

    def _rom(s: dict) -> float | None:
        mx = s.get("max_angle")
        mn = s.get("min_angle")
        if mx is not None and mn is not None:
            return float(mx) - float(mn)
        if s.get("avg_angle") is not None:
            return float(s["avg_angle"])
        return None

    # Filter to sessions that have usable ROM data
    rom_sessions = [(s, _rom(s)) for s in sessions if _rom(s) is not None]

    if len(rom_sessions) < 2:
        return {
            "estimated_days": None,
            "confidence": "low",
            "initial_rom": rom_sessions[0][1] if rom_sessions else None,
            "latest_rom": None,
            "target_rom": _TARGET_ROM,
            "progress_rate_per_day": None,
        }

    first_session, initial_rom = rom_sessions[0]
    last_session, latest_rom = rom_sessions[-1]

    # Elapsed days between first and last session
    try:
        fmt = "%Y-%m-%dT%H:%M:%S"
        t0 = datetime.fromisoformat(str(first_session["completed_at"]).replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(str(last_session["completed_at"]).replace("Z", "+00:00"))
        elapsed_days = max((t1 - t0).total_seconds() / 86400.0, 1.0)
    except Exception:
        elapsed_days = max(len(rom_sessions) - 1, 1)

    progress_rate = (latest_rom - initial_rom) / elapsed_days  # degrees / day

    # Already at or past target
    if latest_rom >= _TARGET_ROM:
        return {
            "estimated_days": 0,
            "confidence": "high",
            "initial_rom": round(initial_rom, 1),
            "latest_rom": round(latest_rom, 1),
            "target_rom": _TARGET_ROM,
            "progress_rate_per_day": round(progress_rate, 3),
        }

    # Not improving — can't predict
    if progress_rate <= 0:
        return {
            "estimated_days": None,
            "confidence": "low",
            "initial_rom": round(initial_rom, 1),
            "latest_rom": round(latest_rom, 1),
            "target_rom": _TARGET_ROM,
            "progress_rate_per_day": round(progress_rate, 3),
        }

    days_left = ((_TARGET_ROM - latest_rom) / progress_rate)
    estimated_days = max(1, round(days_left))

    # Confidence based on number of data points and elapsed time
    n = len(rom_sessions)
    if n >= 10 and elapsed_days >= 7:
        confidence = "high"
    elif n >= 4 and elapsed_days >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "estimated_days": estimated_days,
        "confidence": confidence,
        "initial_rom": round(initial_rom, 1),
        "latest_rom": round(latest_rom, 1),
        "target_rom": _TARGET_ROM,
        "progress_rate_per_day": round(progress_rate, 3),
    }


def auto_trigger_weekly_report(patient_id: str) -> None:
    """
    Silently generates and persists a weekly report after a session completes.
    Errors are logged but never raised — must not break session creation.
    """
    try:
        generate_weekly_report(patient_id)
        logger.info("Auto-generated weekly report for patient %s", patient_id)
    except Exception as exc:
        logger.warning("auto_trigger_weekly_report failed for %s: %s", patient_id, exc)

def generate_adaptive_plan(patient_id: str) -> dict:
    supabase = get_supabase()
    sessions = _get_sessions(supabase, patient_id, limit=3)
    
    reps = 10
    sets = 3
    intensity = "medium"
    reason = "Standard plan"
    
    if not sessions:
        return {
            "reps": reps,
            "sets": sets,
            "intensity": intensity,
            "reason": "Initial plan established."
        }
    
    avg_score = sum(_compute_form_score_100(s) for s in sessions) / len(sessions)
    
    # Try to fetch pain
    pain = 0
    try:
        fb_resp = supabase.table("ai_feedback").select("pain_level").eq("user_id", patient_id).order("created_at", desc=True).limit(3).execute()
        if fb_resp and hasattr(fb_resp, "data"):
            pains = [f.get("pain_level") for f in fb_resp.data if f.get("pain_level") is not None]
            if pains:
                pain = sum(pains) / len(pains)
    except Exception:
        pass
        
    if avg_score > 85:
        reps += 2
        reason = "AI adjusted your plan based on performance: Increased reps (score > 85)"
    elif avg_score < 60:
        reps = max(1, reps - 2)
        reason = "AI adjusted your plan based on performance: Decreased reps (score < 60)"
    else:
        reason = "AI adjusted your plan based on performance: Maintained current reps"
        
    if pain > 7:
        intensity = "low"
        reason += " + Reduced intensity due to high pain"
        
    return {
        "reps": reps,
        "sets": sets,
        "intensity": intensity,
        "reason": reason
    }

def calculate_risk(session_data: dict) -> dict:
    risk_score = 0
    reasons = []

    # ROM calculation
    min_a = session_data.get("min_angle") or 0.0
    max_a = session_data.get("max_angle") or 0.0
    rom = max_a - min_a
    if rom < 60:
        risk_score += 2
        reasons.append("Low ROM")

    # Asymmetry calculation
    asym = 0
    angle_hist = session_data.get("angle_history")
    if angle_hist and isinstance(angle_hist, list):
        try:
            peaks = [float(h.get("peak_angle", 0)) for h in angle_hist if isinstance(h, dict) and "peak_angle" in h]
            if len(peaks) > 1:
                asym = max(peaks) - min(peaks)
        except Exception:
            pass
    if asym > 15:
        risk_score += 2
        reasons.append("High asymmetry")

    # Compensation detected
    form_score = session_data.get("form_score")
    if form_score is not None:
        # Assuming form_score is 0-1
        if form_score < 0.7:
            risk_score += 3
            reasons.append("Compensation detected")
    else:
        # fallback if missing, assume compensation
        risk_score += 3
        reasons.append("Compensation detected")

    # Velocity unstable
    duration = session_data.get("duration_seconds") or 0
    reps = session_data.get("reps_completed") or 0
    if reps > 0 and duration > 0:
        rep_time = duration / reps
        if rep_time < 1.5 or rep_time > 6.0:
            risk_score += 2
            reasons.append("Velocity unstable")

    if risk_score <= 2:
        level = "low"
    elif risk_score <= 5:
        level = "medium"
    else:
        level = "high"

    return {
        "risk_level": level,
        "reasons": reasons
    }

def get_risk_assessment(patient_id: str) -> dict:
    supabase = get_supabase()
    # Fetch latest session with all columns to get angle_history
    resp = supabase.table("exercise_sessions").select("*").eq("user_id", patient_id).order("completed_at", desc=True).limit(1).execute()
    sessions = resp.data or []
    if not sessions:
        return {"risk_level": "low", "reasons": []}
        
    # Maybe add some fake data for the sake of demo if needed
    ans = calculate_risk(sessions[0])
    
    if ans["risk_level"] == "high":
        try:
            supabase.table("alerts").insert({
                "patient_id": patient_id,
                "message": "High injury risk detected. Immediate review required."
            }).execute()
        except:
            pass

    return ans


def calculate_recovery_score(patient_id: str) -> dict:
    supabase = get_supabase()

    # Physical (0.5)
    sessions = _get_sessions(supabase, patient_id, limit=7)
    physical_score = 0.0
    if sessions:
        physical_score = sum(_compute_form_score_100(s) for s in sessions) / len(sessions)
    else:
        physical_score = 50.0  # default baseline

    # Cognitive (0.3)
    games = _get_game_sessions(supabase, patient_id, limit=7)
    cognitive_score = 0.0
    if games:
        score_list = []
        for g in games:
            if g.get("accuracy"):
                score_list.append(float(g["accuracy"]))
            elif g.get("score"):
                # memory usually out of small number like 5 or 10. Let's scale up.
                score_list.append(min(float(g["score"]) * 10.0, 100.0))
            elif g.get("avg_reaction_ms"):
                # convert ms to score: 300ms is 100, 2000ms is 0 -> mapped
                ms = float(g["avg_reaction_ms"])
                val = 100.0 - ((ms - 300) / 17.0)
                score_list.append(max(0.0, min(100.0, val)))
            else:
                score_list.append(50.0)
        cognitive_score = sum(score_list) / len(score_list)
    else:
        cognitive_score = 50.0  # default baseline

    # Consistency (0.2)
    # expected 7 sessions in a week
    expected = 7
    actual = min(len(sessions), expected)
    consistency = actual / expected
    
    final_score = (0.5 * physical_score) + (0.3 * cognitive_score) + (0.2 * consistency * 100)

    # Ensure it's between 0 and 100
    final_score = max(0, min(100, int(final_score)))

    return {"recovery_score": final_score}

