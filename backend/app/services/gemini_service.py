import logging
import os
import json
import time

from openai import OpenAI

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_BASE_BACKOFF_SECONDS = 2.0

_GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]

# Fallbacks for safety.
_FALLBACK_EXERCISE = {
    "summary": "Great session! Keep up your exercises and stay consistent with your recovery plan.",
    "tips": [
        "Focus on controlled movements rather than speed",
        "Remember to breathe steadily throughout each rep",
        "Rest if you feel any sharp pain",
    ],
    "encouragement": "You're doing a wonderful job staying committed to your recovery! Keep it up! ",
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
    "encouragement": "Every session counts — you're keeping your mind active and sharp! ",
    "focus_areas": ["Focus", "Processing speed"],
    "recovery_score": 7,
}

_FALLBACK_COGNITIVE = {
    "summary": "Good effort on the cognitive assessment! Regular practice strengthens neural pathways and improves cognitive function.",
    "tips": [
        "Practice regularly for best results",
        "Try to minimize distractions during tests",
        "Take breaks between sessions to avoid fatigue",
    ],
    "encouragement": "Every assessment helps track your cognitive health. Keep it up!",
    "focus_areas": ["Processing speed", "Working memory"],
    "recovery_score": 7,
}

def _is_rate_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "429" in msg or "resource_exhausted" in msg or "rate" in msg

from app.config.settings import get_settings

class GroqClient:
    def __init__(self):
        settings = get_settings()
        api_key = getattr(settings, "grok_api_key", "")
        if not api_key:
            api_key = os.getenv("GROK_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("GROK_API_KEY is not set in .env")

        self._client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        logger.info("[ai] Groq client initialized")

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        errors = []
        for model in _GROQ_MODELS:
            for attempt in range(_MAX_RETRIES + 1):
                try:
                    kwargs = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You are a senior clinical AI specializing in rehabilitation. Return output in the requested format." + (" You must return ONLY raw JSON." if json_mode else "")},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.3,
                        "max_tokens": 2000,
                    }
                    if json_mode:
                        kwargs["response_format"] = { "type": "json_object" }
                    response = self._client.chat.completions.create(**kwargs)
                    text = (response.choices[0].message.content or "").strip()
                    if text:
                        return text
                    errors.append(f"{model}: empty_response")
                    break
                except Exception as exc:
                    if _is_rate_limit_error(exc) and attempt < _MAX_RETRIES:
                        wait = _BASE_BACKOFF_SECONDS * (2 ** attempt)
                        time.sleep(wait)
                        continue
                    errors.append(f"{model}: {type(exc).__name__}")
                    break
        raise RuntimeError(f"Groq invocation failed: {errors}")

_client_instance = None
def _get_client():
    global _client_instance
    if _client_instance is None:
        _client_instance = GroqClient()
    return _client_instance

def _parse_json(text: str, fallback: dict) -> dict:
    try:
        if "`json" in text:
            text = text.split("`json")[1].split("``")[0].strip()
        elif "``" in text:
            text = text.split("``")[1].strip()
        return json.loads(text)
    except:
        return fallback

def generate_exercise_feedback(
    session_data: dict,
    history: list[dict],
    patient_context: dict | None = None,
) -> dict:
    clinical = ""
    if patient_context:
        diagnosis = patient_context.get("diagnosis") or "Not specified"
        injury_type = patient_context.get("injury_type") or "Not specified"
        severity = patient_context.get("severity") or "Not specified"
        clinical = (
            f" Patient clinical context — diagnosis: {diagnosis}, "
            f"injury_type: {injury_type}, severity: {severity}."
        )
    prompt = (
        f"Respond with ONLY JSON. Session: {session_data}, History: {history}.{clinical} "
        "Needs keys: summary(str), tips(list), encouragement(str), focus_areas(list), recovery_score(int 1-10)."
    )
    try:
        return _parse_json(_get_client().generate(prompt, True), _FALLBACK_EXERCISE)
    except Exception as e:
        logger.error(e)
        return _FALLBACK_EXERCISE

