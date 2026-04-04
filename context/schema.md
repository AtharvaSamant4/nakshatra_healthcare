# Database Schema

> Supabase PostgreSQL · 5 tables · UUID primary keys · timestamptz timestamps
> **Canonical SQL file:** `schema.sql` (repo root) — run this in Supabase SQL Editor to create everything.

---

## Entity Relationships

```
users ──┬── 1:N ──→ exercise_sessions ──── 1:0..1 ──→ ai_feedback
        │
        ├── 1:N ──→ game_sessions ──────── 1:0..1 ──→ ai_feedback
        │
        └── 1:N ──→ ai_feedback (via user_id)

exercises ── 1:N ──→ exercise_sessions (via exercise_id)
```

`ai_feedback.session_id` is a **polymorphic FK** — it points to either `exercise_sessions.id` or `game_sessions.id`, disambiguated by `session_type`.

All child-table FKs use `ON DELETE CASCADE` — deleting a user removes all their sessions and feedback.

---

## Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | Display name |
| `email` | `text` | UNIQUE, nullable | Optional for V1 |
| `age` | `int` | nullable | For age-adjusted feedback |
| `condition_notes` | `text` | nullable | E.g. "left knee ACL recovery" |
| `created_at` | `timestamptz` | default `now()` | |

---

## Table: `exercises` (Seed data — pre-populated)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `name` | `text` | NOT NULL | E.g. "Shoulder Flexion" |
| `description` | `text` | | Short description |
| `body_part` | `text` | NOT NULL | `"shoulder"`, `"knee"`, `"elbow"`, `"hip"` |
| `difficulty` | `text` | default `'beginner'` | `"beginner"`, `"intermediate"`, `"advanced"` |
| `angle_config` | `jsonb` | NOT NULL | See format below |
| `instructions` | `text` | | Step-by-step text |
| `thumbnail_url` | `text` | nullable | Static image URL |

**`angle_config` format:**
```json
{
  "joint": "left_shoulder",
  "points": ["left_elbow", "left_shoulder", "left_hip"],
  "target_angle": 160,
  "threshold": 15
}
```

**Seed data:** 8 exercises across shoulder/elbow/knee/hip. Defined as SQL INSERTs in `schema.sql` and also available as `backend/seed/exercises.json` for programmatic import.

**Thumbnail path drift:** `schema.sql` seed rows use `thumbnail_url` paths like `/images/exercises/<name>.png`. `backend/seed/exercises.json` currently uses `/images/<name>.png` (no `exercises/` segment). Align URLs if you import from JSON so the frontend and CDN stay consistent.

---

## Table: `exercise_sessions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id` ON DELETE CASCADE, NOT NULL | |
| `exercise_id` | `uuid` | FK → `exercises.id` ON DELETE CASCADE, NOT NULL | |
| `reps_completed` | `int` | NOT NULL | |
| `avg_angle` | `double precision` | | Average peak angle across reps |
| `min_angle` | `double precision` | | Min angle reached |
| `max_angle` | `double precision` | | Max angle reached |
| `form_score` | `double precision` | | 0.0 – 1.0 scale |
| `duration_seconds` | `int` | | Total session time |
| `angle_history` | `jsonb` | nullable | `[{ "rep": 1, "peak_angle": 155 }, ...]` |
| `started_at` | `timestamptz` | NOT NULL | |
| `completed_at` | `timestamptz` | NOT NULL | |

---

## Table: `game_sessions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id` ON DELETE CASCADE, NOT NULL | |
| `game_type` | `text` | NOT NULL | `"memory"`, `"reaction"`, `"pattern"` |
| `score` | `int` | NOT NULL | Final score |
| `accuracy` | `double precision` | nullable | 0.0 – 1.0 |
| `avg_reaction_ms` | `double precision` | nullable | For reaction game |
| `level_reached` | `int` | nullable | For pattern game |
| `duration_seconds` | `int` | | |
| `game_metadata` | `jsonb` | nullable | Game-specific extra data |
| `completed_at` | `timestamptz` | default `now()` | |

---

## Table: `ai_feedback`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id` ON DELETE CASCADE, NOT NULL | |
| `session_id` | `uuid` | NOT NULL | Points to `exercise_sessions.id` or `game_sessions.id` |
| `session_type` | `text` | NOT NULL | `"exercise"` or `"game"` |
| `summary` | `text` | | Gemini-generated summary |
| `tips` | `jsonb` | | Array of strings |
| `encouragement` | `text` | | Motivational message |
| `focus_areas` | `jsonb` | | Array of strings |
| `recovery_score` | `int` | | 1–10 scale |
| `created_at` | `timestamptz` | default `now()` | |

---

## SQL Reference

> **DO NOT copy SQL from this file.** Use the canonical `schema.sql` in the repo root.
> It contains the complete DDL (tables + indexes + seed INSERTs) ready to paste into Supabase SQL Editor.

The SQL below is a **summary** for quick reference only:

```sql
-- Required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5 tables: users, exercises, exercise_sessions, game_sessions, ai_feedback
-- All FKs use ON DELETE CASCADE
-- Float columns use `double precision` (PostgreSQL standard)
-- See schema.sql for full CREATE TABLE statements
```

---

## Indexes

```sql
CREATE INDEX idx_exercise_sessions_user ON exercise_sessions(user_id);
CREATE INDEX idx_exercise_sessions_exercise ON exercise_sessions(exercise_id);
CREATE INDEX idx_exercise_sessions_completed_at ON exercise_sessions(completed_at DESC);
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_completed_at ON game_sessions(completed_at DESC);
CREATE INDEX idx_ai_feedback_session ON ai_feedback(session_id);
CREATE INDEX idx_ai_feedback_user ON ai_feedback(user_id);
```

7 indexes total. The `completed_at DESC` indexes enable efficient "most recent sessions first" queries used by the progress service.

---

## Schema Notes

| Topic | Detail |
|---|---|
| **Float type** | PostgreSQL `double precision` (8 bytes). Pydantic models use Python `float`. API contract uses JSON numbers. All are compatible. |
| **ON DELETE CASCADE** | Deleting a user cascades to all their sessions and feedback. Safe for demo; review for production. |
| **pgcrypto extension** | Required for `gen_random_uuid()` on Supabase. Already enabled on most Supabase projects, but the SQL includes it defensively. |
| **Polymorphic FK** | `ai_feedback.session_id` is NOT a real FK in PostgreSQL (no `REFERENCES`). It's an application-level convention, disambiguated by `session_type`. |
| **Seed data** | 8 exercises with deterministic UUIDs (`a1000001-0001-4000-8000-00000000000X`). Both `schema.sql` INSERTs and `backend/seed/exercises.json` contain the same exercises. |
