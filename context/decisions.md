# Architecture Decisions (V2)

## No authentication (demo / V1 scope)

- Users pick **receptionist**, **doctor**, or **patient** on the home page and select an entity from lists loaded from the API.
- Identity is stored in **`sessionStorage`** (`rehab_v2_session`), not JWT or cookies.
- **Implication:** anyone with the app can act as any role; fine for hackathon/demo, not for production PHI.

## Keep `/api/users` alongside `/api/patients`

- After migration, `user_service` targets the **`patients`** table with a probe/fallback pattern where applicable.
- `/api/patients` is the explicit hospital API; `/api/users` preserves older clients and simple list/create flows.

## Doctor patient list: frontend filter + fallback

- Doctor UI calls **`GET /api/patients`** without `doctor_id`, then filters where `patient.doctor_id === currentDoctor.id`.
- If that set is empty, UI falls back to **all patients** so demos do not show a blank screen if backend filtering or assignment data is inconsistent.

## REST only; no WebSocket

- Session summaries and progress are **POST/GET** polling-friendly.
- Message threads may be refreshed on interval in UI (implementation-specific).

## Gemini execution

- Session/game create handlers **await** Gemini (or fallback) before returning `feedback_id` in the common path.
- **`GET /api/feedback`** still supports `202` for missing rows (router maps some 404s to 202).

## Migration-safe backend patterns

- Services for V2 tables catch missing relations / columns where implemented and return **503**, **[]**, or skip optional fields (e.g. compliance query if `prescription_id` missing).
- Session insert may **retry without `prescription_id`** if the column is absent (narrow operational case).

## Exercise “engine”

- Patient exercise UI may use **simulated** rep/timer behavior; full MediaPipe pipeline is not required for API integration.
- Prescription linkage in DB is supported via optional **`prescription_id`** on `POST /api/sessions` when the column exists.

## UUIDs in path segments

- FastAPI validates UUID path params; malformed strings can surface as **500** if errors propagate from Supabase — prefer validating UUID format on the client before navigation.
