# Backend Implementation Audit

> Complete record of all backend files written across three implementation sessions.
> Date: 2026-04-04 | Stack: FastAPI + Supabase + Gemini API

---

## Summary

All backend Python files were empty shells at the start. This audit covers every file
written, what it does, how it maps to the API contract, and any notable decisions made.

---

## Session 1 — Infrastructure + Users API + Exercises API

### `app/config/settings.py`

**What it does:**
Loads environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`) from `.env`
using `pydantic-settings` `BaseSettings`. Wrapped in `@lru_cache()` so settings are only
parsed once per process.

**Notable decisions:**
- Used `pydantic-settings` instead of raw `os.getenv` so missing vars raise a clear startup
  error rather than a silent `None` at call time.
- `@lru_cache()` makes `get_settings()` safe to call in multiple modules with zero overhead.

---

### `app/db/supabase_client.py`

**What it does:**
Lazy singleton that creates and caches the Supabase `Client`. Call `get_supabase()` anywhere
in a service to get the shared client.

**Notable decisions:**
- Single module-level `_client` variable — avoids creating a new connection on every request.
- All Supabase access is funnelled through this one function per the ops rule
  (`All Supabase calls go through db/supabase_client.py`).

---

### `app/models/user_models.py`

**Models:**

| Model | Used for |
|---|---|
| `UserCreate` | `POST /api/users` request body |
| `UserResponse` | `POST /api/users` 201 response + `GET /api/users/{id}` response |
| `UserListItem` | Items in `GET /api/users` list response |

**Contract compliance:**
- `UserListItem` returns only `id`, `name`, `created_at` — matches the list contract exactly
  (email/age/condition_notes are intentionally excluded from the list endpoint).
- All fields match schema column names and types.

---

### `app/services/user_service.py`

**Functions:**

| Function | Behaviour |
|---|---|
| `create_user(payload)` | Inserts into `users` table. Raises `500` if insert returns no data. |
| `list_users()` | Selects `id, name, created_at` ordered newest-first. |
| `get_user(user_id)` | Selects `*` by UUID. Raises `404` if not found. |

**Error handling:**
- `404` on missing user in `get_user`.
- `500` on failed insert (e.g. Supabase constraint error).
- `exclude_none=True` on `model_dump()` so optional fields (`email`, `age`,
  `condition_notes`) are not sent as `null` in the insert — Supabase assigns DB defaults.

---

### `app/routers/users.py`

**Endpoints registered:**

| Method | Path | Status |
|---|---|---|
| `POST` | `/api/users` | `201 Created` |
| `GET` | `/api/users` | `200 OK` |
| `GET` | `/api/users/{user_id}` | `200 OK` |

**Notable decisions:**
- Router contains zero business logic — only delegates to service functions.
- Prefix `/api/users` set on the router so `main.py` stays clean.

---

### `app/models/exercise_models.py`

**Models:**

| Model | Used for |
|---|---|
| `AngleConfig` | Nested model for the `angle_config` JSONB column |
| `ExerciseResponse` | Both list and single-item responses |

**Contract compliance:**
- `angle_config` validated as a structured `AngleConfig` object — not a raw dict — so
  Pydantic catches any malformed seed data at startup.
- `points` is `list[str]` matching the contract (`["left_elbow", "left_shoulder", "left_hip"]`).

---

### `app/services/exercise_service.py`

**Functions:**

| Function | Behaviour |
|---|---|
| `list_exercises(body_part, difficulty)` | Optional filters applied via `.eq()` only when params provided. |
| `get_exercise(exercise_id)` | Returns single exercise or `404`. |

**Contract compliance:**
- Query params `body_part` and `difficulty` match exactly what the contract specifies.
- Valid values (`shoulder`, `knee`, `elbow`, `hip` / `beginner`, `intermediate`, `advanced`)
  are enforced by the database seed data — no extra validation layer added to keep it simple.

---

### `app/routers/exercises.py`

**Endpoints registered:**

| Method | Path | Status |
|---|---|---|
| `GET` | `/api/exercises` | `200 OK` |
| `GET` | `/api/exercises/{exercise_id}` | `200 OK` |

---

### `seed/exercises.json`

**Contents:** 8 exercises across 4 body parts.

| Body Part | Exercises | Difficulties |
|---|---|---|
| `shoulder` | Shoulder Flexion, Shoulder Abduction, Shoulder External Rotation | beginner, beginner, intermediate |
| `elbow` | Elbow Flexion | beginner |
| `knee` | Knee Extension, Knee Flexion | beginner, intermediate |
| `hip` | Hip Abduction, Straight Leg Raise | intermediate, beginner |

Each entry includes a fully populated `angle_config` with `joint`, `points`,
`target_angle`, and `threshold` matching the schema's JSONB format.

**How to seed:** Paste the JSON into Supabase Table Editor → Insert rows, or use the
Supabase dashboard's bulk insert feature.

---

### `requirements.txt`

Added `pydantic-settings` (required for `BaseSettings` in settings.py — not included in
the original scaffold).

---

## Session 2 — Gemini Service + Exercise Sessions API + Game Sessions API

### `app/services/gemini_service.py`

**Functions:**

| Function | Behaviour |
|---|---|
| `generate_exercise_feedback(session_data, history)` | Builds a prompt with session metrics + last 5 history rows. Calls `gemini-pro`. Falls back on any error. |
| `generate_game_feedback(session_data, history)` | Same pattern for game sessions. |

**Fallback behaviour (per `decisions.md` rule 10):**
- Both functions are wrapped in a top-level `try/except Exception`.
- On any failure (API quota, network, malformed JSON, missing keys), a `logger.warning`
  is emitted and a hardcoded static feedback dict is returned — the demo never breaks.
- Fallback dicts are defined as module-level constants (`_FALLBACK_EXERCISE`,
  `_FALLBACK_GAME`) with all required fields populated.

**Prompt engineering:**
- Prompts instruct Gemini to return raw JSON only (no markdown, no extra text).
- Response parser strips ` ```json ` code fences if Gemini wraps output anyway.
- Required key presence validated after parse — missing keys trigger fallback.
- `recovery_score` clamped to `1–10` range after parse.

