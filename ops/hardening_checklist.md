# Hardening Checklist

> Run through this before any demo or presentation. Check every item.

---

## Backend Checks

- [ ] `backend/.env` has valid `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`
- [ ] FastAPI starts without errors: `uvicorn app.main:app --reload`
- [ ] CORS allows `http://localhost:3000` in `main.py`
- [ ] All 6 routers mounted: users, exercises, sessions, games, progress, feedback
- [ ] `GET /api/exercises` returns seeded exercises
- [ ] `POST /api/sessions` stores data and returns `feedback_id`
- [ ] `POST /api/game-sessions` stores data and returns `feedback_id`
- [ ] `GET /api/progress/{user_id}` returns aggregated data
- [ ] `GET /api/feedback/{session_id}` returns AI feedback or `202`
- [ ] Gemini API responds (test with a manual prompt)
- [ ] Gemini fallback works when API key is invalid
- [ ] Swagger docs load at `http://localhost:8000/docs`
- [ ] No uncaught exceptions — all routes have try/except

## Frontend Checks

- [ ] `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [ ] App starts without errors: `npm run dev`
- [ ] Home page redirects to `/dashboard`
- [ ] Dashboard loads and shows data (or empty state)
- [ ] Exercise library shows exercise cards
- [ ] Clicking an exercise opens the start page
- [ ] Webcam permission prompt appears
- [ ] MediaPipe model loads (check loading indicator)
- [ ] Skeleton overlay renders on the webcam feed
- [ ] Rep counter increments during exercise
- [ ] Form indicator shows feedback (green/red)
- [ ] Session results display after ending exercise
- [ ] AI feedback card loads on results page
- [ ] At least 1 cognitive game is playable (Memory)
- [ ] Game results page shows score + AI feedback
- [ ] User select dropdown works in navbar
- [ ] No console errors in browser DevTools

## Integration Checks

- [ ] Exercise flow: library → start → do reps → end → results → feedback
- [ ] Game flow: hub → play game → finish → results → feedback
- [ ] Dashboard shows data after completing sessions
- [ ] API calls visible in Network tab with correct payloads
- [ ] Data appears in Supabase tables after sessions

## Demo Environment

- [ ] Using Chrome browser
- [ ] Webcam is working and not blocked
- [ ] Both servers running (port 3000 + port 8000)
- [ ] At least 1 test user created
- [ ] At least 2-3 exercise sessions completed (for dashboard data)
- [ ] At least 1 game session completed
- [ ] Supabase is reachable (not over free tier limits)
- [ ] Gemini API has remaining quota

## Quick Smoke Test (2 minutes)

1. Open `http://localhost:3000` → should see dashboard
2. Go to Exercises → pick one → Start → see webcam + skeleton
3. Do a few reps → End session → see results + AI feedback
4. Go to Games → play Memory → finish → see score + feedback
5. Go back to Dashboard → verify new session appears
