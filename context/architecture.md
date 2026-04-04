# Architecture Overview

> AI Rehabilitation System — Next.js + FastAPI + Supabase + Gemini API + MediaPipe.js

---

## System Summary

A web-based physiotherapy rehabilitation platform that uses **computer vision** (MediaPipe) to track patient exercises in real-time and **generative AI** (Gemini) to provide personalized recovery feedback. Includes cognitive rehab games alongside physical exercises.

---

## High-Level Flow

```
User opens app → Dashboard (progress overview)
       ↓
Starts exercise → Webcam activates → MediaPipe tracks pose (browser-side)
       ↓
Exercise engine counts reps, measures angles, scores form (all client-side)
       ↓
Session ends → Frontend POSTs summary to FastAPI
       ↓
FastAPI stores session in Supabase → Calls Gemini API with session + history
       ↓
Gemini returns structured feedback → Stored in Supabase
       ↓
Frontend fetches feedback → Displays on results page
```

Cognitive games follow the same pattern: play in browser → POST score → get AI feedback.

---

## Frontend Responsibilities (Next.js)

| Responsibility | Details |
|---|---|
| **UI rendering** | All pages, components, layouts via App Router |
| **Pose tracking** | MediaPipe.js runs entirely in-browser — no video leaves the device |
| **Exercise logic** | Angle calculation, rep counting, form scoring at 60fps in `lib/exerciseEngine.ts` |
| **Cognitive games** | Memory, Reaction, Pattern games — self-contained browser logic |
| **Game scoring** | Immediate score computation in game components |
| **API communication** | All calls via `lib/api.ts` using native `fetch` |
| **User context** | Lightweight React Context for selected user (no auth) |

### What does NOT happen in the frontend
- No data aggregation or trend computation
- No AI prompt building
- No direct database access

---

## Backend Responsibilities (FastAPI)

| Responsibility | Details |
|---|---|
| **REST API** | Thin API layer — receives summaries, serves aggregated data |
| **Data persistence** | All reads/writes to Supabase PostgreSQL |
| **AI orchestration** | Builds prompts from session data + history, calls Gemini API, parses responses |
| **Progress aggregation** | Computes streaks, totals, trends from stored sessions |
| **Feedback management** | Stores and retrieves AI-generated feedback |

### What does NOT happen in the backend
- No pose tracking or angle math
- No video/image processing
- No authentication or authorization (V1)
- No WebSocket connections

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────┐
│                BROWSER (Next.js)                 │
│                                                  │
│  Webcam → MediaPipe → Landmarks → ExerciseEngine │
│                                    ↓             │
│                              Rep count, angles,  │
│                              form score          │
│                                    ↓             │
│              Session summary (JSON) ─────────────┼──→ POST /api/sessions
│              Game results (JSON) ────────────────┼──→ POST /api/game-sessions
│                                                  │
│  Dashboard ←─────────────────────────────────────┼──← GET /api/progress/{user_id}
│  Results / dashboard ←───────────────────────────┼──← GET /api/progress/{user_id} (includes recent_feedback)
│  (Optional per-session poll) ←───────────────────┼──← GET /api/feedback/{session_id}
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│              SERVER (FastAPI)                     │
│                                                  │
│  Routers → Services → Supabase (read/write)      │
│                    → Gemini API (prompt/response) │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│           SUPABASE (PostgreSQL)                   │
│                                                  │
│  users · exercises · exercise_sessions           │
│  game_sessions · ai_feedback                     │
│  (see schema.sql for DDL + seed data)            │
└──────────────────────────────────────────────────┘
```

---

## Key Constraints

- **No video upload** — only landmark summaries leave the browser
- **No WebSocket** — REST is sufficient for summary-based communication
- **No auth for V1** — user-select dropdown, no OAuth/JWT
- **Single database** — no caches, queues, or secondary stores
- **Chrome-only** — MediaPipe tested on Chrome; other browsers are best-effort
- **Schema source of truth** — `schema.sql` (repo root) is the canonical DDL; `context/schema.md` documents fields and relationships

---

## Implementation notes (current repo, 2026-04-04)

These points correct common doc drift; see `context/known_integration_gaps.md` for the full list.

| Topic | Documented target | Current behavior |
|---|---|---|
| **Frontend paths** | Older docs referred to `frontend/src/...` | App Router lives under **`frontend/app/`**; shared code under **`frontend/lib/`** and **`frontend/components/`**. |
| **Dashboard URL** | Some checklists mention `/dashboard` | **`/`** is the dashboard (`frontend/app/page.tsx`). |
| **Gemini timing** | “POST returns immediately; client polls feedback” | **`POST /api/sessions` and `POST /api/game-sessions` await** Gemini + DB insert of `ai_feedback` before responding; `feedback_id` is already valid in the `201` body. `GET /api/feedback` + `202` still exist for edge cases / router behavior. |
| **Pose pipeline** | MediaPipe + `exerciseEngine.ts` in-browser | Exercise page uses **simulated** reps/form for demo; full CV pipeline files are **not** wired in this layout. |
| **User bootstrap** | Dropdown selects user | **`GET /api/users` only**; there is **no** UI calling **`POST /api/users`**. Empty DB ⇒ no `selectedUserId` ⇒ most writes never run. |