def generate_game_feedback(session_data: dict, history: list[dict]) -> dict:
    prompt = f"Respond with ONLY JSON. Game: {session_data}, History: {history}. Needs keys: summary(str), tips(list), encouragement(str), focus_areas(list), recovery_score(int 1-10)."
    try:
        return _parse_json(_get_client().generate(prompt, True), _FALLBACK_GAME)
    except Exception as e:
        logger.error(e)
        return _FALLBACK_GAME


def generate_cognitive_test_feedback(session_data: dict, history: list[dict]) -> dict:
    prompt = (
        "Respond with ONLY JSON. Cognitive session: "
        f"{session_data}, History: {history}. "
        "Needs keys: summary(str), tips(list), encouragement(str), focus_areas(list), recovery_score(int 1-10)."
    )
    try:
        parsed = _parse_json(_get_client().generate(prompt, True), _FALLBACK_COGNITIVE)
        parsed["recovery_score"] = max(1, min(10, int(parsed.get("recovery_score", 7))))
        return parsed
    except Exception as e:
        logger.error(e)
        return _FALLBACK_COGNITIVE


def evaluate_cognitive_response(
    test_type: str,
    transcript: str,
    expected: str,
    metadata: dict | None = None,
) -> dict:
    fallback = {
        "score": 50,
        "accuracy": 0.5,
        "feedback": "Your response was recorded. Keep practicing for improved results!",
        "corrections": [],
        "missed_items": [],
        "extra_items": [],
    }

    prompt = f"""Respond with ONLY JSON.
You are a cognitive assessment evaluator.

Test Type: {test_type}
Expected Response: {expected}
User Transcript: {transcript}
Additional Context: {json.dumps(metadata or {})}

Return keys:
- score (int 0-100)
- accuracy (float 0.0-1.0)
- feedback (string)
- corrections (list)
- missed_items (list)
- extra_items (list)
"""

    try:
        parsed = _parse_json(_get_client().generate(prompt, True), fallback)
        parsed["score"] = max(0, min(100, int(parsed.get("score", 50))))
        parsed["accuracy"] = max(0.0, min(1.0, float(parsed.get("accuracy", 0.5))))
        parsed.setdefault("feedback", fallback["feedback"])
        parsed.setdefault("corrections", [])
        parsed.setdefault("missed_items", [])
        parsed.setdefault("extra_items", [])
        return parsed
    except Exception as e:
        logger.error(e)
        return fallback

def generate_report(context: dict) -> dict:
    prompt = f"Respond with ONLY JSON. Generate a doctor-facing report. Context: {context}. Keys: summary(str), progress_trend(improving, stable, declining), risk_level(low, medium, high), key_issues(list), recommendations(list), next_plan(str)."
    try:
        res = _parse_json(_get_client().generate(prompt, True), {})
        if res.get("progress_trend") not in ("improving", "stable", "declining"): res["progress_trend"] = "stable"
        return res
    except:
        return {"summary": "Error generating report", "progress_trend": "stable"}

def generate_patient_chat(message: str, context: dict) -> str:
    prompt = f"Context: {context}. The patient asks: {message}. Provide a clinical yet supportive plain text response."
    try:
        return _get_client().generate(prompt, False)
    except:
        return "I'm currently unable to connect to our clinical AI module. Please call the office if urgent."

def generate_doctor_chat(message: str, context: dict) -> str:
    prompt = f"Context: {context}. The doctor says: {message}. Draft a clinical response or action text."
    try:
        return _get_client().generate(prompt, False)
    except:
        return "Module unavailable."

def generate_weekly_report(context: dict) -> dict:
    return generate_report(context)

def generate_recommendations(context: dict) -> dict:
    return generate_report(context)