**History context:**
- Up to 5 most recent sessions (same user + exercise/game_type) passed into prompt.
- History rows fetched by the calling service, not by gemini_service — keeps Gemini
  service stateless and testable.

---

### `app/models/feedback_models.py`

**Models:**

| Model | Used for |
|---|---|
| `FeedbackResponse` | `GET /api/feedback/{session_id}` 200 response |
| `FeedbackProcessing` | `GET /api/feedback/{session_id}` 202 response |

**Contract compliance:**
- `FeedbackResponse` includes all fields from the contract: `id`, `session_id`,
  `session_type`, `summary`, `tips`, `encouragement`, `focus_areas`, `recovery_score`,
  `created_at`.
- `FeedbackProcessing` returns exactly `{ "status": "processing", "message": "..." }`.

---

### `app/services/feedback_service.py`

**Functions:**

| Function | Behaviour |
|---|---|
| `store_feedback(user_id, session_id, session_type, feedback_data)` | Inserts into `ai_feedback`. Returns new `id`. |
| `get_feedback(session_id)` | Queries `ai_feedback` by `session_id`. Raises `404` if not found. |

**Notable decisions:**
- `store_feedback` is called by both `session_service` and `game_service` after Gemini
  returns — single point of insertion logic.
- `get_feedback` orders by `created_at desc` and takes the first result, so if multiple
  feedback rows exist for a session (e.g. retry), the newest is returned.

---

### `app/models/session_models.py`

**Models:**

| Model | Used for |
|---|---|
| `AngleHistoryItem` | Each item in the `angle_history` JSONB array |
| `SessionCreate` | `POST /api/sessions` request body |
| `SessionCreateResponse` | `POST /api/sessions` 201 response (includes `feedback_id`) |
| `SessionDetail` | `GET /api/sessions/{id}` response (includes `exercise_name`, `angle_history`) |
| `SessionListItem` | Items in `GET /api/sessions` list |
| `SessionListResponse` | `GET /api/sessions` envelope `{ sessions, total }` |

