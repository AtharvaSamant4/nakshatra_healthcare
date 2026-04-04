# Architecture — Hospital Rehabilitation System (V2)

> Next.js (App Router) + FastAPI + Supabase (PostgreSQL) + Gemini (`google-genai`, `gemini-2.5-flash`).  
> **No real authentication:** role and identity are chosen on the home screen and stored in `sessionStorage` (`frontend/lib/app-context.tsx`).

---

## Workflow (who does what)

```
Reception  →  registers patient, optional doctor assign  →  POST /api/patients
Patient    →  exercises, games, messages (own thread)     →  /patient/* UI + core APIs
Doctor     →  patient list, detail, prescriptions, chat   →  /doctor/* UI + patients/prescriptions/messages
```

Monitoring and AI feedback use the same **session summary → FastAPI → Supabase → Gemini** path as V1; V2 adds **clinical context** on exercise sessions when `patients` rows expose `diagnosis` / `injury_type` / `severity`.

---

## Text diagram (data flow)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js)                                           │
│  Role gate: AppProvider → routes /, /reception, /doctor,    │
│  /patient/*                                                  │
│       │                                                      │
│       ├─► fetch → FastAPI /api/*  (JSON, UUID ids)            │
│       │                                                      │
│       └─► No direct DB; no WebSocket (REST + optional poll)  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (backend/app/main.py)                               │
│  Routers → services → Supabase client                        │
│  Sessions/games → gemini_service → store ai_feedback         │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                         │
│  patients, staff, prescriptions, messages, exercises,        │
│  exercise_sessions, game_sessions, ai_feedback               │
│  Bootstrap: schema.sql → migration_v2.sql (rename + V2 DDL)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend responsibilities

| Area | Implementation |
|------|----------------|
| Role selection | `frontend/app/page.tsx` loads staff + patients, `setSession(role, identity)` |
| Reception | `frontend/app/reception/page.tsx` — staff list, patient create |
| Doctor | `frontend/app/doctor/page.tsx` — patient list (client filter + fallback), detail, prescriptions UI |
| Patient | `frontend/app/patient/*` — dashboard, exercise, games, messages |
| API client | `frontend/lib/api.ts` |

---

## Backend responsibilities

| Area | Routers under `backend/app/routers/` |
|------|--------------------------------------|
| Legacy user API (same rows as patients post-migration) | `users.py` |
| Patients, staff, prescriptions, messages | `patients.py`, `staff.py`, `prescriptions.py`, `messages.py` |
| Rehab core | `exercises.py`, `sessions.py`, `games.py`, `progress.py`, `feedback.py` |

---

## Key constraints

- **Column name `user_id`** on `exercise_sessions`, `game_sessions`, `ai_feedback` = patient UUID (unchanged after `users` → `patients` rename).
- **CORS:** `http://localhost:3000` only (see `main.py`).
- **Gemini:** synchronous generation on session create in current services; fallback dicts on failure.

---

## Canonical schema sources

1. **`schema.sql`** (repo root) — initial tables + exercise seed.  
2. **`migration_v2.sql`** — `staff`, rename to `patients`, V2 columns, `prescriptions`, `messages`, `exercise_sessions.prescription_id`, indexes.

See `context/schema.md` for the logical model after migration.
