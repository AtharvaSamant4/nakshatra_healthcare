# Feature Development Pipeline (V2)

> Use this order so DB, API, and UI stay aligned.

---

## 1. Backend

- [ ] Pydantic models in `backend/app/models/`
- [ ] Service in `backend/app/services/`
- [ ] Router in `backend/app/routers/`
- [ ] Register router in `backend/app/main.py`
- [ ] Verify in Swagger (`/docs`)

---

## 2. Migration

- [ ] If schema changes: update **`schema.sql`** and/or add a forward migration file (team convention)
- [ ] Apply scripts in Supabase in the correct order (**`schema.sql`** then **`migration_v2.sql`** for greenfield V2)
- [ ] Confirm new columns/tables exist before relying on them in services

---

## 3. Frontend adaptation

- [ ] Types + client methods in `frontend/lib/api.ts`
- [ ] Wire UI under `frontend/app/` (role routes: `/`, `/reception`, `/doctor`, `/patient/*`)
- [ ] Use `useApp()` for patient id / doctor id where applicable

---

## 4. Integration testing

- [ ] Both servers running (3000 + 8000)
- [ ] Happy path per role (reception create → doctor sees patient → patient session → progress)
- [ ] Network payloads match `context/api_contract.md`
- [ ] Spot-check Supabase rows (`patients`, `staff`, `prescriptions`, sessions, `ai_feedback`)

---

## 5. Demo prep

- [ ] Seed **staff** (doctors/receptionists) and **patients** so `/` role picker is usable
- [ ] Optional: sample **prescriptions** for chart demos
- [ ] Run through `ops/hardening_checklist.md`

---

## Changelog

- [ ] Add entry to `context/changelog.md` for meaningful changes

---

## Parallel work

| Blocker | Mitigation |
|---------|------------|
| DB not migrated | Backend may 503 on V2 routes; use Swagger for core `/api/users` or fix migration |
| Gemini key missing | Fallback feedback still returns `feedback_id` path in normal code |
| Frontend behind | Exercise/game flows can be tested via Swagger + curl |
