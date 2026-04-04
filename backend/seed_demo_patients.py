"""
Full demo data seeder.

Creates 6 varied patient profiles under the demo doctor, then seeds:
  - 14 days of exercise sessions (with realistic form trends per profile)
  - 14 days of game sessions (memory, reaction, stroop, trail_making)
  - Prescriptions
  - Alerts for critical patients
  - AI weekly report + recommendation per patient

Run from the backend/ directory:
    python seed_demo_patients.py

Safe to re-run — skips patients that already have recent data.
"""

import os, sys, random, uuid, logging
from datetime import datetime, timezone, timedelta

# ── path setup so app.* imports work ─────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("SUPABASE_URL", "https://dfggvieijnrghthrxfdq.supabase.co/")
os.environ.setdefault("SUPABASE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZ2d2aWVpam5yZ2h0aHJ4ZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI3OTU4MywiZXhwIjoyMDkwODU1NTgzfQ."
    "Kt7LzN5ye6v_kpnjWBzuyUd_dqVqAh3vHNbKC9EHSxw"
)

from app.db.supabase_client import get_supabase

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

EXERCISE_IDS = [
    "a1000001-0001-4000-8000-000000000001",  # Shoulder Flexion
    "a1000001-0001-4000-8000-000000000002",  # Knee Extension
    "a1000001-0001-4000-8000-000000000003",  # Elbow Flexion
    "a1000001-0001-4000-8000-000000000004",  # Hip Abduction
    "a1000001-0001-4000-8000-000000000005",  # Shoulder Abduction
    "a1000001-0001-4000-8000-000000000006",  # Seated Knee Flexion
    "a1000001-0001-4000-8000-000000000007",  # Overhead Reach
]

EXERCISE_NAMES = {
    "a1000001-0001-4000-8000-000000000001": "Shoulder Flexion",
    "a1000001-0001-4000-8000-000000000002": "Knee Extension",
    "a1000001-0001-4000-8000-000000000003": "Elbow Flexion",
    "a1000001-0001-4000-8000-000000000004": "Hip Abduction",
    "a1000001-0001-4000-8000-000000000005": "Shoulder Abduction",
    "a1000001-0001-4000-8000-000000000006": "Seated Knee Flexion",
    "a1000001-0001-4000-8000-000000000007": "Overhead Reach",
}

GAME_TYPES = ["memory", "reaction", "stroop", "trail_making"]

NOW = datetime.now(timezone.utc)

# ── Patient profiles ──────────────────────────────────────────────────────────
# Each profile drives form_score range, consistency, game accuracy, trend direction.

PROFILES = [
    {
        "name":         "Aarav Sharma",
        "email":        "aarav@gmail.com",          # existing demo patient — skip create
        "create":       False,
        "label":        "Recovering Well",
        "status":       "in_treatment",
        "injury":       "rotator_cuff_tear",
        "severity":     "moderate",
        "form_base":    0.72,
        "form_trend":   +0.015,   # improving each day
        "consistency":  1.0,      # exercises every day
        "game_base":    0.75,
        "game_trend":   +0.01,
        "sessions_per_day": 2,
        "risk":         "low",
        "condition_notes": "Post-op rotator cuff repair. Good compliance. Steady ROM improvement.",
    },
    {
        "name":         "Priya Patel",
        "email":        "priya.patel@demo.local",
        "create":       True,
        "label":        "Critical — High Risk",
        "status":       "in_treatment",
        "injury":       "acl_reconstruction",
        "severity":     "severe",
        "form_base":    0.32,
        "form_trend":   -0.005,   # slightly deteriorating
        "consistency":  0.5,      # misses every other day
        "game_base":    0.42,
        "game_trend":   -0.01,
        "sessions_per_day": 1,
        "risk":         "high",
        "condition_notes": "ACL reconstruction 3 weeks post-op. Poor form scores, high pain levels. Requires immediate review.",
    },
    {
        "name":         "Rohan Mehta",
        "email":        "rohan.mehta@demo.local",
        "create":       True,
        "label":        "Healthy — Near Discharge",
        "status":       "in_treatment",
        "injury":       "shoulder_impingement",
        "severity":     "mild",
        "form_base":    0.88,
        "form_trend":   +0.005,
        "consistency":  1.0,
        "game_base":    0.91,
        "game_trend":   +0.003,
        "sessions_per_day": 2,
        "risk":         "low",
        "condition_notes": "Shoulder impingement, near full ROM. Almost ready for discharge.",
    },
    {
        "name":         "Kavya Nair",
        "email":        "kavya.nair@demo.local",
        "create":       True,
        "label":        "Moderate — Stable",
        "status":       "in_treatment",
        "injury":       "knee_osteoarthritis",
        "severity":     "moderate",
        "form_base":    0.61,
        "form_trend":   +0.008,
        "consistency":  0.85,
        "game_base":    0.65,
        "game_trend":   +0.005,
        "sessions_per_day": 2,
        "risk":         "medium",
        "condition_notes": "Knee OA management. Consistent attendance. Moderate but steady progress.",
    },
    {
        "name":         "Arjun Singh",
        "email":        "arjun.singh@demo.local",
        "create":       True,
        "label":        "New Patient — Just Started",
        "status":       "evaluated",
        "injury":       "lower_back_strain",
        "severity":     "mild",
        "form_base":    0.55,
        "form_trend":   +0.012,
        "consistency":  1.0,
        "game_base":    0.58,
        "game_trend":   +0.015,
        "sessions_per_day": 1,
        "risk":         "low",
        "condition_notes": "New patient. Lower back strain, started rehab 5 days ago. Early signs of improvement.",
    },
    {
        "name":         "Meera Iyer",
        "email":        "meera.iyer@demo.local",
        "create":       True,
        "label":        "Elderly — Slow Progress",
        "status":       "in_treatment",
        "injury":       "hip_replacement",
        "severity":     "moderate",
        "form_base":    0.51,
        "form_trend":   +0.004,
        "consistency":  0.7,
        "game_base":    0.48,
        "game_trend":   +0.002,
        "sessions_per_day": 1,
        "risk":         "medium",
        "condition_notes": "Post hip replacement, 68 years old. Slow but consistent progress. Cognitive scores lower than average.",
    },
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def clamp(v, lo, hi): return max(lo, min(hi, v))

def days_ago(n, hour=10, minute=0):
    return (NOW - timedelta(days=n)).replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )

