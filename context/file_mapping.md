# File Mapping

> Feature → File mapping for the entire system.
> Use this to find where to implement or debug a specific feature.

---

## Exercise Flow

| Step | File(s) |
|---|---|
| Exercise library page | `frontend/src/app/exercises/page.tsx` |
| Exercise card component | `frontend/src/components/exercises/ExerciseCard.tsx` |
| Live exercise session | `frontend/src/app/exercises/[id]/start/page.tsx` |
| Webcam + MediaPipe init | `frontend/src/components/exercises/WebcamFeed.tsx` |
| Skeleton overlay | `frontend/src/components/exercises/PoseCanvas.tsx` |
| Rep counter display | `frontend/src/components/exercises/RepCounter.tsx` |
| Form quality indicator | `frontend/src/components/exercises/FormIndicator.tsx` |
| Angle calc + rep logic | `frontend/src/lib/exerciseEngine.ts` |
| MediaPipe configuration | `frontend/src/lib/mediapipe.ts` |
| Exercise definitions | `frontend/src/lib/exercises.ts` |
| Session results page | `frontend/src/app/exercises/[id]/results/page.tsx` |
| Session summary component | `frontend/src/components/exercises/SessionSummary.tsx` |
| Save session (API call) | `frontend/src/lib/api.ts` → `POST /api/sessions` |
| Sessions API router | `backend/app/routers/sessions.py` |
| Session service logic | `backend/app/services/session_service.py` |
| Session Pydantic models | `backend/app/models/session_models.py` |

---

## Cognitive Games Flow

| Step | File(s) |
|---|---|
| Games hub page | `frontend/src/app/games/page.tsx` |
| Game card component | `frontend/src/components/games/GameCard.tsx` |
| Memory game | `frontend/src/app/games/memory/page.tsx` + `frontend/src/components/games/MemoryGame.tsx` |
| Reaction game | `frontend/src/app/games/reaction/page.tsx` + `frontend/src/components/games/ReactionGame.tsx` |
| Pattern game | `frontend/src/app/games/pattern/page.tsx` + `frontend/src/components/games/PatternGame.tsx` |
| Game results page | `frontend/src/app/games/[type]/results/page.tsx` |
| Game result component | `frontend/src/components/games/GameResult.tsx` |
| Save game session | `frontend/src/lib/api.ts` → `POST /api/game-sessions` |
| Games API router | `backend/app/routers/games.py` |
| Game service logic | `backend/app/services/game_service.py` |
| Game Pydantic models | `backend/app/models/game_models.py` |

---

## AI Feedback Flow

| Step | File(s) |
|---|---|
| Feedback display card | `frontend/src/components/feedback/AIFeedbackCard.tsx` |
| Feedback loading state | `frontend/src/components/feedback/FeedbackLoader.tsx` |
| Fetch feedback | `frontend/src/lib/api.ts` → `GET /api/feedback/{session_id}` |
| Feedback API router | `backend/app/routers/feedback.py` |
| Feedback service | `backend/app/services/feedback_service.py` |
| Gemini API integration | `backend/app/services/gemini_service.py` |
| Feedback Pydantic models | `backend/app/models/feedback_models.py` |

---

## Dashboard / Progress Flow

| Step | File(s) |
|---|---|
| Dashboard page | `frontend/src/app/dashboard/page.tsx` |
| Progress chart | `frontend/src/components/dashboard/ProgressChart.tsx` |
| Recent sessions list | `frontend/src/components/dashboard/RecentSessions.tsx` |
| AI insight card | `frontend/src/components/dashboard/InsightCard.tsx` |
| Stat card (single metric) | `frontend/src/components/dashboard/StatCard.tsx` |
| Fetch dashboard data | `frontend/src/lib/api.ts` → `GET /api/progress/{user_id}` |
| Fetch exercise trend | `frontend/src/lib/api.ts` → `GET /api/progress/{user_id}/exercise-trend` |
| Progress API router | `backend/app/routers/progress.py` |
| Progress service | `backend/app/services/progress_service.py` |
| Progress Pydantic models | `backend/app/models/progress_models.py` |

---

## User Management Flow

| Step | File(s) |
|---|---|
| Profile page | `frontend/src/app/profile/page.tsx` |
| User context provider | `frontend/src/context/UserContext.tsx` |
| User select (navbar) | `frontend/src/components/layout/Navbar.tsx` |
| Fetch/create users | `frontend/src/lib/api.ts` → `GET/POST /api/users` |
| Users API router | `backend/app/routers/users.py` |
| User service | `backend/app/services/user_service.py` |
| User Pydantic models | `backend/app/models/user_models.py` |

---

## Shared / Layout

| Component | File |
|---|---|
| Root layout | `frontend/src/app/layout.tsx` |
| Global styles | `frontend/src/app/globals.css` |
| Home / redirect | `frontend/src/app/page.tsx` |
| Navbar | `frontend/src/components/layout/Navbar.tsx` |
| Sidebar (optional) | `frontend/src/components/layout/Sidebar.tsx` |
| Page wrapper | `frontend/src/components/layout/PageWrapper.tsx` |
| Shared Button | `frontend/src/components/shared/Button.tsx` |
| Shared Card | `frontend/src/components/shared/Card.tsx` |
| Shared Modal | `frontend/src/components/shared/Modal.tsx` |
| Loading spinner | `frontend/src/components/shared/LoadingSpinner.tsx` |
| Empty state | `frontend/src/components/shared/EmptyState.tsx` |
| TypeScript types | `frontend/src/types/index.ts` |
| API client wrapper | `frontend/src/lib/api.ts` |
| Utility helpers | `frontend/src/lib/utils.ts` |

---

## Backend Infrastructure

| Component | File |
|---|---|
| FastAPI app entry | `backend/app/main.py` |
| Supabase client | `backend/app/db/supabase_client.py` |
| Config / env vars | `backend/app/config/settings.py` |
| Exercise seed data | `backend/seed/exercises.json` |
| Dependencies | `backend/requirements.txt` |
| Backend env vars | `backend/.env` |
