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


def generate_exercise_feedback(session_data: dict, history: list[dict]) -> dict:
    """
    Build a prompt from the exercise session + recent history and call Gemini.
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

        prompt = f"""You are a supportive physiotherapy AI assistant helping a patient with their rehabilitation.

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


_FALLBACK_COGNITIVE = {
    "summary": "Good effort on the cognitive assessment! Regular practice strengthens neural pathways and improves cognitive function.",
    "tips": [
        "Practice regularly for best results",
        "Try to minimize distractions during tests",
        "Take breaks between sessions to avoid fatigue",
    ],
    "encouragement": "Every assessment helps track your cognitive health — keep it up! 🧠",
    "focus_areas": ["Processing speed", "Working memory"],
    "recovery_score": 7,
}


def generate_cognitive_test_feedback(session_data: dict, history: list[dict]) -> dict:
    """
    Build a prompt from the cognitive test session + recent history and call Gemini.
    Returns a structured feedback dict. Falls back to hardcoded response on any error.
    """
    try:
        client = _get_client()

        history_text = ""
        if history:
            history_text = "\n".join(
                f"- {h.get('completed_at', 'unknown date')}: score {h.get('score', 0)}, "
                f"accuracy {h.get('accuracy', 'N/A')}, response_time {h.get('response_time_ms', 'N/A')}ms"
                for h in history[:5]
            )
        else:
            history_text = "No previous cognitive test sessions recorded."

        prompt = f"""You are a supportive rehabilitation AI assistant helping a patient with cognitive assessment.

Cognitive Test Session Data:
- Test Type: {session_data.get('test_type', 'Unknown')}
- Score: {session_data.get('score', 0)} (out of 100)
- Accuracy: {session_data.get('accuracy', 'N/A')} (0.0–1.0 scale)
- Response Time: {session_data.get('response_time_ms', 'N/A')} ms
- Word Count: {session_data.get('word_count', 'N/A')}
- Error Count: {session_data.get('error_count', 'N/A')}
- Duration: {session_data.get('duration_seconds', 0)} seconds
- User Transcript: {session_data.get('transcript', 'N/A')}
- Expected Response: {session_data.get('expected_response', 'N/A')}
- Extra Details: {json.dumps(session_data.get('test_metadata', {}))}

Recent Test History (same test type):
{history_text}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "summary": "2-3 sentence encouraging summary of this cognitive test session and any progress",
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
        logger.warning("Gemini cognitive test feedback failed, using fallback. Error: %s", exc)
        return _FALLBACK_COGNITIVE


def evaluate_cognitive_response(
    test_type: str,
    transcript: str,
    expected: str,
    metadata: dict | None = None,
) -> dict:
    """
    Evaluate a single cognitive test response using Gemini.
    Returns scoring, corrections, and missed items.
    """
    _FALLBACK_EVAL = {
        "score": 50,
        "accuracy": 0.5,
        "feedback": "Your response was recorded. Keep practicing for improved results!",
        "corrections": [],
        "missed_items": [],
        "extra_items": [],
    }

    try:
        client = _get_client()

        prompt = f"""You are a cognitive assessment evaluator. Compare the user's spoken response against the expected answer.

Test Type: {test_type}
Expected Response: {expected}
User's Transcript: {transcript}
Additional Context: {json.dumps(metadata or {})}

Rules for evaluation:
- For memory_recall: check if words/numbers are recalled correctly and in order. Partial credit for correct items in wrong order.
- For verbal_fluency: count unique valid words in the category. Ignore duplicates and invalid words.
- For attention_reaction: check if the answer is correct (exact match or semantically equivalent).
- For sentence_repetition: compare sentences word by word. Allow minor variations (e.g., "a" vs "the") but penalize missing or wrong words.

Respond ONLY with a valid JSON object (no markdown, no extra text):
{{
  "score": <integer 0-100>,
  "accuracy": <float 0.0-1.0>,
  "feedback": "one sentence of specific feedback about what the user got right/wrong",
  "corrections": ["list of corrections if any"],
  "missed_items": ["items that were expected but missing from the response"],
  "extra_items": ["items in the response that were not expected or are invalid"]
}}"""

        response = client.models.generate_content(model=_MODEL, contents=prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        parsed = json.loads(text)

        required = {"score", "accuracy", "feedback", "corrections", "missed_items", "extra_items"}
        if not required.issubset(parsed.keys()):
            raise ValueError("Gemini eval response missing required keys")

        parsed["score"] = max(0, min(100, int(parsed["score"])))
        parsed["accuracy"] = max(0.0, min(1.0, float(parsed["accuracy"])))

        return parsed

    except Exception as exc:
        logger.warning("Gemini cognitive eval failed, using fallback. Error: %s", exc)
        return _FALLBACK_EVAL