def make_exercise_session(patient_id, exercise_id, day_offset, session_num, profile):
    base = profile["form_base"] + profile["form_trend"] * (14 - day_offset)
    form = clamp(round(base + random.uniform(-0.07, 0.07), 3), 0.20, 0.98)
    hour = 9 + session_num * 3
    started = days_ago(day_offset, hour, random.randint(0, 30))
    duration = random.randint(180, 480)
    completed = started + timedelta(seconds=duration)
    avg_angle = round(random.uniform(55, 135), 1)
    return {
        "user_id":          patient_id,
        "exercise_id":      exercise_id,
        "reps_completed":   random.randint(6, 18),
        "avg_angle":        avg_angle,
        "min_angle":        round(avg_angle - random.uniform(15, 35), 1),
        "max_angle":        round(avg_angle + random.uniform(15, 35), 1),
        "form_score":       form,
        "duration_seconds": duration,
        "angle_history":    None,
        "started_at":       started.isoformat(),
        "completed_at":     completed.isoformat(),
    }

def make_game_session(patient_id, game_type, day_offset, profile):
    base = profile["game_base"] + profile["game_trend"] * (14 - day_offset)
    accuracy = clamp(round(base + random.uniform(-0.08, 0.08), 3), 0.20, 0.99)
    score = round(accuracy * 100)
    hour = random.randint(14, 20)
    played_at = days_ago(day_offset, hour, random.randint(0, 59))
    meta = {}
    if game_type == "stroop":
        meta = {"correct": round(accuracy * 10), "wrong": round((1-accuracy)*10), "avg_reaction_ms": random.randint(300, 800)}
    elif game_type == "trail_making":
        mode = random.choice(["A", "B"])
        meta = {"mode": mode, "completion_time_ms": random.randint(15000, 90000), "total_errors": random.randint(0, 8)}
    elif game_type == "memory":
        meta = {"moves": random.randint(12, 30)}
    return {
        "user_id":          patient_id,
        "game_type":        game_type,
        "score":            score,
        "accuracy":         accuracy,
        "avg_reaction_ms":  round(random.uniform(280, 750), 1),
        "duration_seconds": random.randint(60, 300),
        "game_metadata":    meta,
        "completed_at":     played_at.isoformat(),
    }

def make_prescription(patient_id, doctor_id, exercise_id, priority):
    return {
        "patient_id":  patient_id,
        "doctor_id":   doctor_id,
        "exercise_id": exercise_id,
        "target_reps": random.choice([10, 12, 15]),
        "frequency":   random.choice(["daily", "twice daily", "3x per week"]),
        "priority":    priority,
        "status":      "active",
    }

# ── Main seeder ───────────────────────────────────────────────────────────────

def get_or_create_patient(sb, profile, doctor_id):
    """Return patient id — create if needed."""
    # Try to find by email
    res = sb.table("patients").select("id").eq("email", profile["email"]).execute()
    if res.data:
        pid = res.data[0]["id"]
        log.info("  Found existing patient %s → %s", profile["name"], pid)
        return pid

    if not profile["create"]:
        log.warning("  Patient %s not found and create=False — skipping", profile["name"])
        return None

    row = {
        "name":            profile["name"],
        "email":           profile["email"],
        "doctor_id":       doctor_id,
        "status":          profile["status"],
        "injury_type":     profile["injury"],
        "severity":        profile["severity"],
        "condition_notes": profile["condition_notes"],
    }
    res = sb.table("patients").insert(row).execute()
    if not res.data:
        log.error("  Failed to create patient %s", profile["name"])
        return None
    pid = res.data[0]["id"]
    log.info("  Created patient %s → %s", profile["name"], pid)
    return pid


