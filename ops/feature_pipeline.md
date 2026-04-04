# Feature Development Pipeline

> Follow this sequence every time you implement a new feature.

---

## Step-by-Step Flow

### Step 1: Understand the Feature

- [ ] Identify which user flow this belongs to (exercise, game, dashboard)
- [ ] Read `context/file_mapping.md` to locate all files involved
- [ ] Read `context/api_contract.md` for API endpoints
- [ ] Read `context/schema.md` for database tables
- [ ] Read `context/decisions.md` if relevant

### Step 2: Check Dependencies

- [ ] Are the API endpoints already implemented?
- [ ] Are the database tables created?
- [ ] Are the Pydantic models / TypeScript types defined?
- [ ] If missing, implement them first or use mock data

### Step 3: Implement Backend

1. **Models** — Pydantic schemas in `backend/app/models/`
2. **Service** — Business logic in `backend/app/services/`
3. **Router** — Endpoint in `backend/app/routers/`
4. **Register** — Mount router in `backend/app/main.py`
5. **Test** — Swagger UI at `http://localhost:8000/docs`

### Step 4: Implement Frontend

1. **Types** — TypeScript interfaces in `frontend/src/types/index.ts`
2. **API function** — Add call in `frontend/src/lib/api.ts`
3. **Components** — Build in `frontend/src/components/`
4. **Page** — Wire into `frontend/src/app/`
5. **Test** — Run app, navigate, verify

### Step 5: Integration Test

- [ ] Run both frontend and backend locally
- [ ] Execute full user flow end-to-end
- [ ] Check Network tab for correct API calls
- [ ] Verify data in Supabase
- [ ] Check for console errors

### Step 6: Update Changelog

- [ ] Add entry to `context/changelog.md`

---

## Priority Order

> Legend: ✅ Done · 🔲 Not started

1. ✅ Supabase tables + seed data — `seed/exercises.json` written (8 exercises). DB tables must be created in Supabase manually using `context/schema.md` SQL.
2. ✅ Users/Exercises API — `POST /api/users`, `GET /api/users[/{id}]`, `GET /api/exercises[/{id}]` all implemented.
3. 🔲 `exerciseEngine.ts` + MediaPipe + live exercise session — frontend work, not started.
4. ✅ Sessions API + Game Sessions API — `POST/GET /api/sessions[/{id}]` and `POST/GET /api/game-sessions` implemented.
5. ✅ Gemini integration + feedback display — `gemini_service.py` with fallback, `feedback_service.py`, `GET /api/feedback/{session_id}` with 202 processing state all implemented.
6. ✅ Dashboard / Progress API — `GET /api/progress/{user_id}` and `/exercise-trend` implemented. Frontend charts not started.
7. 🔲 Remaining games (Reaction, Pattern) + polish — frontend work, not started.

---

## Parallel Dev Notes

| Scenario | Solution |
|---|---|
| Backend not ready | Use mock data matching API contract |
| Frontend not ready | Use Swagger UI |
| Gemini key not working | Return hardcoded fallback feedback |
| Supabase not set up | Use local mock responses |

---

## Quick Checklist

```
□ Read context files
□ Identify files to create/modify
□ Backend: models → service → router → test
□ Frontend: types → api → components → page → test
□ Integration test
□ Update changelog
```

## Backend Implementation Status (as of 2026-04-04)

All backend Python files are fully implemented. The backend is ready to run.

| Layer | Status |
|---|---|
| Infrastructure (`settings.py`, `supabase_client.py`) | ✅ Complete |
| Users API (3 endpoints) | ✅ Complete |
| Exercises API (2 endpoints) | ✅ Complete |
| Exercise Sessions API (3 endpoints) | ✅ Complete |
| Game Sessions API (2 endpoints) | ✅ Complete |
| Gemini Service (with fallback) | ✅ Complete |
| Feedback Service + API (1 endpoint) | ✅ Complete |
| Progress API (2 endpoints) | ✅ Complete |
| Seed data (`exercises.json`) | ✅ Complete — needs manual Supabase import |

**Remaining before full integration test:**
- Create Supabase tables using SQL in `context/schema.md`
- Import `seed/exercises.json` into `exercises` table
- Fill in `backend/.env` from `.env.example`
- Implement frontend (see priority steps 3 and 7 above)
