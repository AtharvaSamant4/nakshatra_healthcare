# Known Integration Gaps (living document)

> Populated by the **2026-04-04 pre-integration audit**. Tracks mismatches between contract, docs, and the current repo **without** prescribing code fixes here.

| Area | Issue |
|---|---|
| **Users** | No UI uses `POST /api/users`. Fresh Supabase ⇒ empty `users` ⇒ `selectedUserId` null ⇒ dashboard/exercise/games skip API writes. |
| **Feedback poll** | `feedbackApi.get` + `GET /api/feedback/{session_id}` are implemented but not used after session create; `feedback_id` on `POST` responses is mostly unused. |
| **Async narrative** | Docs describe async Gemini + poll; `session_service` / `game_service` **await** Gemini and insert feedback **before** returning `201` (synchronous path). |
| **Feedback 404 → 202** | Router maps any `get_feedback` 404 to `202 processing`, including wrong `session_type` or invalid id — not distinguishable from “still generating”. |
| **Exercise seed URLs** | `schema.sql` uses `thumbnail_url` under `/images/exercises/...`; `backend/seed/exercises.json` uses `/images/....png` (no `exercises/` segment). Align before relying on JSON import. |
| **Pattern game** | API allows `game_type: "pattern"`; frontend games page has Memory + Reaction only. |
| **GET session by id** | Backend implements `GET /api/sessions/{session_id}`; `frontend/lib/api.ts` has no `sessionsApi.get` wrapper. |
| **Progress trend** | Backend implements `GET /api/progress/{user_id}/exercise-trend`; charts use `exercise_progress` from main progress payload, not `progressApi.trend`. |
| **Validation errors** | FastAPI `422` responses use `detail` as a list of objects; locked contract error example shows `detail` as a string + `status_code`. |
| **Results “Avg Accuracy”** | `frontend/app/results/page.tsx` labels a card “Avg Accuracy” but binds `progress.summary.avg_form_score` (exercise form, not game accuracy). |
| **Memory game → API** | `POST` omits `accuracy` / `level_reached`; contract allows null — OK. Game stats UI computes averages from `accuracy` which may be null for all rows. |
| **CORS** | `allow_origins` is only `http://localhost:3000`; other origins fail until extended. |
