# File Mapping

> Feature → File mapping for the entire system.  
> **Paths below match the current repo layout** (`frontend/app`, `frontend/lib`, `frontend/components`).

---

## Exercise Flow

| Step | File(s) |
|---|---|
| Dashboard (also home `/`) | `frontend/app/page.tsx` |
| Live exercise session | `frontend/app/exercise/page.tsx` |
| Webcam surface | `frontend/components/exercise/webcam-feed.tsx` |
| Session controls + rep UI | `frontend/components/exercise/exercise-controls.tsx` |
| Post-session summary card | `frontend/components/exercise/session-summary.tsx` |
| Save session (API) | `frontend/lib/api.ts` → `sessionsApi.create` → `POST /api/sessions` |
| Sessions API router | `backend/app/routers/sessions.py` |
| Session service logic | `backend/app/services/session_service.py` |
| Session Pydantic models | `backend/app/models/session_models.py` |

> **See also:** `context/known_integration_gaps.md` for contract/UI/backend drift (users bootstrap, feedback polling, pattern game, etc.).

---

## Cognitive Games Flow

| Step | File(s) |
|---|---|
| Games hub (Memory + Reaction tabs) | `frontend/app/games/page.tsx` |
| Memory game | `frontend/components/games/memory-game.tsx` |
| Reaction game | `frontend/components/games/reaction-game.tsx` |
| Save game session | `frontend/lib/api.ts` → `gameSessionsApi.create` → `POST /api/game-sessions` |
| Games API router | `backend/app/routers/games.py` |
| Game service logic | `backend/app/services/game_service.py` |
| Game Pydantic models | `backend/app/models/game_models.py` |

> **Contract vs UI:** API supports `game_type: "pattern"`; current UI does not expose a Pattern game.

---

## AI Feedback Flow

| Step | File(s) |
|---|---|
| Recent feedback on dashboard | `frontend/components/dashboard/ai-insights.tsx` (data from `GET /api/progress/{user_id}`) |
| Recent feedback on results | `frontend/components/results/ai-feedback.tsx` (same source) |
| Fetch feedback by session | `frontend/lib/api.ts` → `feedbackApi.get` → `GET /api/feedback/{session_id}?session_type=` |
| Feedback API router | `backend/app/routers/feedback.py` |
| Feedback service | `backend/app/services/feedback_service.py` |
| Gemini integration | `backend/app/services/gemini_service.py` |
| Feedback models | `backend/app/models/feedback_models.py` |

> **Gap:** `feedbackApi` exists but is **not** wired from exercise/game completion UI; `feedback_id` from `POST` responses is largely unused. Dashboard/results show **aggregated** `recent_feedback` from progress, not per-session poll.

---

## Dashboard / Progress Flow

| Step | File(s) |
|---|---|
| Dashboard | `frontend/app/page.tsx` |
| Progress chart | `frontend/components/dashboard/progress-chart.tsx` |
| Recent sessions | `frontend/components/dashboard/recent-sessions.tsx` |
| Stats cards | `frontend/components/dashboard/stats-card.tsx` |
| Results overview | `frontend/app/results/page.tsx` |
| Weekly-style chart (uses `exercise_progress` dates) | `frontend/components/results/weekly-chart.tsx` |
| Fetch dashboard aggregate | `frontend/lib/api.ts` → `progressApi.get` → `GET /api/progress/{user_id}` |
| Exercise trend (optional charts) | `frontend/lib/api.ts` → `progressApi.trend` → `GET /api/progress/{user_id}/exercise-trend` (**not used by current chart components**) |
| Progress router | `backend/app/routers/progress.py` |
| Progress service | `backend/app/services/progress_service.py` |

---

## User Management Flow

| Step | File(s) |
|---|---|
| User context + bootstrap list | `frontend/lib/user-context.tsx` → `usersApi.list()` |
| User switcher | `frontend/components/navbar.tsx` |
| Create user API (contract) | `frontend/lib/api.ts` → `usersApi.create` → `POST /api/users` |
| Users router / service | `backend/app/routers/users.py`, `backend/app/services/user_service.py` |

> **Gap:** No page or flow calls `usersApi.create`. Empty `users` table ⇒ `selectedUserId` stays `null` ⇒ most API-backed features never fire.

---

## Shared / Layout

| Component | File |
|---|---|
| Root layout + `UserProvider` | `frontend/app/layout.tsx` |
| Global styles | `frontend/app/globals.css` |
| App shell + navbar | `frontend/components/app-layout.tsx` |
| API client + types | `frontend/lib/api.ts` |
| Utilities | `frontend/lib/utils.ts` |
| Legacy mock exports (unused) | `frontend/lib/mock-data.ts` |

---

## Backend Infrastructure

| Component | File |
|---|---|
| FastAPI entry | `backend/app/main.py` |
| Supabase client | `backend/app/db/supabase_client.py` |
| Settings / env | `backend/app/config/settings.py` |
| Canonical DDL + seed | `schema.sql` (repo root) |
| JSON exercise seed (optional import) | `backend/seed/exercises.json` |
| Dependencies | `backend/requirements.txt` |

---

## Backend Models (Pydantic)

| File | Classes |
|---|---|
| `user_models.py` | `UserCreate`, `UserResponse`, `UserListItem` |
| `exercise_models.py` | `AngleConfig`, `ExerciseResponse` |
| `session_models.py` | `AngleHistoryItem`, `SessionCreate`, `SessionCreateResponse`, `SessionDetail`, `SessionListItem`, `SessionListResponse` |
| `game_models.py` | `GameSessionCreate`, `GameSessionCreateResponse`, `GameSessionListItem`, `GameSessionListResponse` |
| `feedback_models.py` | `FeedbackResponse`, `FeedbackProcessing` |
| `progress_models.py` | `ProgressSummary`, `ExerciseProgressDay`, `GameProgressDay`, `RecentFeedbackItem`, `BodyPartBreakdownItem`, `ProgressResponse`, `ExerciseTrendDay`, `ExerciseTrendResponse` |
