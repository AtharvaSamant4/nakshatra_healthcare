# Architectural Decisions

> Key decisions made during architecture planning and their rationale.
> These are final for V1. Do not revisit unless the team explicitly agrees.

---

## 1. MediaPipe Runs in the Browser (Not Backend)

**Decision:** All pose tracking happens client-side using `@mediapipe/tasks-vision`.

**Why:**
- Exercise tracking needs real-time feedback at **60fps** — any network round-trip would destroy the experience
- No video ever leaves the device → **privacy by design**
- No need for a GPU server → **zero infrastructure cost**
- Works offline once the model is cached in the browser

**Trade-off:** Model loading takes 3–8 seconds on first load. Mitigated with a loading screen and pre-loading on the exercise library page.

---

## 2. Exercise Logic is Client-Side

**Decision:** Angle calculation, rep counting, and form scoring all run in `lib/exerciseEngine.ts` on the frontend.

**Why:**
- These computations depend on MediaPipe landmarks which are already in the browser
- Sending landmarks to the backend for processing would add latency and defeat real-time feedback
- The math is simple (angle between 3 points, threshold comparison) — no need for server compute

**What the backend receives:** Only the **session summary** (total reps, avg angle, form score, duration) — never raw landmarks.

---

## 3. No Authentication for V1

**Decision:** No OAuth, no JWT, no login screen. Users are selected via a dropdown.

**Why:**
- Saves **2+ hours** of development time (OAuth flows, token management, protected routes)
- This is a **demo/hackathon** product — not a production system
- User context is maintained via React Context with a `selectedUserId`
- All API calls include `user_id` in the request body or URL params

**How it works:**
- Navbar has a user-select dropdown populated from `GET /api/users`
- Selected user ID is stored in `UserContext`
- All API requests include this user ID

---

## 4. REST over WebSocket

**Decision:** All frontend ↔ backend communication uses standard REST (HTTP).

**Why:**
- We send **session summaries**, not frame-by-frame data — no streaming needed
- REST is simpler to implement, test, and debug
- No persistent connection management required
- The data flow is request/response, not bidirectional streaming

**When WebSocket would be needed:** If we were sending raw MediaPipe landmarks to the backend in real-time (which we are not).

---

## 5. Gemini Feedback is Async

**Decision:** When a session is POSTed, the backend starts Gemini generation but returns a `feedback_id` immediately. Frontend polls for the result.

**Why:**
- Gemini API calls take 2–5 seconds — blocking the POST response would feel slow
- The user sees their session results immediately while feedback generates in the background
- If Gemini fails or is slow, the session data is already saved
- Frontend shows a `FeedbackLoader` component with a retry mechanism

**Flow:**
1. `POST /api/sessions` → returns `201` with `feedback_id`
2. Backend triggers Gemini in the same request (sync in V1, can be made async later)
3. Frontend navigates to results page → `GET /api/feedback/{session_id}`
4. If feedback isn't ready → `202 Accepted` with retry message
5. Frontend polls every 2 seconds until `200 OK`

**Implementation note (2026-04-04):**
In V1 Gemini is called synchronously inside `session_service.create_session()` and
`game_service.create_game_session()` — it completes before `201` is returned. The
`202` state in `GET /api/feedback/{session_id}` therefore only fires if both Gemini
AND the `ai_feedback` DB insert silently fail. The async architecture is preserved
for V2 (e.g. background tasks / queues) without any API contract change.

---

## 6. Single Supabase Database (No Caches or Queues)

**Decision:** One PostgreSQL database via Supabase for all data storage. No Redis, no message queues.

**Why:**
- Hackathon scale: ~100 sessions max during demo
- No concurrent users in practice
- Supabase free tier is more than sufficient
- Adding Redis/queues would add complexity without benefit at this scale

---

## 7. Backend is a Thin API Layer

**Decision:** FastAPI serves as a thin orchestration layer — it doesn't do heavy computation.

**Responsibilities:**
- Validate incoming data (Pydantic)
- Read/write to Supabase
- Build Gemini prompts from session data + history
- Parse Gemini responses
- Return aggregated progress data

**Not responsible for:**
- Pose tracking or angle math (frontend)
- Game logic or scoring (frontend)
- Video/image processing (none)

---

## 8. Chrome-Only Browser Support

**Decision:** Development and testing targets Chrome only.

**Why:**
- MediaPipe has best support on Chrome
- Webcam APIs are most stable on Chrome
- Limited testing time — can't QA across browsers
- A "Use Chrome for best experience" notice is added for other browsers

