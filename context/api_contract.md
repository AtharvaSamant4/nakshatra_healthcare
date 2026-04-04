# API Contract

> [!IMPORTANT]
> These contracts are **LOCKED**. Frontend and backend developers must implement to this exact spec. Any changes require both parties to agree.

**Base URL**: `http://localhost:8000/api`
**Content-Type**: `application/json`
**ID format**: UUID v4 strings

---

## 1. Users

### `POST /api/users` — Create User

**Request Body:**
```json
{
  "name": "Athar Khan",
  "email": "athar@example.com",
  "age": 28,
  "condition_notes": "Right knee ACL recovery, 3 weeks post-op"
}
```

**Response** `201 Created`:
```json
{
  "id": "a1b2c3d4-...",
  "name": "Athar Khan",
  "email": "athar@example.com",
  "age": 28,
  "condition_notes": "Right knee ACL recovery, 3 weeks post-op",
  "created_at": "2026-04-04T05:30:00Z"
}
```

---

### `GET /api/users` — List All Users

**Response** `200 OK`:
```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Athar Khan",
    "created_at": "2026-04-04T05:30:00Z"
  }
]
```

---

### `GET /api/users/{user_id}` — Get User Profile

**Response** `200 OK`:
```json
{
  "id": "a1b2c3d4-...",
  "name": "Athar Khan",
  "email": "athar@example.com",
  "age": 28,
  "condition_notes": "Right knee ACL recovery, 3 weeks post-op",
  "created_at": "2026-04-04T05:30:00Z"
}
```

---

## 2. Exercises (Catalog)

### `GET /api/exercises` — List All Exercises

**Query Params** (optional):
- `body_part` — filter by body part (`shoulder`, `knee`, `elbow`, `hip`)
- `difficulty` — filter by difficulty (`beginner`, `intermediate`, `advanced`)

**Response** `200 OK`:
```json
[
  {
    "id": "e1f2a3b4-...",
    "name": "Shoulder Flexion",
    "description": "Raise your arm forward and upward",
    "body_part": "shoulder",
    "difficulty": "beginner",
    "angle_config": {
      "joint": "left_shoulder",
      "points": ["left_elbow", "left_shoulder", "left_hip"],
      "target_angle": 160,
      "threshold": 15
    },
    "instructions": "Stand with arms at your side. Slowly raise your arm forward...",
    "thumbnail_url": "/images/shoulder-flexion.png"
  }
]
```

---

### `GET /api/exercises/{exercise_id}` — Get Single Exercise

**Response** `200 OK`: Same shape as single item from list above.

---

## 3. Exercise Sessions

### `POST /api/sessions` — Save Exercise Session

**Request Body:**
```json
{
  "user_id": "a1b2c3d4-...",
  "exercise_id": "e1f2a3b4-...",
  "reps_completed": 12,
  "avg_angle": 148.5,
  "min_angle": 45.0,
  "max_angle": 162.3,
  "form_score": 0.85,
  "duration_seconds": 180,
  "angle_history": [
    { "rep": 1, "peak_angle": 155.2 },
    { "rep": 2, "peak_angle": 150.1 },
    { "rep": 3, "peak_angle": 148.7 }
  ],
  "started_at": "2026-04-04T05:30:00Z",
  "completed_at": "2026-04-04T05:33:00Z"
}
```

**Response** `201 Created`:
```json
{
  "id": "s1e2s3s4-...",
  "user_id": "a1b2c3d4-...",
  "exercise_id": "e1f2a3b4-...",
  "reps_completed": 12,
  "avg_angle": 148.5,
  "min_angle": 45.0,
  "max_angle": 162.3,
  "form_score": 0.85,
  "duration_seconds": 180,
  "started_at": "2026-04-04T05:30:00Z",
  "completed_at": "2026-04-04T05:33:00Z",
  "feedback_id": "f1e2e3d4-..."
}
```

> `feedback_id` is returned because the backend automatically triggers Gemini feedback generation on session creation. Frontend uses this ID to poll/fetch feedback.

---

### `GET /api/sessions/{session_id}` — Get Session Details

**Response** `200 OK`:
```json
{
  "id": "s1e2s3s4-...",
  "user_id": "a1b2c3d4-...",
  "exercise_id": "e1f2a3b4-...",
  "exercise_name": "Shoulder Flexion",
  "reps_completed": 12,
  "avg_angle": 148.5,
  "min_angle": 45.0,
  "max_angle": 162.3,
  "form_score": 0.85,
  "duration_seconds": 180,
  "angle_history": [...],
  "started_at": "2026-04-04T05:30:00Z",
  "completed_at": "2026-04-04T05:33:00Z"
}
```

---

### `GET /api/sessions?user_id={user_id}` — List User Sessions

**Query Params:**
- `user_id` (required) — UUID
- `limit` (optional, default `20`) — max results
- `offset` (optional, default `0`) — pagination

**Response** `200 OK`:
```json
{
  "sessions": [
    {
      "id": "s1e2s3s4-...",
      "exercise_name": "Shoulder Flexion",
      "reps_completed": 12,
      "form_score": 0.85,
      "duration_seconds": 180,
      "completed_at": "2026-04-04T05:33:00Z"
    }
  ],
  "total": 45
}
```

---

## 4. Game Sessions

### `POST /api/game-sessions` — Save Game Session

**Request Body:**
```json
{
  "user_id": "a1b2c3d4-...",
  "game_type": "memory",
  "score": 850,
  "accuracy": 0.92,
  "avg_reaction_ms": null,
  "level_reached": 5,
  "duration_seconds": 120,
  "game_metadata": {
    "pairs_matched": 12,
    "total_pairs": 15,
    "mismatches": 3
  }
}
```