def has_recent_data(sb, patient_id, days=14):
    cutoff = (NOW - timedelta(days=days)).isoformat()
    res = sb.table("exercise_sessions").select("id", count="exact") \
            .eq("user_id", patient_id).gte("completed_at", cutoff).execute()
    return (res.count or 0) >= 5


def seed_patient(sb, profile, doctor_id):
    log.info("\n── %s (%s) ──", profile["name"], profile["label"])
    pid = get_or_create_patient(sb, profile, doctor_id)
    if not pid:
        return

    if has_recent_data(sb, pid):
        log.info("  Already has recent data — skipping session insert")
    else:
        # Exercise sessions — 14 days, skip days based on consistency
        ex_rows = []
        for day in range(14):
            if random.random() > profile["consistency"]:
                continue  # missed this day
            n_sessions = profile["sessions_per_day"]
            exs = random.sample(EXERCISE_IDS, min(n_sessions, len(EXERCISE_IDS)))
            for i, ex_id in enumerate(exs):
                ex_rows.append(make_exercise_session(pid, ex_id, day, i, profile))

        if ex_rows:
            sb.table("exercise_sessions").insert(ex_rows).execute()
            log.info("  Inserted %d exercise sessions", len(ex_rows))

        # Game sessions — 14 days, 1-2 per day
        game_rows = []
        for day in range(14):
            if random.random() > profile["consistency"]:
                continue
            n_games = random.randint(1, 2)
            for gt in random.sample(GAME_TYPES, n_games):
                game_rows.append(make_game_session(pid, gt, day, profile))

        if game_rows:
            sb.table("game_sessions").insert(game_rows).execute()
            log.info("  Inserted %d game sessions", len(game_rows))

    # Prescriptions — always ensure at least 2 active
    existing_rx = sb.table("prescriptions").select("id", count="exact") \
                    .eq("patient_id", pid).eq("status", "active").execute()
    if (existing_rx.count or 0) == 0:
        chosen = random.sample(EXERCISE_IDS, 2)
        priorities = ["high", "medium"]
        rx_rows = [make_prescription(pid, doctor_id, ex, priorities[i]) for i, ex in enumerate(chosen)]
        sb.table("prescriptions").insert(rx_rows).execute()
        log.info("  Inserted %d prescriptions", len(rx_rows))
    else:
        log.info("  Prescriptions already exist — skipping")

    # Alert for high-risk patients
    if profile["risk"] == "high":
        existing_alerts = sb.table("alerts").select("id", count="exact") \
                            .eq("patient_id", pid).execute()
        if (existing_alerts.count or 0) == 0:
            sb.table("alerts").insert({
                "patient_id": pid,
                "message": "High injury risk detected. Immediate review required.",
            }).execute()
            log.info("  Created high-risk alert")

    # AI report + recommendation (best-effort)
    try:
        from app.services import ai_service
        ai_service.generate_weekly_report(pid)
        log.info("  Generated weekly report")
    except Exception as e:
        log.warning("  Weekly report failed: %s", e)

    try:
        from app.services import ai_service
        ai_service.generate_recommendations(pid)
        log.info("  Generated recommendation")
    except Exception as e:
        log.warning("  Recommendation failed: %s", e)

    log.info("  ✓ Done — %s", profile["name"])


def main():
    sb = get_supabase()

    # Find demo doctor
    res = sb.table("staff").select("id, name").eq("email", "drsmoke@test.local").execute()
    if not res.data:
        # Try any doctor
        res = sb.table("staff").select("id, name").eq("role", "doctor").limit(1).execute()
    if not res.data:
        log.error("No doctor found in staff table. Make sure drsmoke@test.local exists.")
        sys.exit(1)

    doctor = res.data[0]
    log.info("Using doctor: %s (%s)", doctor["name"], doctor["id"])

    for profile in PROFILES:
        try:
            seed_patient(sb, profile, doctor["id"])
        except Exception as e:
            log.error("Failed seeding %s: %s", profile["name"], e)

    log.info("\n✅ All done! %d patient profiles seeded.", len(PROFILES))
    log.info("\nDemo login credentials:")
    log.info("  Doctor:       drsmoke@test.local / any password")
    log.info("  Patient:      aarav@gmail.com / any password")
    log.info("  Receptionist: receptionist@test.local / any password")
    log.info("\nAll demo patients are visible on the doctor dashboard.")


if __name__ == "__main__":
    main()
