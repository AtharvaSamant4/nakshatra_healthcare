# API Contract (current backend)

> **Base URL:** `http://localhost:8000`  
> **Prefix:** all routes below include `/api`.  
> **IDs:** UUID strings. Path params use FastAPI `UUID` validation — **invalid UUID strings may yield 500** from uncaught DB/PostgREST errors; treat as known edge case.

**Standard error JSON (HTTPException):** `{ "detail": string | …, "status_code": number }`  
**Validation (422):** FastAPI default `detail` is often a **list** of field errors.

---

## Core — Users (legacy path; table is `patients` after migration)

| Method | Path | Request | Response (success) |
|--------|------|---------|----------------------|
| POST | `/api/users` | `{ name, email?, age?, condition_notes? }` | `201` UserResponse: id, name, email?, age?, condition_notes?, created_at |
| GET | `/api/users` | — | `200` `[{ id, name, created_at }]` |
| GET | `/api/users/{user_id}` | — | `200` full user row shape |

---

## Core — Exercises

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/exercises` | Query: `body_part?`, `difficulty?` | `200` array of exercise catalog objects |
| GET | `/api/exercises/{exercise_id}` | — | `200` single exercise |

---

## Core — Exercise sessions

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/sessions` | `{ user_id, exercise_id, reps_completed, avg_angle?, min_angle?, max_angle?, form_score?, duration_seconds?, angle_history?, started_at, completed_at, prescription_id? }` | `201` session row + `feedback_id` |
| GET | `/api/sessions` | Query: `user_id` (required), `limit?`, `offset?` | `200` `{ sessions: [...], total }` |
| GET | `/api/sessions/{session_id}` | — | `200` `SessionDetail` (incl. exercise metadata where joined) |

**Notes:** `user_id` = patient UUID. Backend may retry insert without `prescription_id` if column missing (migration safety).

---

## Core — Game sessions

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/game-sessions` | `{ user_id, game_type, score, accuracy?, avg_reaction_ms?, level_reached?, duration_seconds?, game_metadata? }` | `201` + `feedback_id` |
| GET | `/api/game-sessions` | Query: `user_id` (required), `game_type?`, `limit?` | `200` `{ sessions, total }` |

`game_type`: `memory` \| `reaction` \| `pattern`.

---

## Core — Progress

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/progress/{user_id}` | — | `200` dashboard aggregate: summary, exercise_progress[], game_progress[], recent_feedback[], body_part_breakdown[] |
| GET | `/api/progress/{user_id}/exercise-trend` | Query: `days?`, `exercise_id?` | `200` `{ trend: [...] }` |

---

## Core — Feedback

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/feedback/{session_id}` | Query: `session_type` = `exercise` \| `game` | `200` feedback object, or `202` `{ status: "processing", message }` when row missing (router maps some 404s to 202) |

---

## V2 — Patients

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/patients` | `{ name, age?, phone?, email?, doctor_id?, emergency?, condition_notes? }` | `201` id, name, status?, doctor_id?, created_at |
| GET | `/api/patients` | Query: `doctor_id?`, `status?` | `200` list of list items (id, name, status?, doctor_id?, injury_type?, severity?) |
| GET | `/api/patients/{patient_id}` | — | `200` full patient |
| PATCH | `/api/patients/{patient_id}` | partial clinical/admin fields | `200` full patient |

**503** possible when `patients` table unavailable (pre-migration guards in service).

---

## V2 — Staff

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/staff` | `{ name, role, email?, specialization? }` | `201` staff member |
| GET | `/api/staff` | Query: `role?` | `200` list |
| GET | `/api/staff/{staff_id}` | — | `200` staff member |

**503** if `staff` table missing.

---

## V2 — Prescriptions

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/prescriptions` | `{ patient_id, doctor_id, exercise_id?, game_type?, target_reps?, target_sets?, frequency?, priority?, notes? }` | `201` id, patient_id, exercise_id?, status, created_at |
| GET | `/api/prescriptions` | Query: `patient_id` (required) | `200` list items + embedded `compliance` |
| PATCH | `/api/prescriptions/{prescription_id}` | partial updates (status, targets, frequency, priority, notes) | `200` updated row dict |

---

## V2 — Messages

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/messages` | `{ patient_id, sender_type: "patient"\|"doctor", sender_id, content }` | `201` message row |
| GET | `/api/messages` | Query: `patient_id` (required), `limit?` | `200` `{ messages: [{ id, sender_type, sender_name?, content, created_at }] }` |

---

## Frontend client

`frontend/lib/api.ts` mirrors these paths. Doctor dashboard uses `GET /api/patients` without query and filters by `doctor_id` in the browser (with fallback to full list for demo stability).