**Contract compliance:**
- `SessionCreateResponse` includes `feedback_id` — required by contract because backend
  triggers Gemini immediately and frontend uses the ID to poll.
- `SessionDetail` adds `exercise_name` (not a DB column — joined from `exercises` table).
- `SessionListResponse` is an envelope object, not a bare array — matches contract exactly.

---

### `app/services/session_service.py`

**Functions:**

| Function | Behaviour |
|---|---|
| `create_session(payload)` | Insert → resolve exercise → fetch history → Gemini → store feedback → return with `feedback_id` |
| `get_session(session_id)` | Fetch session + join exercise name. Raises `404` if missing. |
| `list_sessions(user_id, limit, offset)` | Paginated list. Count query + rows query. Bulk-resolves exercise names. |

**Flow for `create_session`:**
1. Resolves `exercise_name` and `body_part` from `exercises` table (needed for Gemini prompt).
2. Serialises `angle_history` as list of dicts for JSONB insert.
3. Inserts into `exercise_sessions`.
4. Fetches last 5 sessions for same user + exercise (excludes the one just inserted).
5. Calls `gemini_service.generate_exercise_feedback()` — always succeeds (fallback).
6. Calls `feedback_service.store_feedback()` — returns `feedback_id`.
7. Returns `SessionCreateResponse` with all fields + `feedback_id`.

**Pagination:**
- `list_sessions` uses Supabase `.range(offset, offset + limit - 1)` for cursor-free
  offset pagination.
- Separate `count="exact"` query for the `total` field.
- Exercise names bulk-resolved with a single `IN` query (not N+1).

---

### `app/routers/sessions.py`

**Endpoints registered:**

| Method | Path | Status |
|---|---|---|
| `POST` | `/api/sessions` | `201 Created` |
| `GET` | `/api/sessions` | `200 OK` — requires `user_id` query param |
| `GET` | `/api/sessions/{session_id}` | `200 OK` |

**Route order:** `GET /api/sessions` is registered before `GET /api/sessions/{session_id}`
so FastAPI matches the parameterless route first — no conflict.

---

### `app/models/game_models.py`

**Models:**

| Model | Used for |
|---|---|
| `GameSessionCreate` | `POST /api/game-sessions` request body |
| `GameSessionCreateResponse` | `POST /api/game-sessions` 201 response (includes `feedback_id`) |
| `GameSessionListItem` | Items in `GET /api/game-sessions` list |
| `GameSessionListResponse` | `GET /api/game-sessions` envelope `{ sessions, total }` |

**Contract compliance:**
- `avg_reaction_ms` and `game_metadata` present on create but intentionally excluded from
  the list/create response — matches the contract shape exactly.

---

### `app/services/game_service.py`

**Functions:**

| Function | Behaviour |
|---|---|
| `create_game_session(payload)` | Validates game_type → insert → history → Gemini → store feedback → return with `feedback_id` |
| `list_game_sessions(user_id, game_type, limit)` | Optional game_type filter. Count + rows. |

**Validation:**
- `game_type` checked against `{"memory", "reaction", "pattern"}` before DB insert.
  Returns `400` with a clear message if invalid.

**History:**
- Filtered by both `user_id` AND `game_type` — users get game-type-specific history
  context in their AI feedback.

---

### `app/routers/games.py`

**Endpoints registered:**

| Method | Path | Status |
|---|---|---|
| `POST` | `/api/game-sessions` | `201 Created` |
| `GET` | `/api/game-sessions` | `200 OK` — requires `user_id`, optional `game_type` |

---

## Session 3 — Progress API + Feedback API

### `app/models/progress_models.py`

**Models:**

| Model | Used for |
|---|---|
| `ProgressSummary` | `summary` block in progress response |
| `ExerciseProgressDay` | One day in `exercise_progress` array |
| `GameProgressDay` | One day+game_type in `game_progress` array |
| `RecentFeedbackItem` | Items in `recent_feedback` array |
| `BodyPartBreakdownItem` | Items in `body_part_breakdown` array |
| `ProgressResponse` | Full `GET /api/progress/{user_id}` response |
| `ExerciseTrendDay` | One day in trend array |
| `ExerciseTrendResponse` | `GET /api/progress/{user_id}/exercise-trend` response |

