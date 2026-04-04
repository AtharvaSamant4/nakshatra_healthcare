# Changelog

> Track all significant changes during development. Update this file when completing features, fixing bugs, or making architectural changes.

---

## Format

```
## [Date] — [Short Description]

**Author:** [Name]
**Type:** feature | bugfix | refactor | config | docs
**Files changed:**
- path/to/file1
- path/to/file2

**What changed:**
Brief description of what was done.

**Why:**
Rationale if not obvious.

**Breaking changes:**
None / describe if any.
```

---

## Log

<!-- Add entries below in reverse chronological order (newest first) -->

### [2026-04-04] — Backend Bug Fixes (5 issues)

**Author:** Claude Code
**Type:** bugfix
**Files changed:**
- `backend/app/services/gemini_service.py`
- `backend/app/config/settings.py`
- `backend/app/services/feedback_service.py`
- `backend/app/routers/feedback.py`
- `backend/app/services/game_service.py`
- `backend/app/main.py`
- `backend/requirements.txt`

**What changed:**

1. **[HIGH] Gemini SDK + model name** — replaced deprecated `google-generativeai` package
   and `google.generativeai` import with `google-genai` (`from google import genai`).
   Replaced dead model `gemini-pro` (404 at runtime) with `gemini-2.5-flash` via
   `genai.Client` + `client.models.generate_content()`. Updated `requirements.txt`.
   All AI feedback now actually reaches Gemini instead of always falling back.

2. **[MEDIUM] Feedback lookup ignores `session_type`** — `feedback_service.get_feedback()`
   now accepts and filters by `session_type` alongside `session_id`. Router passes it
   through. Eliminates risk of returning wrong-type feedback on ID collision.

3. **[MEDIUM] `.env` path depends on cwd** — `settings.py` now resolves the env file as
   `Path(__file__).resolve().parents[2] / ".env"`, anchored to the file's own location.
   Works correctly regardless of which directory uvicorn is invoked from.

4. **[LOW] Dead variable `base_query_args`** — removed unused `base_query_args` dict from
   `game_service.list_game_sessions()`.

5. **[LOW] Global exception handler swallows HTTPException** — added a dedicated
   `HTTPException` handler in `main.py` that returns the original `status_code` and
   `detail`. The generic `Exception` catch-all only fires for truly unexpected errors now.

**Why:**
The Gemini SDK issue meant every feedback call degraded to static fallback text, making
the AI differentiation invisible during demo. The HTTPException swallow caused all 404s
and 400s to surface as unhelpful `500 Internal server error` responses.

**Breaking changes:**
- `feedback_service.get_feedback()` signature changed: now requires `session_type` as
  second argument. Only caller is `routers/feedback.py` — already updated.
- `requirements.txt`: `google-generativeai` replaced by `google-genai` — run
  `pip install -r requirements.txt` to update local environment.

---

### [2026-04-04] — Progress API + Feedback API Implemented

**Author:** Claude Code
**Type:** feature
**Files changed:**
- `backend/app/models/progress_models.py`
- `backend/app/services/progress_service.py`
- `backend/app/routers/progress.py`
- `backend/app/routers/feedback.py`
- `backend/app/main.py`
- `backend/BACKEND_AUDIT.md`

**What changed:**
Implemented `GET /api/progress/{user_id}` (full dashboard aggregation: summary, exercise
progress by day, game progress by day, recent feedback, body part breakdown) and
`GET /api/progress/{user_id}/exercise-trend` (day-by-day angle/form/reps trend with
optional `days` and `exercise_id` filters). Implemented `GET /api/feedback/{session_id}`
with `202 Accepted` processing state when feedback row not yet present. All 6 routers
now mounted in `main.py`. Created `BACKEND_AUDIT.md` as a full implementation record.

**Why:**
Completes the backend API surface. Frontend dashboard and results pages depend on these
endpoints.

**Breaking changes:**
None.

---

### [2026-04-04] — Exercise Sessions API + Game Sessions API + Gemini Service Implemented

**Author:** Claude Code
**Type:** feature
**Files changed:**
- `backend/app/services/gemini_service.py`
- `backend/app/models/feedback_models.py`
- `backend/app/services/feedback_service.py`
- `backend/app/models/session_models.py`
- `backend/app/services/session_service.py`
- `backend/app/routers/sessions.py`
- `backend/app/models/game_models.py`
- `backend/app/services/game_service.py`
- `backend/app/routers/games.py`
- `backend/app/main.py`

**What changed:**
Implemented `POST /api/sessions` and `GET /api/sessions[/{id}]` (exercise sessions with
Gemini-triggered feedback on every POST). Implemented `POST /api/game-sessions` and
`GET /api/game-sessions` (same Gemini pattern). `gemini_service.py` builds prompts from
session data + last 5 history rows; wraps all Gemini calls in `try/except` with hardcoded
fallback dicts so the demo never breaks. `feedback_service.py` handles all `ai_feedback`
table reads/writes. Sessions router mounted in `main.py`.

**Why:**
Core exercise and game data capture. Gemini feedback is the main differentiator of the
product — needed before any results page can work.

**Breaking changes:**
None.

---

### [2026-04-04] — Users API + Exercises API + Infrastructure Implemented

**Author:** Claude Code
**Type:** feature
**Files changed:**
- `backend/app/config/settings.py`
- `backend/app/db/supabase_client.py`
- `backend/app/models/user_models.py`
- `backend/app/models/exercise_models.py`
- `backend/app/services/user_service.py`
- `backend/app/services/exercise_service.py`
- `backend/app/routers/users.py`
- `backend/app/routers/exercises.py`
- `backend/app/main.py`
- `backend/seed/exercises.json`
- `backend/requirements.txt`

**What changed:**
Built the infrastructure layer (`settings.py` with `pydantic-settings`, lazy Supabase
singleton in `supabase_client.py`). Implemented `POST /api/users`, `GET /api/users`,
`GET /api/users/{id}`, `GET /api/exercises`, `GET /api/exercises/{id}`. Added 8 seed
exercises across shoulder/elbow/knee/hip. Added `pydantic-settings` to `requirements.txt`.

**Why:**
Foundation layer — user identity and exercise catalog required before any session can
be recorded.

**Breaking changes:**
None — all files were empty shells prior to this.

---

### [2026-04-04] — Project Scaffold Created

**Author:** Team
**Type:** config
**Files changed:**
- All directories and empty files

**What changed:**
Initial project structure created with all frontend routes, backend modules, context files, and ops files. All files are empty shells awaiting implementation.

**Why:**
Establish the agreed-upon folder structure before parallel development begins.

**Breaking changes:**
None (initial setup).

---

<!-- 
TEMPLATE — Copy this for new entries:

### [YYYY-MM-DD] — [Title]

**Author:** [Name]
**Type:** feature | bugfix | refactor | config | docs
**Files changed:**
- 

**What changed:**


**Why:**


**Breaking changes:**

-->
