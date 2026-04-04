# Database Schema

> Supabase PostgreSQL · 5 tables · UUID primary keys · timestamptz timestamps

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

---

## Table: `exercise_sessions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `exercise_id` | `uuid` | FK → `exercises.id`, NOT NULL | |
| `reps_completed` | `int` | NOT NULL | |
| `avg_angle` | `float` | | Average peak angle across reps |
| `min_angle` | `float` | | Min angle reached |
| `max_angle` | `float` | | Max angle reached |
| `form_score` | `float` | | 0.0 – 1.0 scale |
| `duration_seconds` | `int` | | Total session time |
| `angle_history` | `jsonb` | nullable | `[{ "rep": 1, "peak_angle": 155 }, ...]` |
| `started_at` | `timestamptz` | NOT NULL | |
| `completed_at` | `timestamptz` | NOT NULL | |

---

## Table: `game_sessions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `game_type` | `text` | NOT NULL | `"memory"`, `"reaction"`, `"pattern"` |
| `score` | `int` | NOT NULL | Final score |
| `accuracy` | `float` | nullable | 0.0 – 1.0 |
| `avg_reaction_ms` | `float` | nullable | For reaction game |
| `level_reached` | `int` | nullable | For pattern game |
| `duration_seconds` | `int` | | |
| `game_metadata` | `jsonb` | nullable | Game-specific extra data |
| `completed_at` | `timestamptz` | default `now()` | |

---

## Table: `ai_feedback`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `session_id` | `uuid` | NOT NULL | Points to `exercise_sessions.id` or `game_sessions.id` |
| `session_type` | `text` | NOT NULL | `"exercise"` or `"game"` |
| `summary` | `text` | | Gemini-generated summary |
| `tips` | `jsonb` | | Array of strings |
| `encouragement` | `text` | | Motivational message |
| `focus_areas` | `jsonb` | | Array of strings |
| `recovery_score` | `int` | | 1–10 scale |
| `created_at` | `timestamptz` | default `now()` | |

---

## SQL Creation Reference

```sql
-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  age int,
  condition_notes text,
  created_at timestamptz DEFAULT now()
);

-- Exercises (seed data)
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  body_part text NOT NULL,
  difficulty text DEFAULT 'beginner',
  angle_config jsonb NOT NULL,
  instructions text,
  thumbnail_url text
);

-- Exercise Sessions
CREATE TABLE exercise_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  reps_completed int NOT NULL,
  avg_angle float,
  min_angle float,
  max_angle float,
  form_score float,
  duration_seconds int,
  angle_history jsonb,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL
);

-- Game Sessions
CREATE TABLE game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  game_type text NOT NULL,
  score int NOT NULL,
  accuracy float,
  avg_reaction_ms float,
  level_reached int,
  duration_seconds int,
  game_metadata jsonb,
  completed_at timestamptz DEFAULT now()
);

-- AI Feedback
CREATE TABLE ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  session_id uuid NOT NULL,
  session_type text NOT NULL,
  summary text,
  tips jsonb,
  encouragement text,
  focus_areas jsonb,
  recovery_score int,
  created_at timestamptz DEFAULT now()
);
```

---

## Indexes (Recommended)

```sql
CREATE INDEX idx_exercise_sessions_user ON exercise_sessions(user_id);
CREATE INDEX idx_exercise_sessions_exercise ON exercise_sessions(exercise_id);
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_ai_feedback_session ON ai_feedback(session_id);
CREATE INDEX idx_ai_feedback_user ON ai_feedback(user_id);
```
