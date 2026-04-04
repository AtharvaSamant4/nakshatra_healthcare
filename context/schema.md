# Database Schema (Post-V2)

> **Physical bootstrap:** run `schema.sql` in Supabase, then `migration_v2.sql` in order (see file headers).  
> After migration the primary person table is **`patients`** (renamed from `users`). Foreign keys on child tables still use the column name **`user_id`** (patient id).

---

## Entity relationships

```
staff ──┬── optional ←── patients.doctor_id
        │
        └── prescriptions.doctor_id

patients ──┬── 1:N ── exercise_sessions (user_id → patients.id)
           ├── 1:N ── game_sessions (user_id)
           ├── 1:N ── ai_feedback (user_id)
           ├── 1:N ── prescriptions (patient_id)
           └── 1:N ── messages (patient_id)

exercises ── 1:N ── exercise_sessions
exercises ── optional ←── prescriptions.exercise_id

prescriptions ── optional ←── exercise_sessions.prescription_id

ai_feedback.session_id → polymorphic (exercise_sessions.id OR game_sessions.id) + session_type
```

---

## Tables (logical, post-migration)

### `patients` (was `users` before migration)

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | `gen_random_uuid()` |
| name | text NOT NULL | |
| email | text UNIQUE | nullable |
| age | int | nullable |
| condition_notes | text | nullable |
| created_at | timestamptz | default now() |
| doctor_id | uuid FK → staff(id) | ON DELETE SET NULL, nullable |
| status | text NOT NULL | default `registered` |
| diagnosis, injury_type, severity | text | nullable |
| emergency | boolean NOT NULL | default false |
| phone | text | nullable |

### `staff`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| name | text NOT NULL | |
| email | text UNIQUE | nullable |
| role | text NOT NULL | `doctor` \| `receptionist` |
| specialization | text | nullable |
| created_at | timestamptz | |

### `prescriptions`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| patient_id | uuid FK → patients | ON DELETE CASCADE |
| doctor_id | uuid FK → staff | ON DELETE CASCADE |
| exercise_id | uuid FK → exercises | nullable |
| game_type | text | nullable (`memory` \| `reaction` \| `pattern`) |
| target_reps, target_sets | int | nullable |
| frequency | text | nullable |
| priority | text NOT NULL | default `normal` |
| notes | text | nullable |
| status | text NOT NULL | default `active` |
| created_at | timestamptz | |

### `messages`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| patient_id | uuid FK → patients | ON DELETE CASCADE |
| sender_type | text NOT NULL | `patient` \| `doctor` |
| sender_id | uuid NOT NULL | patients.id or staff.id |
| content | text NOT NULL | |
| created_at | timestamptz | |

### `exercises`

Catalog: name, description, body_part, difficulty, angle_config (jsonb), instructions, thumbnail_url. Seeded in `schema.sql`.

### `exercise_sessions`

| Column | Type | Notes |
|--------|------|--------|
| user_id | uuid FK | **patient id** |
| exercise_id | uuid FK | |
| reps_completed | int NOT NULL | |
| avg_angle, min_angle, max_angle, form_score | double precision | nullable |
| duration_seconds | int | nullable |
| angle_history | jsonb | nullable |
| started_at, completed_at | timestamptz | NOT NULL |
| prescription_id | uuid FK → prescriptions | nullable (V2) |

### `game_sessions`

user_id (patient), game_type, score, accuracy, avg_reaction_ms, level_reached, duration_seconds, game_metadata (jsonb), completed_at.

### `ai_feedback`

user_id (patient), session_id, session_type (`exercise` \| `game`), summary, tips (jsonb), encouragement, focus_areas (jsonb), recovery_score, created_at.

---

## Indexes

See `migration_v2.sql` Section 6 and `schema.sql` base indexes on sessions and feedback. Notable: `idx_exercise_sessions_prescription`, `idx_patients_doctor`, `idx_prescriptions_patient`.

---

## SQL sources

| File | Purpose |
|------|---------|
| `schema.sql` | Extensions, `users`, exercises seed, sessions, games, ai_feedback, base indexes |
| `migration_v2.sql` | staff, rename users→patients + columns, prescriptions, messages, prescription_id, extra indexes |

Do not duplicate full DDL here; edit the SQL files for structural changes.
