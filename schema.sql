-- ============================================================
-- AI Rehabilitation System — Supabase PostgreSQL Schema
-- ============================================================
-- Canonical SQL source. Run this in Supabase SQL Editor to
-- create all tables, indexes, and seed data.
--
-- Tables: users, exercises, exercise_sessions, game_sessions, ai_feedback
-- See context/schema.md for field-level documentation.
-- See context/api_contract.md for API shapes that map to these tables.
-- ============================================================

-- extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  age int,
  condition_notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. exercises  (pre-populated via seed INSERTs below)
-- ============================================================
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

-- ============================================================
-- 3. exercise_sessions
-- ============================================================
CREATE TABLE exercise_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reps_completed int NOT NULL,
  avg_angle double precision,
  min_angle double precision,
  max_angle double precision,
  form_score double precision,
  duration_seconds int,
  angle_history jsonb,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL
);

-- ============================================================
-- 4. game_sessions
-- ============================================================
CREATE TABLE game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  score int NOT NULL,
  accuracy double precision,
  avg_reaction_ms double precision,
  level_reached int,
  duration_seconds int,
  game_metadata jsonb,
  completed_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. ai_feedback  (polymorphic FK — session_id points to
--    exercise_sessions.id OR game_sessions.id, disambiguated
--    by session_type)
-- ============================================================
CREATE TABLE ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  session_type text NOT NULL,
  summary text,
  tips jsonb,
  encouragement text,
  focus_areas jsonb,
  recovery_score int,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- indexes
-- ============================================================
CREATE INDEX idx_exercise_sessions_user ON exercise_sessions(user_id);
CREATE INDEX idx_exercise_sessions_exercise ON exercise_sessions(exercise_id);
CREATE INDEX idx_exercise_sessions_completed_at ON exercise_sessions(completed_at DESC);
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_completed_at ON game_sessions(completed_at DESC);
CREATE INDEX idx_ai_feedback_session ON ai_feedback(session_id);
CREATE INDEX idx_ai_feedback_user ON ai_feedback(user_id);

-- ============================================================
-- seed exercises  (8 exercises — must match backend/seed/exercises.json)
-- ============================================================
INSERT INTO exercises (id, name, description, body_part, difficulty, angle_config, instructions, thumbnail_url) VALUES
(
  'a1000001-0001-4000-8000-000000000001',
  'Shoulder Flexion',
  'Raise your arm forward and upward through comfortable range.',
  'shoulder',
  'beginner',
  '{"joint": "left_shoulder", "points": ["left_elbow", "left_shoulder", "left_hip"], "target_angle": 160, "threshold": 15}'::jsonb,
  'Stand tall. Keep elbow soft. Raise your arm forward to shoulder height or as directed, pause briefly, then lower with control. Repeat for prescribed reps.',
  '/images/exercises/shoulder-flexion.png'
),
(
  'a1000001-0001-4000-8000-000000000002',
  'Shoulder Abduction',
  'Raise the arm out to the side in the scapular plane.',
  'shoulder',
  'beginner',
  '{"joint": "right_shoulder", "points": ["right_elbow", "right_shoulder", "right_hip"], "target_angle": 150, "threshold": 15}'::jsonb,
  'Thumb slightly toward ceiling. Lift arm out to the side to comfortable height, pause, lower with control. Avoid shrugging the shoulder.',
  '/images/exercises/shoulder-abduction.png'
),
(
  'a1000001-0001-4000-8000-000000000003',
  'Elbow Flexion',
  'Bend and straighten the elbow for range and control.',
  'elbow',
  'beginner',
  '{"joint": "right_elbow", "points": ["right_wrist", "right_elbow", "right_shoulder"], "target_angle": 45, "threshold": 15}'::jsonb,
  'Start with arm at your side, palm forward. Bend the elbow to bring hand toward shoulder, then extend smoothly. Keep shoulder relaxed.',
  '/images/exercises/elbow-flexion.png'
),
(
  'a1000001-0001-4000-8000-000000000004',
  'Knee Extension',
  'Straighten the knee to build quadriceps control and range.',
  'knee',
  'beginner',
  '{"joint": "right_knee", "points": ["right_ankle", "right_knee", "right_hip"], "target_angle": 170, "threshold": 10}'::jsonb,
  'Sit upright on a chair. Slowly straighten your knee until your leg is extended. Hold for 2 seconds, then lower slowly.',
  '/images/exercises/knee-extension.png'
),
(
  'a1000001-0001-4000-8000-000000000005',
  'Knee Flexion',
  'Bend your knee as far as comfortable.',
  'knee',
  'intermediate',
  '{"joint": "right_knee", "points": ["right_ankle", "right_knee", "right_hip"], "target_angle": 90, "threshold": 15}'::jsonb,
  'Stand holding a support. Slowly bend your knee, bringing your heel toward your buttocks. Hold briefly, then lower slowly.',
  '/images/exercises/knee-flexion.png'
),
(
  'a1000001-0001-4000-8000-000000000006',
  'Hip Abduction',
  'Lift the leg sideways to strengthen hip stabilizers.',
  'hip',
  'intermediate',
  '{"joint": "right_hip", "points": ["right_knee", "right_hip", "left_hip"], "target_angle": 30, "threshold": 10}'::jsonb,
  'Stand holding support if needed. Keep toes forward. Lift the leg out to the side a few inches without leaning the trunk. Lower slowly.',
  '/images/exercises/hip-abduction.png'
),
(
  'a1000001-0001-4000-8000-000000000007',
  'Shoulder External Rotation',
  'Rotate your shoulder outward with elbow bent.',
  'shoulder',
  'intermediate',
  '{"joint": "right_shoulder", "points": ["right_wrist", "right_elbow", "right_shoulder"], "target_angle": 90, "threshold": 15}'::jsonb,
  'Hold your elbow at 90° at your side. Rotate your forearm outward, keeping your elbow tucked. Return slowly.',
  '/images/exercises/shoulder-external-rotation.png'
),
(
  'a1000001-0001-4000-8000-000000000008',
  'Straight Leg Raise',
  'Lift your straight leg from a lying position.',
  'hip',
  'beginner',
  '{"joint": "right_hip", "points": ["right_knee", "right_hip", "left_shoulder"], "target_angle": 45, "threshold": 10}'::jsonb,
  'Lie flat on your back. Keep one knee bent with foot flat. Tighten the thigh of the other leg and raise it to the height of the bent knee. Lower slowly.',
  '/images/exercises/straight-leg-raise.png'
);
