-- extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  age int,
  condition_notes text,
  created_at timestamptz DEFAULT now()
);

-- exercises
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

-- exercise_sessions
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

-- game_sessions
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

-- ai_feedback
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

-- indexes
CREATE INDEX idx_exercise_sessions_user ON exercise_sessions(user_id);
CREATE INDEX idx_exercise_sessions_exercise ON exercise_sessions(exercise_id);
CREATE INDEX idx_exercise_sessions_completed_at ON exercise_sessions(completed_at DESC);
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_completed_at ON game_sessions(completed_at DESC);
CREATE INDEX idx_ai_feedback_session ON ai_feedback(session_id);
CREATE INDEX idx_ai_feedback_user ON ai_feedback(user_id);

-- seed exercises
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
  'Knee Extension',
  'Straighten the knee to build quadriceps control and range.',
  'knee',
  'beginner',
  '{"joint": "right_knee", "points": ["right_hip", "right_knee", "right_ankle"], "target_angle": 175, "threshold": 12}'::jsonb,
  'Sit or lie with thigh supported. Tighten the front of the thigh and straighten the knee fully without locking into pain. Hold briefly, then relax.',
  '/images/exercises/knee-extension.png'
),
(
  'a1000001-0001-4000-8000-000000000003',
  'Elbow Flexion',
  'Bend and straighten the elbow for range and control.',
  'elbow',
  'intermediate',
  '{"joint": "left_elbow", "points": ["left_shoulder", "left_elbow", "left_wrist"], "target_angle": 145, "threshold": 10}'::jsonb,
  'Start with arm at your side, palm forward. Bend the elbow to bring hand toward shoulder, then extend smoothly. Keep shoulder relaxed.',
  '/images/exercises/elbow-flexion.png'
),
(
  'a1000001-0001-4000-8000-000000000004',
  'Hip Abduction',
  'Lift the leg sideways to strengthen hip stabilizers.',
  'hip',
  'beginner',
  '{"joint": "right_hip", "points": ["right_shoulder", "right_hip", "right_knee"], "target_angle": 35, "threshold": 8}'::jsonb,
  'Stand holding support if needed. Keep toes forward. Lift the leg out to the side a few inches without leaning the trunk. Lower slowly.',
  '/images/exercises/hip-abduction.png'
),
(
  'a1000001-0001-4000-8000-000000000005',
  'Shoulder Abduction',
  'Raise the arm out to the side in the scapular plane.',
  'shoulder',
  'intermediate',
  '{"joint": "right_shoulder", "points": ["right_elbow", "right_shoulder", "right_hip"], "target_angle": 150, "threshold": 15}'::jsonb,
  'Thumb slightly toward ceiling. Lift arm out to the side to comfortable height, pause, lower with control. Avoid shrugging the shoulder.',
  '/images/exercises/shoulder-abduction.png'
),
(
  'a1000001-0001-4000-8000-000000000006',
  'Seated Knee Flexion',
  'Bend the knee under the chair to improve flexion range.',
  'knee',
  'intermediate',
  '{"joint": "left_knee", "points": ["left_hip", "left_knee", "left_ankle"], "target_angle": 115, "threshold": 12}'::jsonb,
  'Sit with feet flat. Slide the heel back under the chair as far as comfortable, then return to start. Move slowly and stay within a pain-free arc.',
  '/images/exercises/seated-knee-flexion.png'
),
(
  'a1000001-0001-4000-8000-000000000007',
  'Overhead Reach',
  'Controlled overhead reach for shoulder endurance and range.',
  'shoulder',
  'advanced',
  '{"joint": "left_shoulder", "points": ["left_elbow", "left_shoulder", "left_hip"], "target_angle": 165, "threshold": 12}'::jsonb,
  'Start with arm at 90° forward. Reach overhead in a smooth arc. Stop if you feel pinch or sharp pain. Use a light weight only if prescribed.',
  '/images/exercises/overhead-reach.png'
);