**Contract compliance:**
- Every field name, nesting level, and type matches the API contract exactly.
- `date` is `str` (not `datetime`) — returned as `"YYYY-MM-DD"` string per contract.

---

### `app/services/progress_service.py`

**Functions:**

| Function | Behaviour |
|---|---|
| `get_progress(user_id)` | Aggregates all data for the dashboard. 404 if user missing. |
| `get_exercise_trend(user_id, days, exercise_id)` | Filters sessions within a date window, aggregates by day. |

**Aggregation strategy for `get_progress`:**
All computation is done in Python (not SQL) for simplicity — consistent with the
"hackathon scale, ~100 sessions" constraint in `decisions.md`.

| Field | How computed |
|---|---|
| `total_exercise_sessions` | `len(ex_sessions)` |
| `total_game_sessions` | `len(game_sessions)` |
| `total_reps` | `sum(reps_completed)` across all exercise sessions |
| `avg_form_score` | Mean of non-null `form_score` values |
| `current_streak_days` | Walk backwards from today in UTC, count consecutive days with activity |
| `total_active_days` | `len(unique dates)` across both session types |
| `exercise_progress` | Group by date: sum reps, count sessions, avg form_score |
| `game_progress` | Group by `(date, game_type)`: best score, avg accuracy |
| `recent_feedback` | Last 5 rows from `ai_feedback` ordered by `created_at desc` |
| `body_part_breakdown` | Group by body_part (resolved via `exercises` table): count + avg form_score |

**Queries made (4 total):**
1. `users` — existence check
2. `exercise_sessions` — all sessions for user
3. `game_sessions` — all sessions for user
4. `exercises` — metadata (body_part) for all referenced exercise IDs (single `IN` query)
5. `ai_feedback` — last 5 rows

**Streak logic:**
- `_compute_streak()` walks backwards from today (UTC) checking if each date is in the
  `active_dates` set (union of exercise + game session dates). Stops at the first gap.

**Exercise trend:**
- Filters by `completed_at >= cutoff` (ISO string comparison — works with `timestamptz`).
- Optional `exercise_id` filter applied before execution.
- Aggregates by day: avg angle, avg form_score, total reps.

---

### `app/routers/progress.py`

**Endpoints registered:**

| Method | Path | Status |
|---|---|---|
| `GET` | `/api/progress/{user_id}` | `200 OK` |
| `GET` | `/api/progress/{user_id}/exercise-trend` | `200 OK` |

