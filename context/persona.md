# User Personas (V2 Hospital Rehab)

## Receptionist

- **Goal:** Register patients quickly, optionally assign a **doctor** (`doctor_id`), capture basics (name, phone, emergency flag).
- **Primary UI:** `frontend/app/reception/page.tsx` — staff list (doctors), patient create form → `POST /api/patients`.
- **UX expectations:** Simple form, clear doctor dropdown, success feedback; no clinical depth required here.

## Doctor

- **Goal:** See **my patients**, open chart, update diagnosis/injury/severity/status, manage **prescriptions**, **message** the patient.
- **Primary UI:** `frontend/app/doctor/page.tsx` (list), `frontend/app/doctor/[patientId]/page.tsx` (detail), `.../messages/page.tsx`.
- **UX expectations:** Patient list must populate reliably (client-side filter + fallback). Detail tabs for clinical updates and Rx. Messages show sender side (doctor vs patient).

## Patient

- **Goal:** Complete **exercises** and **games**, see progress, **message** doctor from home context.
- **Primary UI:** `frontend/app/patient/page.tsx` (hub), `/patient/exercise`, `/patient/games`, `/patient/messages`.
- **UX expectations:** Large touch-friendly controls, minimal jargon, clear session start/stop; uses same core APIs with `user_id` = patient id from session.

## Shared

- **Role confusion:** Always show current role on home or nav where possible.
- **Empty states:** Distinguish “no data” vs “API error” where feasible (many screens still only `console.error` today).
