# Claude Code / Cursor AI — Operating Rules

> Read before changing code. **Do not trust stale chat or old copies of context** — reconcile with `backend/`, `frontend/`, `schema.sql`, and `migration_v2.sql` on disk.

---

## Mandatory pre-read (ordered)

1. `context/architecture.md` — V2 workflow and data flow
2. `context/api_contract.md` — request/response shapes (must match running routers)
3. `context/schema.md` + **`schema.sql`** + **`migration_v2.sql`** — table names and FKs after migration
4. `context/file_mapping.md` — where UI and routers live
5. `context/decisions.md` — no auth, filtering, migration guards
6. `backend/BACKEND_AUDIT.md` — implementation detail where it exists

---

## Hard rules

### 1. Contract matches code

- **`context/api_contract.md` documents the live API** — if you change an endpoint, update the contract in the same change set.
- Field names and JSON nesting must match Pydantic models and `frontend/lib/api.ts`.

### 2. Paths and structure

- Next.js routes live under **`frontend/app/`** (not `frontend/src/app`).
- Routers: `backend/app/routers/`; services: `backend/app/services/`; routers delegate to services.
- Prefer extending `frontend/lib/api.ts` instead of ad-hoc `fetch` in components.

### 3. Migration safety

- New environments: run **`schema.sql`**, then **`migration_v2.sql`** in Supabase (order matters).
- Backend services may return **503** or omit optional fields when V2 tables/columns are missing — do not assume “table always exists” without checking code.
- Session create may retry without `prescription_id` if the column is absent — keep optional fields backward compatible.

### 4. Frontend–backend sync

- Add router in `main.py` when adding a new `APIRouter`.
- Mirror paths and payloads in `frontend/lib/api.ts` and TypeScript types.
- UUIDs in **URL segments** must be valid UUID strings; invalid values can surface as **500** from the DB layer — validate or guard on the client before navigation.

### 5. Gemini

- Package: **`google-genai`** (`from google import genai`).
- Model: **`gemini-2.5-flash`** (`gemini_service.py` `_MODEL`).
- `feedback_service.get_feedback(session_id, session_type)` — always pass **both** arguments.

### 6. Auth

- **No authentication** in V2 demo: role + entity chosen on `/` and stored in **`sessionStorage`** (`AppProvider`). Do not add middleware that contradicts this without an explicit product decision.

---

## Common mistakes

| Mistake | Correct approach |
|--------|-------------------|
| Trusting an old `context/*.md` from another branch | Re-read repo files; treat code + `schema.sql` as source of truth |
| Assuming async-only feedback | Session/game **POST** paths typically **await** Gemini (or fallback) before **201**; `GET /api/feedback` still supports **202** |
| `frontend/src/...` paths | Use **`frontend/app`**, **`frontend/lib`**, **`frontend/components`** |
| Calling `get_feedback` with one argument | Pass `(session_id, session_type)` |
| Skipping migration | Apply `migration_v2.sql` after `schema.sql` for `patients`, `staff`, etc. |

---

## Quality

- TypeScript: avoid unnecessary `any`.
- Python: type hints on public functions.
- Comments for **why**, not what.

---

## Testing (hackathon mode)

- Backend: `http://localhost:8000/docs`
- Frontend: click through **/** → role → `/reception` | `/doctor` | `/patient/*` plus legacy `/exercise`, `/games`, `/results` as needed
- Network tab + Supabase rows for writes