**Route order:** `/exercise-trend` is a sub-path of `/{user_id}`. FastAPI resolves this
correctly because the literal segment `exercise-trend` takes priority over a wildcard
path parameter only when the router prefix is `/api/progress/{user_id}` — both routes
are on the same router so FastAPI sees them in registration order (trend registered second,
but literal always wins over param in FastAPI's routing).

---

### `app/routers/feedback.py`

**Endpoints registered:**

| Method | Path | Status |
|---|---|---|
| `GET` | `/api/feedback/{session_id}` | `200 OK` or `202 Accepted` |

**Processing state:**
- `GET /api/feedback/{session_id}?session_type=exercise`
- If `feedback_service.get_feedback()` raises a `404` (no row in `ai_feedback` yet),
  the router catches it and returns a `202 Accepted` with `{ "status": "processing",
  "message": "..." }`.
- In V1, feedback is written synchronously during `POST /sessions`, so `202` only occurs
  if Gemini + DB insert failed silently. The frontend polling loop handles this gracefully.
- `session_type` query param is accepted but not used for lookup — it exists in the
  contract and is preserved here for frontend compatibility.

---

### `app/main.py` (final state)

**All 6 routers mounted:**

```python
app.include_router(users.router)       # /api/users
app.include_router(exercises.router)   # /api/exercises
app.include_router(sessions.router)    # /api/sessions
app.include_router(games.router)       # /api/game-sessions
app.include_router(progress.router)    # /api/progress
app.include_router(feedback.router)    # /api/feedback
```

**CORS:** `http://localhost:3000` allowed, all methods and headers.

**Global exception handler:** Catches any unhandled exception and returns
`{ "detail": "Internal server error", "status_code": 500 }` — consistent with the
standard error shape defined in `api_contract.md`.

---

## Complete File Inventory

```
backend/
├── requirements.txt                   ← added pydantic-settings
├── .env.example                       ← unchanged (scaffold)
├── seed/
│   └── exercises.json                 ← 8 exercises, all body parts
└── app/
    ├── main.py                        ← FastAPI app, CORS, 6 routers
    ├── config/
    │   └── settings.py                ← env var loading via pydantic-settings
    ├── db/
    │   └── supabase_client.py         ← lazy singleton Supabase client
    ├── models/
    │   ├── user_models.py             ← UserCreate, UserResponse, UserListItem
    │   ├── exercise_models.py         ← AngleConfig, ExerciseResponse
    │   ├── session_models.py          ← SessionCreate, SessionCreateResponse,
    │   │                                 SessionDetail, SessionListItem,
    │   │                                 SessionListResponse, AngleHistoryItem
    │   ├── game_models.py             ← GameSessionCreate, GameSessionCreateResponse,
    │   │                                 GameSessionListItem, GameSessionListResponse
    │   ├── feedback_models.py         ← FeedbackResponse, FeedbackProcessing
    │   └── progress_models.py         ← ProgressResponse and all sub-models
    ├── services/
    │   ├── user_service.py            ← create, list, get user
    │   ├── exercise_service.py        ← list (filtered), get exercise
    │   ├── session_service.py         ← create (+ Gemini), get, list sessions
    │   ├── game_service.py            ← create (+ Gemini), list game sessions
    │   ├── gemini_service.py          ← exercise + game feedback, fallback
    │   ├── feedback_service.py        ← store, get feedback
    │   └── progress_service.py        ← dashboard aggregation, trend
    └── routers/
        ├── users.py                   ← POST /api/users, GET /api/users[/{id}]
        ├── exercises.py               ← GET /api/exercises[/{id}]
        ├── sessions.py                ← POST/GET /api/sessions[/{id}]
        ├── games.py                   ← POST/GET /api/game-sessions
        ├── progress.py                ← GET /api/progress/{id}[/exercise-trend]
        └── feedback.py                ← GET /api/feedback/{session_id}
```

---

## Bug Fix Session — 2026-04-04

Five issues identified by static analysis and fixed:

---

### FIX 1 (HIGH) — Gemini SDK deprecated + model not found

**Files:** `gemini_service.py`, `requirements.txt`

**Problem:**
- Package `google-generativeai` is deprecated.
- Import `import google.generativeai as genai` and `genai.GenerativeModel("gemini-pro")`
  produce a 404 model-not-found error at runtime.
- Result: every single feedback call fell through to the static fallback — AI feedback
  was never actually generated.

**Fix:**
- `requirements.txt`: `google-generativeai` → `google-genai`
- Import: `from google import genai` + `from google.genai import types`
- Removed `_get_model()`, replaced with `_get_client() -> genai.Client`
- Call pattern: `client.models.generate_content(model=_MODEL, contents=prompt)`
- `_MODEL = "gemini-2.5-flash"` — module-level constant, one place to update

---

### FIX 2 (MEDIUM) — Feedback lookup ignores `session_type`

**Files:** `feedback_service.py`, `routers/feedback.py`

**Problem:**
- `get_feedback(session_id)` filtered only by `session_id`.
- `session_type` was a required query param in the router but was never passed to the
  service or used in the DB query.
- The `ai_feedback` table uses a polymorphic FK — `session_id` alone is ambiguous.

**Fix:**
- `feedback_service.get_feedback(session_id, session_type)` — signature extended
- Added `.eq("session_type", session_type)` to the Supabase query
- Router now passes `session_type` through: `feedback_service.get_feedback(session_id, session_type)`

---

### FIX 3 (MEDIUM) — `.env` path breaks when uvicorn is not run from `backend/`

**Files:** `app/config/settings.py`

**Problem:**
- `env_file = ".env"` is a relative path resolved against the process `cwd`.
- Running `uvicorn app.main:app` from the repo root or any other directory silently
  loaded no env vars, causing a `ValidationError` on first request.

**Fix:**
```python
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
```
Walks two directories up from `app/config/settings.py` → reaches `backend/.env`.
Anchored to the file's own location — works from any `cwd`.

---

### FIX 4 (LOW) — Unused variable `base_query_args`

**File:** `game_service.py`

**Problem:** `base_query_args = {"user_id": user_id}` was assigned in
`list_game_sessions()` but never referenced. Dead code.

**Fix:** Line removed.

---

### FIX 5 (LOW) — Global `Exception` handler swallowed `HTTPException` detail

**File:** `app/main.py`

**Problem:** A single `@app.exception_handler(Exception)` caught everything including
`HTTPException`. All 404s and 400s were returned as `500 Internal server error` with no
diagnostic detail.

**Fix:** Added a dedicated `@app.exception_handler(HTTPException)` that runs first and
returns the original `status_code` + `detail` verbatim — matches the standard error shape
from `api_contract.md`. The `Exception` catch-all remains for truly unexpected errors.

---

## API Endpoint Checklist

| # | Endpoint | Contract | Implemented | Notes |
|---|---|---|---|---|
| 1 | `POST /api/users` | ✅ | ✅ | 201, returns full user |
| 2 | `GET /api/users` | ✅ | ✅ | id+name+created_at only |
| 3 | `GET /api/users/{id}` | ✅ | ✅ | 404 on missing |
| 4 | `GET /api/exercises` | ✅ | ✅ | body_part + difficulty filters |
| 5 | `GET /api/exercises/{id}` | ✅ | ✅ | 404 on missing |
| 6 | `POST /api/sessions` | ✅ | ✅ | triggers Gemini, returns feedback_id |
| 7 | `GET /api/sessions` | ✅ | ✅ | user_id required, paginated, total count |
| 8 | `GET /api/sessions/{id}` | ✅ | ✅ | includes exercise_name + angle_history |
| 9 | `POST /api/game-sessions` | ✅ | ✅ | validates game_type, returns feedback_id |
| 10 | `GET /api/game-sessions` | ✅ | ✅ | user_id required, game_type filter |
| 11 | `GET /api/progress/{id}` | ✅ | ✅ | full dashboard aggregation |
| 12 | `GET /api/progress/{id}/exercise-trend` | ✅ | ✅ | days + exercise_id filters |
| 13 | `GET /api/feedback/{session_id}` | ✅ | ✅ | 200 ready / 202 processing |

---

## Rules Compliance

| Rule | Status | Notes |
|---|---|---|
| API contract not broken | ✅ | All field names, types, response shapes match exactly |
| Schema not changed | ✅ | No DDL written — all queries reference existing columns only |
| No authentication | ✅ | No middleware, no JWT, no OAuth |
| Router calls service only | ✅ | Zero business logic in any router |
| All Supabase calls via `supabase_client.py` | ✅ | `get_supabase()` called in every service |
| All Gemini calls via `gemini_service.py` | ✅ | Both session_service and game_service import gemini_service |
| Gemini uses current SDK | ✅ | `google-genai`, `genai.Client`, `gemini-2.5-flash` (fixed 2026-04-04) |
| Gemini fallback on failure | ✅ | Top-level try/except in both generate functions |
| Feedback lookup uses session_type | ✅ | `get_feedback(session_id, session_type)` filters both columns (fixed 2026-04-04) |
| HTTPException returns correct status codes | ✅ | Dedicated handler in `main.py` (fixed 2026-04-04) |
| CORS for localhost:3000 | ✅ | Set in main.py middleware |
| No auth middleware | ✅ | |
| IDs are UUIDs | ✅ | All IDs typed as `str`, Supabase generates them |
| form_score 0.0–1.0 | ✅ | Enforced by schema constraint — not re-validated in Python |
| recovery_score 1–10 | ✅ | Clamped in `gemini_service.py` after parse |
| game_type validated | ✅ | Checked against set in `game_service.py` before insert |
