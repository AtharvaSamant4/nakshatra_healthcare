# File Mapping (V2)

> Routes use **`frontend/app`** (App Router). API calls go through **`frontend/lib/api.ts`**. Backend entry: **`backend/app/main.py`**.

---

## Role & hospital workflow

| Feature | Frontend | Backend |
|--------|----------|---------|
| Role + identity picker (`/`) | `frontend/app/page.tsx` — `staffApi.list`, `patientsApi.list`, `useApp().setSession` | `GET /api/staff`, `GET /api/patients` |
| Session persistence | `frontend/lib/app-context.tsx` — `sessionStorage` key `rehab_v2_session` | — |
| Reception — register patient | `frontend/app/reception/page.tsx` — `POST /api/patients`, doctor dropdown from staff | `routers/patients.py`, `services/patient_service.py` |
| Doctor — patient list | `frontend/app/doctor/page.tsx` — list + client filter by `doctor_id` + fallback | `GET /api/patients` |
| Doctor — chart / Rx | `frontend/app/doctor/[patientId]/page.tsx` — `patientsApi.get/update`, `prescriptionsApi.*` | `patients`, `prescriptions` routers |
| Doctor — messages | `frontend/app/doctor/[patientId]/messages/page.tsx` | `routers/messages.py` |
| Patient — hub | `frontend/app/patient/page.tsx` | progress, navigation |
| Patient — exercise | `frontend/app/patient/exercise/page.tsx` | `sessionsApi`, `exercisesApi` |
| Patient — games | `frontend/app/patient/games/page.tsx` | `gameSessionsApi` |
| Patient — messages | `frontend/app/patient/messages/page.tsx` | `messagesApi` |

---

## Legacy / shared rehab pages (still in tree)

| Route | File | Notes |
|-------|------|--------|
| `/exercise` | `frontend/app/exercise/page.tsx` | Exercise flow (not under `/patient` prefix) |
| `/games` | `frontend/app/games/page.tsx` | Games hub |
| `/results` | `frontend/app/results/page.tsx` | Progress / results UI |

---

## Core API ↔ backend modules

| Endpoint prefix | Router | Service (typical) |
|-----------------|--------|-------------------|
| `/api/users` | `backend/app/routers/users.py` | `user_service` → `patients` table post-migration |
| `/api/exercises` | `routers/exercises.py` | `exercise_service.py` |
| `/api/sessions` | `routers/sessions.py` | `session_service.py` |
| `/api/game-sessions` | `routers/games.py` | `game_service.py` |
| `/api/progress` | `routers/progress.py` | `progress_service.py` |
| `/api/feedback` | `routers/feedback.py` | `feedback_service.py` + `gemini_service.py` |

---

## V2 API ↔ backend modules

| Endpoint prefix | Router | Service (typical) |
|-----------------|--------|-------------------|
| `/api/staff` | `routers/staff.py` | `staff_service.py` |
| `/api/patients` | `routers/patients.py` | `patient_service.py` |
| `/api/prescriptions` | `routers/prescriptions.py` | `prescription_service.py` |
| `/api/messages` | `routers/messages.py` | `message_service.py` |

---

## Shared UI & infra

| Concern | Location |
|---------|----------|
| Root layout + `AppProvider` | `frontend/app/layout.tsx` |
| shadcn-style primitives | `frontend/components/ui/*` |
| Exercise components | `frontend/components/exercise/*` |
| Games components | `frontend/components/games/*` |
| Dashboard components | `frontend/components/dashboard/*` |
| App shell / nav | `frontend/components/app-layout.tsx`, `navbar.tsx` |
| Env / Supabase | `backend/app/config/settings.py`, `backend/app/db/supabase_client.py` |
| DDL | `schema.sql`, `migration_v2.sql` (repo root) |

---

## Pydantic / types

| Backend | Frontend |
|---------|----------|
| `backend/app/models/*.py` | `frontend/lib/api.ts` interfaces |

For residual contract/UI mismatches, see `context/known_integration_gaps.md`.
