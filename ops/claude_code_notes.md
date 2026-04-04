# Claude Code / Cursor AI — Operating Rules

> Read this BEFORE writing any code. These rules are non-negotiable.

---

## Mandatory Pre-Read

Before implementing any feature, read these context files **in order**:

1. `context/architecture.md` — understand the system
2. `context/api_contract.md` — know the exact API shapes
3. `context/schema.md` — know the database tables and relationships
4. `schema.sql` (repo root) — canonical DDL + seed data (run this in Supabase)
5. `context/file_mapping.md` — know where to write code
6. `context/decisions.md` — understand why things are the way they are

**Also read before touching any existing backend file:**

6. `backend/BACKEND_AUDIT.md` — full record of what has been implemented, how each file works, and notable decisions made during implementation. Read this to avoid re-implementing or conflicting with existing logic.

---

## Hard Rules

### 1. Never Break the API Contract

- The API contract in `context/api_contract.md` is **LOCKED**
- Request and response shapes must match **exactly**
- Field names, types, and nesting must be identical
- If you think the contract needs changing, **stop and ask** — do not modify it unilaterally
- Both frontend and backend must implement to the same contract

### 2. Respect the File Structure

- Check `context/file_mapping.md` before creating any new file
- Files go in their designated locations — no ad-hoc directories
- Components belong in `frontend/src/components/{category}/`
- Services belong in `backend/app/services/`
- Routers belong in `backend/app/routers/`
- Never put business logic in routers — routers call services

### 3. Frontend Rules

- MediaPipe and exercise logic are **client-side only** — never move to backend
- Use `"use client"` for components that use browser APIs (webcam, MediaPipe)
- State management: `useState`, `useRef`, `useContext` only — no Redux, no Zustand
- API calls go through `lib/api.ts` — never call `fetch` directly from components
- Pose landmarks use `useRef` (too fast for React re-renders)

### 4. Backend Rules

- Every router function must call a corresponding service function
- Pydantic models define all request/response shapes — no raw dicts
- All Supabase calls go through `db/supabase_client.py`
- Gemini calls go through `services/gemini_service.py` with try/except and fallback
- Return hardcoded fallback feedback if Gemini fails — never let the demo break
- Settings loaded via `get_settings()` from `app/config/settings.py` — never use `os.getenv` directly
- Exercise models live in `backend/app/models/exercise_models.py` (not in `session_models.py`)
- Gemini SDK is `google-genai` (`from google import genai`) — do NOT use `google-generativeai` (deprecated)
- Gemini model is `gemini-2.5-flash` — stored as `_MODEL` constant in `gemini_service.py`
- `feedback_service.get_feedback()` requires both `session_id` and `session_type` — always pass both

### 5. Data Rules

- All IDs are UUID v4
- Timestamps are `timestamptz` (ISO 8601 with timezone)
- Float columns are `double precision` in PostgreSQL, `float` in Python/Pydantic, JSON numbers in API
- `form_score` is always 0.0 – 1.0
- `recovery_score` is always 1 – 10
- `game_type` is always one of: `"memory"`, `"reaction"`, `"pattern"`
- `session_type` is always one of: `"exercise"`, `"game"`
- All FK references use `ON DELETE CASCADE` — see `schema.sql`

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Adding auth middleware | No auth in V1 — user ID comes from request body/params |
| Creating a new state management library | Use React built-ins: `useState`, `useRef`, `useContext` |
| Sending landmarks to the backend | Only send **session summaries** (reps, angles, score) |
| Blocking POST response for Gemini | Return `feedback_id` immediately, let frontend poll |
| Using raw SQL | Use Supabase client methods |
| Adding new API endpoints not in contract | Ask first — contract is frozen |
| Hardcoding user IDs | Get from `UserContext` (frontend) or request params (backend) |
| Skipping error handling on Gemini | Always wrap in try/except with fallback response |
| Using `os.getenv` directly | Import `get_settings()` from `app/config/settings.py` |
| Adding SQL GROUP BY for aggregation | Python-side aggregation is correct for V1 scale (see decision 12) |
| Importing Supabase client directly | Always call `get_supabase()` from `db/supabase_client.py` |
| Using `google-generativeai` or `import google.generativeai` | Use `google-genai`: `from google import genai` (see decision 13) |
| Using model name `gemini-pro` | Use `_MODEL = "gemini-2.5-flash"` in `gemini_service.py` |
| Calling `feedback_service.get_feedback(session_id)` with one arg | Signature is `get_feedback(session_id, session_type)` — always pass both |

---

## When You're Unsure

1. Re-read the relevant context file
2. Check `context/decisions.md` for rationale
3. Check `context/api_contract.md` for exact shapes
4. If still unsure, **ask** rather than assume

---

## Code Quality Expectations

- TypeScript: strict types, no `any` unless absolutely necessary
- Python: type hints on all function signatures
- Descriptive variable names (not `x`, `data`, `result`)
- Comments only where the **why** isn't obvious — don't comment the what
- Error messages should be user-friendly (shown on screen), not developer jargon

---

## Testing Approach (V1)

- No unit tests (hackathon mode)
- Test manually by running the full flow
- Backend: use Swagger UI at `http://localhost:8000/docs`
- Frontend: click through every page + exercise + game
- Verify API calls in browser Network tab
