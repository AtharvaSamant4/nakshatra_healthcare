# Known integration gaps (V2)

> Mismatches and rough edges observed between **implemented** frontend, backend, and docs. Not a backlog ticket list.

| Area | Issue |
|------|--------|
| **Feedback poll** | `feedbackApi.get` exists; many flows rely on **201 + `feedback_id`** and aggregated **`GET /api/progress`** instead of polling `GET /api/feedback` after each session. |
| **404 vs 202 on feedback** | Router may map missing feedback to **202**; not always distinguishable from wrong `session_type` / bad id. |
| **Gemini timing** | Session/game services typically **await** Gemini (or fallback) before returning **201**; narrative “fire-and-forget + poll only” is inaccurate. |
| **Doctor patient list** | UI calls **`GET /api/patients`** without `doctor_id`, filters in browser, **falls back to full list** if filter yields empty — demo-stable, not strict RBAC. |
| **GET session by id** | Backend: `GET /api/sessions/{session_id}`; **`frontend/lib/api.ts`** has no `sessionsApi.get` wrapper. |
| **Progress trend** | `GET /api/progress/{id}/exercise-trend` implemented; charts may use only the main progress payload. |
| **422 shape** | FastAPI validation errors often use **`detail`** as a **list**; some docs show string-only errors. |
| **Pattern game** | API allows `game_type: "pattern"`; games UI may expose only memory/reaction. |
| **Exercise seed URLs** | `schema.sql` thumbnail paths may differ from `backend/seed/exercises.json` — align if importing JSON. |
| **CORS** | `allow_origins` is **`http://localhost:3000`** only. |
| **UUID paths** | Invalid UUID strings in path params can produce **500** from downstream errors — validate before linking to `/doctor/[patientId]`. |
| **Legacy `/api/users`** | Still mounted; table is **`patients`** after migration — prefer **`/api/patients`** for hospital flows. |
