import logging
import json
from google import genai
from google.genai import types
from app.config.settings import get_settings

logger = logging.getLogger(__name__)

_FALLBACK_EXERCISE = {
    "summary": "Great session! Keep up your exercises and stay consistent with your recovery plan.",
    "tips": [
        "Focus on controlled movements rather than speed",
        "Remember to breathe steadily throughout each rep",
        "Rest if you feel any sharp pain",
    ],
    "encouragement": "You're doing a wonderful job staying committed to your recovery! Keep it up! 💪",
    "focus_areas": ["Consistent form", "Full range of motion"],
    "recovery_score": 7,
}

_FALLBACK_GAME = {
    "summary": "Nice effort on the cognitive exercise! Regular practice helps sharpen your focus and memory.",
    "tips": [
        "Try to play at a consistent time each day",
        "Take a short break if you feel mentally fatigued",
        "Challenge yourself to beat your previous score",
    ],
    "encouragement": "Every session counts — you're keeping your mind active and sharp! 🧠",
    "focus_areas": ["Focus", "Processing speed"],
    "recovery_score": 7,
}


_MODEL = "gemini-2.5-flash"


def _get_client() -> genai.Client:
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


def generate_exercise_feedback(
    session_data: dict,
    history: list[dict],
    patient_context: dict | None = None,
) -> dict:
    """
    Build a prompt from the exercise session + recent history and call Gemini.
    Optionally enriches the prompt with patient clinical context (diagnosis, injury_type, severity).
    Returns a structured feedback dict. Falls back to hardcoded response on any error.
    """
    try:
        client = _get_client()

        history_text = ""
        if history:
            history_text = "\n".join(
                f"- {h.get('completed_at', 'unknown date')}: {h.get('reps_completed', 0)} reps, "
                f"avg angle {h.get('avg_angle', 'N/A')}°, form score {h.get('form_score', 'N/A')}"
                for h in history[:5]
            )
        else:
            history_text = "No previous sessions recorded."

        # Build clinical context block if patient data is available
        clinical_section = ""
        if patient_context:
            diagnosis = patient_context.get("diagnosis") or "Not specified"
            injury_type = patient_context.get("injury_type") or "Not specified"
            severity = patient_context.get("severity") or "Not specified"
            clinical_section = f"""
Patient Clinical Context:
- Diagnosis: {diagnosis}
- Injury Type: {injury_type}
- Severity: {severity}
"""

        prompt = f"""You are a supportive physiotherapy AI assistant helping a hospital patient with their rehabilitation.
{clinical_section}
Exercise Session Data:
- Exercise: {session_data.get('exercise_name', 'Unknown')}
- Body Part: {session_data.get('body_part', 'Unknown')}
- Reps Completed: {session_data.get('reps_completed', 0)}
- Average Angle: {session_data.get('avg_angle', 'N/A')}°
- Min Angle: {session_data.get('min_angle', 'N/A')}°
- Max Angle: {session_data.get('max_angle', 'N/A')}°
- Form Score: {session_data.get('form_score', 'N/A')} (0.0–1.0 scale)
- Duration: {session_data.get('duration_seconds', 0)} seconds

Recent Session History:
{history_text}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "summary": "2-3 sentence encouraging summary of this session and any progress",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "encouragement": "one warm motivational sentence",
  "focus_areas": ["area 1", "area 2"],
  "recovery_score": <integer 1-10>
}}"""

        response = client.models.generate_content(model=_MODEL, contents=prompt)
        text = response.text.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        parsed = json.loads(text)

        # Validate required keys are present
        required = {"summary", "tips", "encouragement", "focus_areas", "recovery_score"}
        if not required.issubset(parsed.keys()):
            raise ValueError("Gemini response missing required keys")

        # Clamp recovery_score to 1–10
        parsed["recovery_score"] = max(1, min(10, int(parsed["recovery_score"])))

        return parsed

    except Exception as exc:
        logger.warning("Gemini exercise feedback failed, using fallback. Error: %s", exc)
        return _FALLBACK_EXERCISE


def generate_game_feedback(session_data: dict, history: list[dict]) -> dict:
    """
    Build a prompt from the game session + recent history and call Gemini.
    Returns a structured feedback dict. Falls back to hardcoded response on any error.
    """
    try:
        client = _get_client()

        history_text = ""
        if history:
            history_text = "\n".join(
                f"- {h.get('completed_at', 'unknown date')}: score {h.get('score', 0)}, "
                f"accuracy {h.get('accuracy', 'N/A')}"
                for h in history[:5]
            )
        else:
            history_text = "No previous game sessions recorded."

        prompt = f"""You are a supportive rehabilitation AI assistant helping a patient with cognitive exercises.

Game Session Data:
- Game Type: {session_data.get('game_type', 'Unknown')}
- Score: {session_data.get('score', 0)}
- Accuracy: {session_data.get('accuracy', 'N/A')} (0.0–1.0 scale)
- Level Reached: {session_data.get('level_reached', 'N/A')}
- Duration: {session_data.get('duration_seconds', 0)} seconds
- Extra Details: {json.dumps(session_data.get('game_metadata', {}))}

Recent Game History (same game type):
{history_text}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "summary": "2-3 sentence encouraging summary of this game session and any progress",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "encouragement": "one warm motivational sentence",
  "focus_areas": ["area 1", "area 2"],
  "recovery_score": <integer 1-10>
}}"""

        response = client.models.generate_content(model=_MODEL, contents=prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        parsed = json.loads(text)

        required = {"summary", "tips", "encouragement", "focus_areas", "recovery_score"}
        if not required.issubset(parsed.keys()):
            raise ValueError("Gemini response missing required keys")

        parsed["recovery_score"] = max(1, min(10, int(parsed["recovery_score"])))

        return parsed

    except Exception as exc:
        logger.warning("Gemini game feedback failed, using fallback. Error: %s", exc)
        return _FALLBACK_GAME