---

## 9. No Mobile Responsive Design

**Decision:** Desktop/laptop viewport only. No media queries for phone screens.

**Why:**
- Webcam-based exercises are intended for laptop/desktop use
- Responsive design would add significant development time
- Demo will be on a laptop screen

---

## 10. Fallback Feedback When Gemini Fails

**Decision:** If Gemini API is unavailable or errors out, the backend returns hardcoded fallback feedback.

**Why:**
- Demo cannot break due to API quota or network issues
- Fallback is generic but encouraging: "Great session! Keep up your exercises."
- Logged as a warning so we know it happened

**Implementation:** `gemini_service.py` wraps the API call in a try/except and returns a static feedback object on failure.

**Implementation detail (2026-04-04):**
Two fallback constants are defined at module level in `gemini_service.py`:
`_FALLBACK_EXERCISE` and `_FALLBACK_GAME`. Both include all required fields
(`summary`, `tips`, `encouragement`, `focus_areas`, `recovery_score`). The
`try/except` catches ALL exceptions — including JSON parse errors, missing keys,
and Gemini SDK errors — then logs a `WARNING` and returns the appropriate constant.
`recovery_score` is also clamped to `1–10` post-parse to guard against model drift.

---

## 11. Settings Loaded via `pydantic-settings` (not `os.getenv`)

**Decision:** `app/config/settings.py` uses `pydantic_settings.BaseSettings` to load
environment variables, wrapped in `@lru_cache()`.

**Why:**
- Missing env vars raise a clear `ValidationError` at startup — fail fast rather than
  producing a cryptic `None`-related error deep in a request.
- `@lru_cache()` makes `get_settings()` safe to call repeatedly across modules with
  no performance cost (settings only parsed once per process).
- `pydantic-settings` added to `requirements.txt`.

---

## 12. Progress Aggregation is Python-Side (Not SQL)

**Decision:** `progress_service.get_progress()` fetches all exercise/game sessions for
a user and aggregates (streak, totals, daily groupings, body-part breakdown) in Python,
not via SQL GROUP BY / window functions.

**Why:**
- Hackathon scale: maximum ~100 sessions per demo user — Python aggregation is
  effectively instant.
- Avoids raw SQL strings or ORM complexity.
- Easier to read, debug, and extend.
- Streak logic (`_compute_streak`) and date grouping are trivial in Python but would
  require verbose SQL window functions or CTEs.

**Trade-off:** Does not scale beyond ~10k sessions. Acceptable for V1; revisit if
deployed to real patients.

---

## 13. Gemini SDK: `google-genai` (not `google-generativeai`)

**Decision:** Use `google-genai` (`from google import genai`) and `genai.Client` for all
Gemini API calls. Model: `gemini-2.5-flash`.

**Why:**
- `google-generativeai` is the old deprecated SDK. `google-genai` is the current official
  package.
- Model `gemini-pro` was sunset and returns a 404 model-not-found error at runtime,
  causing every feedback call to fall back to static responses.
- `gemini-2.5-flash` is the latest available model on the free tier as of 2026-04-04.

**Call pattern:**
```python
client = genai.Client(api_key=settings.gemini_api_key)
response = client.models.generate_content(model=_MODEL, contents=prompt)
```

**If the model name needs updating:** change `_MODEL` in `gemini_service.py` — one place,
affects both exercise and game feedback generation.

---

## 14. Feedback Lookup Filters by Both `session_id` AND `session_type`

**Decision:** `feedback_service.get_feedback(session_id, session_type)` filters
`ai_feedback` on both columns.

**Why:**
- The `ai_feedback` schema uses a polymorphic FK: `session_id` can point to either
  `exercise_sessions` or `game_sessions`, disambiguated by `session_type`.
- Filtering only by `session_id` creates a theoretical collision risk and ignores the
  intent of the polymorphic design.
- The contract already requires `session_type` as a query param — it should be used.

---

## 15. `settings.py` Resolves `.env` Relative to File Location (Not `cwd`)

**Decision:** `_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"` — the env file
path is anchored to `settings.py`'s own location, not the process working directory.

**Why:**
- `env_file = ".env"` (relative path) only works when uvicorn is started from `backend/`.
  Starting from the repo root or any other directory silently loads no env vars.
- Anchoring to `__file__` always resolves to `backend/.env` regardless of invocation
  directory.

**Impact:** `uvicorn app.main:app --reload` now works correctly from any directory.
