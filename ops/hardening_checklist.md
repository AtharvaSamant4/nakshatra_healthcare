# Hardening Checklist (pre-demo)

> Run before presentations. Adjust for your Supabase project and env files.

---

## Environment

- [ ] `backend/.env`: `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`
- [ ] `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000` (if not default)
- [ ] Supabase: **`schema.sql`** applied, then **`migration_v2.sql`**
- [ ] `pip install -r backend/requirements.txt` (includes `google-genai`)
- [ ] `uvicorn app.main:app --reload` from `backend` (or equivalent)

---

## Database seeded (minimum for V2 UI)

- [ ] **Staff** rows exist (at least one `doctor`, one `receptionist`) — role picker on `/` depends on `GET /api/staff`
- [ ] **Patients** exist (or create via `/reception`) — patient role and doctor list need `GET /api/patients`
- [ ] **Exercises** seeded (from `schema.sql` inserts)
- [ ] Optional: **prescriptions** for doctor demo (`GET /api/prescriptions?patient_id=…`)

---

## API smoke (Swagger or curl)

- [ ] `GET /api/staff` — 200 list
- [ ] `GET /api/patients` — 200 list
- [ ] `GET /api/exercises` — non-empty catalog
- [ ] `POST /api/sessions` — 201 + `feedback_id` (valid patient UUID as `user_id`)
- [ ] `POST /api/game-sessions` — 201 + `feedback_id`
- [ ] `GET /api/progress/{patient_uuid}` — 200 aggregate
- [ ] `GET /api/feedback/{session_uuid}?session_type=exercise|game` — 200 or 202 as designed
- [ ] `POST /api/messages` + `GET /api/messages?patient_id=…` — thread works

---

## Frontend

- [ ] `npm run dev` — no compile errors
- [ ] **`/`** — role cards, staff/patient loads, enter flows route to `/reception`, `/doctor`, `/patient`
- [ ] **Reception** — create patient succeeds
- [ ] **Doctor** — patient list non-empty (filter + fallback behavior acceptable for demo)
- [ ] **Doctor detail** — patient load, prescriptions UI, PATCH patient if used
- [ ] **Patient** — exercise and/or games page posts sessions with logged-in patient id
- [ ] **Messages** (doctor + patient) — send and list
- [ ] Legacy **`/exercise`**, **`/games`**, **`/results`** if still in demo script
- [ ] **No unexpected console errors** during primary flows

---

## Integration

- [ ] Exercise or game completion creates rows in Supabase and updates progress
- [ ] AI feedback row exists after session create (or fallback content still stored)
- [ ] CORS: browser origin `http://localhost:3000` only (see `main.py`)

---

## Quick smoke (about 3 minutes)

1. Open `http://localhost:3000` — pick **receptionist**, open **`/reception`**, create a patient (or confirm list).
2. Back to `/`, pick **doctor**, open **`/doctor`**, open a patient, skim prescriptions/messages.
3. Back to `/`, pick **patient**, run **`/patient/exercise`** or **`/patient/games`** once; open **`/results`** or patient hub and confirm data moves.
4. Check browser console and Network tab for failed calls.