**Response** `201 Created`:
```json
{
  "id": "g1a2m3e4-...",
  "user_id": "a1b2c3d4-...",
  "game_type": "memory",
  "score": 850,
  "accuracy": 0.92,
  "level_reached": 5,
  "duration_seconds": 120,
  "completed_at": "2026-04-04T06:00:00Z",
  "feedback_id": "f2e3e4d5-..."
}
```

---

### `GET /api/game-sessions?user_id={user_id}` — List Game Sessions

**Query Params:**
- `user_id` (required)
- `game_type` (optional) — `memory`, `reaction`, `pattern`
- `limit` (optional, default `20`)

**Response** `200 OK`:
```json
{
  "sessions": [
    {
      "id": "g1a2m3e4-...",
      "game_type": "memory",
      "score": 850,
      "accuracy": 0.92,
      "duration_seconds": 120,
      "completed_at": "2026-04-04T06:00:00Z"
    }
  ],
  "total": 18
}
```

---

## 5. AI Feedback

### `GET /api/feedback/{session_id}?session_type={type}` — Get Feedback for a Session

**Query Params:**
- `session_type` (required) — `"exercise"` or `"game"`

**Response** `200 OK`:
```json
{
  "id": "f1e2e3d4-...",
  "session_id": "s1e2s3s4-...",
  "session_type": "exercise",
  "summary": "Great session! Your shoulder flexion range improved by 5° compared to your last session. You maintained consistent form throughout.",
  "tips": [
    "Try to hold the peak position for 2 seconds before lowering",
    "Focus on keeping your elbow straight during the raise",
    "Consider increasing reps to 15 next session"
  ],
  "encouragement": "You're making excellent progress! Your consistency is paying off — keep up the great work! 💪",
  "focus_areas": [
    "End-range hold time",
    "Elbow extension consistency"
  ],
  "recovery_score": 7,
  "created_at": "2026-04-04T05:33:05Z"
}
```

**Response** `202 Accepted` (if feedback is still generating):
```json
{
  "status": "processing",
  "message": "AI feedback is being generated. Please retry in a few seconds."
}
```

---

## 6. Progress / Dashboard

### `GET /api/progress/{user_id}` — Get Dashboard Data

**Response** `200 OK`:
```json
{
  "user_id": "a1b2c3d4-...",
  "summary": {
    "total_exercise_sessions": 45,
    "total_game_sessions": 18,
    "total_reps": 540,
    "avg_form_score": 0.82,
    "current_streak_days": 5,
    "total_active_days": 12
  },
  "exercise_progress": [
    {
      "date": "2026-04-01",
      "sessions": 2,
      "total_reps": 24,
      "avg_form_score": 0.80
    },
    {
      "date": "2026-04-02",
      "sessions": 1,
      "total_reps": 15,
      "avg_form_score": 0.85
    }
  ],
  "game_progress": [
    {
      "date": "2026-04-01",
      "game_type": "memory",
      "best_score": 850,
      "avg_accuracy": 0.88
    }
  ],
  "recent_feedback": [
    {
      "id": "f1e2e3d4-...",
      "session_type": "exercise",
      "summary": "Great shoulder flexion session...",
      "recovery_score": 7,
      "created_at": "2026-04-04T05:33:05Z"
    }
  ],
  "body_part_breakdown": [
    { "body_part": "shoulder", "sessions": 20, "avg_form_score": 0.84 },
    { "body_part": "knee", "sessions": 15, "avg_form_score": 0.79 }
  ]
}
```

---

### `GET /api/progress/{user_id}/exercise-trend` — Exercise Trend (Charts)

**Query Params:**
- `days` (optional, default `30`) — how many days back
- `exercise_id` (optional) — filter by specific exercise

**Response** `200 OK`:
```json
{
  "trend": [
    {
      "date": "2026-04-01",
      "avg_angle": 145.2,
      "avg_form_score": 0.80,
      "total_reps": 24
    },
    {
      "date": "2026-04-02",
      "avg_angle": 148.5,
      "avg_form_score": 0.85,
      "total_reps": 15
    }
  ]
}
```

---

## 7. Error Responses (Standard)

All errors follow this shape:

```json
{
  "detail": "User not found",
  "status_code": 404
}
```

| Status Code | When |
|---|---|
| `400` | Bad request / validation error |
| `404` | Resource not found |
| `500` | Server error / Gemini API failure |

---

## Implementation notes (audit 2026-04-04)

> Locked request/response **shapes** above are still the target. The following describes how the **current backend/frontend** may diverge for integrators.

1. **Validation (`422`)** — FastAPI validation errors return `detail` as a **list** of objects (field + message), not necessarily `{ "detail": "string", "status_code": 422 }`.

2. **`POST /api/sessions` / `POST /api/game-sessions` timing** — Server **waits** for Gemini (or fallback) and inserts `ai_feedback` before returning `201` with `feedback_id`. Polling `GET /api/feedback` is optional, not required for a successful first fetch right after create.

3. **`GET /api/feedback` + `202 Accepted`** — The router may return `202` when no row is found (implementation maps some `404`s from the service to `202`). That conflates “still generating” with “wrong `session_type` / invalid id”. Clients should not treat `202` as a strict guarantee of in-flight generation only.

4. **Frontend coverage** — `GET /api/sessions/{session_id}` and `GET /api/progress/{user_id}/exercise-trend` are implemented on the server; the bundled `frontend/lib/api.ts` does not expose `sessionsApi.get`; `progressApi.trend` exists but is not used by current chart components.

5. **User creation** — Contract defines `POST /api/users`; the shipped UI only lists users (`GET /api/users`). At least one user must exist in Supabase (manual POST or SQL) before session/game writes from the UI.
