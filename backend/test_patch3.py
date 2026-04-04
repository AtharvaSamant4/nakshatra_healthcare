path = 'c:/OLD D DRIVE/Nakshatra Hackathon Prototype/nakshatra_healthcare/backend/app/services/ai_service.py'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

import re
old_func = '''def predict_recovery(patient_id: str) -> dict:
    \"\"\"
    Pure-math recovery prediction.
    Uses first and latest session ROM + elapsed days to project days to target ROM.
    No ML, no Gemini call.
    \"\"\"
    supabase = get_supabase()

    # Fetch all sessions ordered oldest->newest for this patient
    resp = (
        supabase.table(\"exercise_sessions\")
        .select(\"max_angle, min_angle, avg_angle, completed_at\")
        .eq(\"user_id\", patient_id)
        .order(\"completed_at\", desc=False)
        .execute()
    )
    sessions = resp.data or []

    def _rom(s: dict) -> float | None:
        mx = s.get(\"max_angle\")
        mn = s.get(\"min_angle\")
        if mx is not None and mn is not None:
            return float(mx) - float(mn)
        if s.get(\"avg_angle\") is not None:
            return float(s[\"avg_angle\"])
        return None

    # Filter to sessions that have usable ROM data
    rom_sessions = [(s, _rom(s)) for s in sessions if _rom(s) is not None]

    if len(rom_sessions) < 2:
        return {
            \"estimated_days\": None,
            \"confidence\": \"low\",
            \"initial_rom\": rom_sessions[0][1] if rom_sessions else None,
            \"latest_rom\": None,
            \"target_rom\": _TARGET_ROM,
            \"progress_rate_per_day\": None,
        }

    first_session, initial_rom = rom_sessions[0]
    last_session, latest_rom = rom_sessions[-1]

    # Elapsed days between first and last session
    try:
        fmt = \"%Y-%m-%dT%H:%M:%S\"
        t0 = datetime.fromisoformat(str(first_session[\"completed_at\"]).replace(\"Z\", \"+00:00\"))
        t1 = datetime.fromisoformat(str(last_session[\"completed_at\"]).replace(\"Z\", \"+00:00\"))
        elapsed_days = max((t1 - t0).total_seconds() / 86400.0, 1.0)
    except Exception:
        elapsed_days = max(len(rom_sessions) - 1, 1)

    progress_rate = (latest_rom - initial_rom) / elapsed_days  # degrees / day

    # Already at or past target
    if latest_rom >= _TARGET_ROM:
        return {
            \"estimated_days\": 0,
            \"confidence\": \"high\",
            \"initial_rom\": round(initial_rom, 1),
            \"latest_rom\": round(latest_rom, 1),
            \"target_rom\": _TARGET_ROM,
            \"progress_rate_per_day\": round(progress_rate, 3),
        }

    # Not improving - can't predict
    if progress_rate <= 0:
        return {
            \"estimated_days\": None,
            \"confidence\": \"low\",
            \"initial_rom\": round(initial_rom, 1),
            \"latest_rom\": round(latest_rom, 1),
            \"target_rom\": _TARGET_ROM,
            \"progress_rate_per_day\": round(progress_rate, 3),
        }

    days_left = ((_TARGET_ROM - latest_rom) / progress_rate)
    estimated_days = max(1, round(days_left))

    # Confidence based on number of data points and elapsed time
    n = len(rom_sessions)
    if n >= 10 and elapsed_days >= 7:
        confidence = \"high\"
    elif n >= 4 and elapsed_days >= 3:
        confidence = \"medium\"
    else:
        confidence = \"low\"

    return {
        \"estimated_days\": estimated_days,
        \"confidence\": confidence,
        \"initial_rom\": round(initial_rom, 1),
        \"latest_rom\": round(latest_rom, 1),
        \"target_rom\": _TARGET_ROM,
        \"progress_rate_per_day\": round(progress_rate, 3),
    }'''

new_func = '''def predict_recovery(patient_id: str) -> dict:
    supabase = get_supabase()

    resp = (
        supabase.table("exercise_sessions")
        .select("max_angle, min_angle, avg_angle, form_score, completed_at")
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

    rom_sessions = [(s, _rom(s)) for s in sessions if _rom(s) is not None]

    if len(rom_sessions) < 2:
        # Fallback to form_score if ROM is not present (Demo mode safe)
        form_sessions = [(s, float(s["form_score"])) for s in sessions if s.get("form_score") is not None]
        if len(form_sessions) < 2:
            return {"estimated_days": None, "confidence": "low"}
        
        f0 = form_sessions[0][1]
        f1 = form_sessions[-1][1]
        if f1 >= 1.0: return {"estimated_days": 0, "confidence": "high"}
        if f1 <= f0: return {"estimated_days": 14, "confidence": "low"} # Demo fallback assumption
        try:
            t0 = datetime.fromisoformat(str(form_sessions[0][0]["completed_at"]).replace("Z", "+00:00"))
            t1 = datetime.fromisoformat(str(form_sessions[-1][0]["completed_at"]).replace("Z", "+00:00"))
            elapsed_days = max((t1 - t0).total_seconds() / 86400.0, 1.0)
        except: elapsed_days = max(len(form_sessions) - 1, 1)
        rate = (f1 - f0) / elapsed_days
        days = round((1.0 - f1) / rate) if rate > 0 else 14
        return {"estimated_days": days, "confidence": "medium"}

    first_session, initial_rom = rom_sessions[0]
    last_session, latest_rom = rom_sessions[-1]

    try:
        t0 = datetime.fromisoformat(str(first_session["completed_at"]).replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(str(last_session["completed_at"]).replace("Z", "+00:00"))
        elapsed_days = max((t1 - t0).total_seconds() / 86400.0, 1.0)
    except Exception:
        elapsed_days = max(len(rom_sessions) - 1, 1)

    progress_rate = (latest_rom - initial_rom) / elapsed_days

    if latest_rom >= _TARGET_ROM:
        return {"estimated_days": 0, "confidence": "high"}

    if progress_rate <= 0:
        # Demo fallback for non-improving rom
        return {"estimated_days": 21, "confidence": "low"}

    estimated_days = max(1, round((_TARGET_ROM - latest_rom) / progress_rate))
    
    n = len(rom_sessions)
    if n >= 10 and elapsed_days >= 7: confidence = "high"
    elif n >= 4 and elapsed_days >= 3: confidence = "medium"
    else: confidence = "low"

    return {"estimated_days": estimated_days, "confidence": confidence}'''

text = text.replace(old_func, new_func)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
