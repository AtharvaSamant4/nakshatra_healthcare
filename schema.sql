-- ============================================================
-- Nakshatra Healthcare — Supabase PostgreSQL Schema (V2)
-- Generated to match the CURRENT DB tables described by user.
-- Date: 2026-04-04
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional but common in Supabase:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1) staff
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NULL,
  role text NOT NULL,
  specialization text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_email_key UNIQUE (email)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_staff_role
  ON public.staff USING btree (role) TABLESPACE pg_default;

-- ============================================================
-- 2) patients
-- (Your DB uses patients, not users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NULL,
  age integer NULL,
  condition_notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  doctor_id uuid NULL,
  status text NOT NULL DEFAULT 'registered'::text,
  diagnosis text NULL,
  injury_type text NULL,
  severity text NULL,
  emergency boolean NOT NULL DEFAULT false,
  phone text NULL,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_email_key UNIQUE (email),
  CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id)
    REFERENCES public.staff (id) ON DELETE SET NULL
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_doctor
  ON public.patients USING btree (doctor_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_status
  ON public.patients USING btree (status) TABLESPACE pg_default;

-- ============================================================
-- 3) exercises
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  body_part text NOT NULL,
  difficulty text NULL DEFAULT 'beginner'::text,
  angle_config jsonb NOT NULL,
  instructions text NULL,
  thumbnail_url text NULL,
  CONSTRAINT exercises_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- ============================================================
-- 4) prescriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  exercise_id uuid NULL,
  game_type text NULL,
  target_reps integer NULL,
  target_sets integer NULL,
  frequency text NULL,
  priority text NOT NULL DEFAULT 'normal'::text,
  notes text NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prescriptions_pkey PRIMARY KEY (id),
  CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id)
    REFERENCES public.patients (id) ON DELETE CASCADE,
  CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id)
    REFERENCES public.staff (id) ON DELETE CASCADE,
  CONSTRAINT prescriptions_exercise_id_fkey FOREIGN KEY (exercise_id)
    REFERENCES public.exercises (id) ON DELETE SET NULL
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient
  ON public.prescriptions USING btree (patient_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor
  ON public.prescriptions USING btree (doctor_id) TABLESPACE pg_default;

-- ============================================================
-- 5) exercise_sessions
-- NOTE: Your DB includes prescription_id (nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercise_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  reps_completed integer NOT NULL,
  avg_angle double precision NULL,
  min_angle double precision NULL,
  max_angle double precision NULL,
  form_score double precision NULL,
  duration_seconds integer NULL,
  angle_history jsonb NULL,
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone NOT NULL,
  prescription_id uuid NULL,
  CONSTRAINT exercise_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT exercise_sessions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.patients (id) ON DELETE CASCADE,
  CONSTRAINT exercise_sessions_exercise_id_fkey FOREIGN KEY (exercise_id)
    REFERENCES public.exercises (id) ON DELETE CASCADE,
  CONSTRAINT exercise_sessions_prescription_id_fkey FOREIGN KEY (prescription_id)
    REFERENCES public.prescriptions (id) ON DELETE SET NULL
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user
  ON public.exercise_sessions USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_exercise
  ON public.exercise_sessions USING btree (exercise_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_completed_at
  ON public.exercise_sessions USING btree (completed_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_prescription
  ON public.exercise_sessions USING btree (prescription_id) TABLESPACE pg_default;

-- ============================================================
-- 6) game_sessions
-- (Remove duplicates; define once)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_type text NOT NULL,
  score integer NOT NULL,
  accuracy double precision NULL,
  avg_reaction_ms double precision NULL,
  level_reached integer NULL,
  duration_seconds integer NULL,
  game_metadata jsonb NULL,
  completed_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT game_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT game_sessions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_game_sessions_user
  ON public.game_sessions USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_game_sessions_completed_at
  ON public.game_sessions USING btree (completed_at DESC) TABLESPACE pg_default;

-- ============================================================
-- 6.1) cognitive_test_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cognitive_test_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_type text NOT NULL,
  score integer NOT NULL,
  response_time_ms integer NULL,
  accuracy double precision NULL,
  transcript text NULL,
  expected_response text NULL,
  word_count integer NULL,
  error_count integer NULL,
  duration_seconds integer NULL,
  test_metadata jsonb NULL,
  completed_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT cognitive_test_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT cognitive_test_sessions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cognitive_test_sessions_user
  ON public.cognitive_test_sessions USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cognitive_test_sessions_completed_at
  ON public.cognitive_test_sessions USING btree (completed_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cognitive_test_sessions_type
  ON public.cognitive_test_sessions USING btree (user_id, test_type) TABLESPACE pg_default;

-- ============================================================
-- 7) ai_feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  session_type text NOT NULL,
  summary text NULL,
  tips jsonb NULL,
  encouragement text NULL,
  focus_areas jsonb NULL,
  recovery_score integer NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT ai_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT ai_feedback_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_ai_feedback_session
  ON public.ai_feedback USING btree (session_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user
  ON public.ai_feedback USING btree (user_id) TABLESPACE pg_default;

-- ============================================================
-- 8) messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  sender_type text NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_patient_id_fkey FOREIGN KEY (patient_id)
    REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_messages_patient
  ON public.messages USING btree (patient_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_messages_created
  ON public.messages USING btree (created_at DESC) TABLESPACE pg_default;

-- ============================================================
-- 9) alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT alerts_pkey PRIMARY KEY (id),
  CONSTRAINT alerts_patient_id_fkey FOREIGN KEY (patient_id)
    REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- ============================================================
-- 10) reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  report_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_patient_id_fkey FOREIGN KEY (patient_id)
    REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reports_patient
  ON public.reports USING btree (patient_id, created_at DESC) TABLESPACE pg_default;

-- ============================================================
-- 11) ai_recommendations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  recommendation_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_recommendations_patient_id_fkey FOREIGN KEY (patient_id)
    REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_patient
  ON public.ai_recommendations USING btree (patient_id, created_at DESC) TABLESPACE pg_default;