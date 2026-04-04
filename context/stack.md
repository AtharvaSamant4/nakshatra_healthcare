# Technology Stack

## Frontend

| Piece | Choice |
|-------|--------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind + shadcn-style UI (`frontend/components/ui`) |
| Data fetching | Native `fetch` via `frontend/lib/api.ts` |
| Role state | React context + `sessionStorage` (`frontend/lib/app-context.tsx`) |

## Backend

| Piece | Choice |
|-------|--------|
| Runtime | Python 3 |
| Framework | FastAPI |
| Validation / settings | Pydantic, pydantic-settings |
| DB client | Supabase Python (`supabase`), PostgREST via Supabase |
| Config | `backend/.env` — `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY` |

## AI

| Piece | Choice |
|-------|--------|
| Package | **`google-genai`** (see `backend/requirements.txt`) |
| Client | `from google import genai` → `genai.Client(api_key=…)` |
| Model | **`gemini-2.5-flash`** (`backend/app/services/gemini_service.py`, `_MODEL`) |
| Behavior | JSON-shaped prompts; parse response; on failure use in-code fallback dicts |

## Database

| Piece | Choice |
|-------|--------|
| Host | Supabase (PostgreSQL) |
| DDL | `schema.sql` + `migration_v2.sql` (repo root) |

## Dev URLs

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000` (CORS allows origin 3000)
- API docs: `http://localhost:8000/docs`
