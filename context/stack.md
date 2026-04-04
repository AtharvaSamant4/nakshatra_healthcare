# Tech Stack

> AI Rehabilitation System — chosen for hackathon speed, real-time performance, and AI integration

---

## Core Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Frontend** | Next.js (App Router) | 14+ | React-based, file-system routing, SSR/CSR flexibility, fast dev experience |
| **Backend** | FastAPI (Python) | 0.100+ | Async, auto-docs (Swagger), Pydantic validation, rapid prototyping |
| **Database** | Supabase (PostgreSQL) | — | Managed Postgres, instant REST API, free tier, zero DevOps |
| **AI** | Google Gemini API | gemini-2.5-flash | Generous free tier, structured JSON output, long context window |
| **Pose Tracking** | MediaPipe.js | @mediapipe/tasks-vision | Runs in browser, no server GPU needed, 33 landmark points, lightweight |

---

## Frontend Libraries

| Library | Purpose | Why This One |
|---|---|---|
| `next` | Framework | App Router for file-based routing, React Server Components |
| `react` / `react-dom` | UI library | Industry standard, component-based |
| `typescript` | Type safety | Catches bugs at compile time, better DX |
| `@mediapipe/tasks-vision` | Pose tracking | Browser-native, no server dependency, real-time 60fps |
| `recharts` | Dashboard charts | React-native, lightweight, good defaults, easy to style |
| `tailwindcss` | — | **NOT USED** — vanilla CSS for full control |

### Frontend Dev Dependencies

| Library | Purpose |
|---|---|
| `eslint` | Linting |
| `@types/react` | TypeScript definitions |

---

## Backend Libraries

| Library | Purpose | Why This One |
|---|---|---|
| `fastapi` | Web framework | Async, auto-validation, auto-docs, fastest Python framework |
| `uvicorn` | ASGI server | Production-grade, async, works with FastAPI |
| `supabase` | Database client | Official Python client for Supabase |
| `google-genai` | Gemini API | Official Google SDK for Gemini (replaces deprecated `google-generativeai`) |
| `pydantic` | Data validation | Built into FastAPI, enforces request/response schemas |
| `python-dotenv` | Env vars | Load `.env` file for local dev |

---

## Infrastructure

| Service | Usage | Notes |
|---|---|---|
| **Supabase** (cloud) | PostgreSQL database | Free tier: 500MB DB, 50K rows, adequate for demo |
| **Gemini API** (cloud) | AI feedback generation | Free tier: 60 requests/min, sufficient for hackathon |
| **Local dev** | Both frontend + backend | `npm run dev` (port 3000) + `uvicorn` (port 8000) |

---

## What We Deliberately Skipped

| Skipped | Why |
|---|---|
| Redux / Zustand | No complex cross-page state; `useState` + Context is enough |
| WebSocket | REST is sufficient — we send summaries, not frame-by-frame |
| Docker | Local dev only, no deployment orchestration needed |
| Redis / Message queue | Single DB is sufficient for demo scale |
| OAuth / JWT libraries | No auth in V1 — simple user-select dropdown |
| TailwindCSS | Vanilla CSS for maximum control |
| Prisma / SQLAlchemy ORM | Supabase client handles queries directly |
| Testing frameworks | Manual testing only for hackathon speed |

---

## Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
```
